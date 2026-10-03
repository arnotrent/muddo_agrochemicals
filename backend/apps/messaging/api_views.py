from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes, parser_classes, throttle_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from apps.core.permissions import IsAdminOrAgent, IsAdmin, IsAgent
from apps.core.throttles import ChatSendThrottle
from apps.agents.models import Agent
from apps.messaging.models import Message, MessageAttachment
from apps.messaging.file_validation import (
    validate_upload, MAX_FILES_PER_MESSAGE, INLINE_SAFE,
)
from apps.messaging.serializers import (
    MessageSerializer, serialize_attachment, token_is_valid, attachment_url, display_name,
)

TYPE_GROUPS = {
    'images': ['image'], 'documents': ['document', 'presentation'],
    'spreadsheets': ['spreadsheet'], 'videos': ['video'], 'other': ['audio', 'archive'],
}


# ── identity / authorization helpers ──────────────────────────────
def _id(user):
    if user.is_staff:
        return user.id, 'admin'
    try:
        return user.agent_profile.id, 'agent'
    except Exception:
        return user.id, 'agent'


def _bump(user):
    if not user.is_staff:
        try:
            user.agent_profile.last_seen = timezone.now()
            user.agent_profile.save(update_fields=['last_seen'])
        except Exception:
            pass


def _visible_messages(user):
    """Messages this account is allowed to see. Staff: everything (elevated access).
    Agent: broadcasts + threads they are a party to — never other agents' private DMs."""
    if user.is_staff:
        return Message.objects.all()
    my_id, _ = _id(user)
    return Message.objects.filter(
        Q(is_broadcast=True) |
        Q(sender_id=my_id, sender_role='agent') |
        Q(receiver_id=my_id, receiver_role='agent'))


def _can_see_message(user, msg_id):
    return _visible_messages(user).filter(pk=msg_id).exists()


def _preview_for(msg):
    if not msg:
        return ''
    n = msg.attachments.count() + (1 if msg.attachment else 0)
    if msg.content:
        return msg.content[:44] + ('\u2026' if len(msg.content) > 44 else '')
    if n:
        return '\U0001F4CE ' + (f'{n} attachments' if n > 1 else 'Attachment')
    return ''


# ── messages ──────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def messages_list_view(request):
    """
    GET /api/v1/messages/?with_role=broadcast
    GET /api/v1/messages/?with_id=3&with_role=agent&after=120[&q=search]
    First load (after=0) returns the NEWEST 100 messages in order (the old code returned
    the oldest 100, so long conversations opened at the wrong end).
    """
    _bump(request.user)
    with_role = request.GET.get('with_role', 'agent')
    try:
        after = int(request.GET.get('after', 0) or 0)
        with_id = int(request.GET.get('with_id', 0) or 0)
    except ValueError:
        return Response({'detail': 'Invalid parameters.'}, status=400)
    my_id, my_role = _id(request.user)

    if with_role == 'broadcast':
        qs = Message.objects.filter(is_broadcast=True)
    elif with_role in ('admin', 'agent'):
        qs = Message.objects.filter(is_broadcast=False).filter(
            Q(sender_id=my_id, sender_role=my_role, receiver_id=with_id, receiver_role=with_role) |
            Q(sender_id=with_id, sender_role=with_role, receiver_id=my_id, receiver_role=my_role))
    else:
        return Response({'detail': 'Invalid conversation.'}, status=400)

    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(content__icontains=q) | Q(attachments__original_name__icontains=q)).distinct()
    qs = qs.select_related('reply_to').prefetch_related('attachments')

    if after:
        msgs = list(qs.filter(id__gt=after).order_by('id')[:150])
    else:
        msgs = list(qs.order_by('-id')[:100])[::-1]

    # delivery receipts: everything addressed to me that I've now fetched counts as delivered
    ids = [m.id for m in msgs if not m.is_broadcast and m.receiver_id == my_id
           and m.receiver_role == my_role and not m.delivered_at]
    if ids:
        Message.objects.filter(pk__in=ids).update(delivered_at=timezone.now())

    return Response({'messages': MessageSerializer(msgs, many=True, context={'request': request}).data})


def _validate_recipient(my_id, my_role, to_id, to_role):
    try:
        to_id = int(to_id)
    except (TypeError, ValueError):
        raise ValidationError({'detail': 'Missing or invalid recipient.'})
    if to_role == 'admin':
        ok = User.objects.filter(pk=to_id, is_staff=True).exists()
    elif to_role == 'agent':
        ok = Agent.objects.filter(pk=to_id, status='active').exists() and not (my_role == 'agent' and to_id == my_id)
    else:
        ok = False
    if not ok:
        raise ValidationError({'detail': 'That recipient does not exist or is unavailable.'})
    return to_id


@api_view(['POST'])
@permission_classes([IsAdminOrAgent])
@throttle_classes([ChatSendThrottle])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def messages_send_view(request):
    """POST multipart or JSON. Files: field `attachments` (repeatable, up to 10)."""
    _bump(request.user)
    my_id, my_role = _id(request.user)
    data = request.data

    content = (data.get('content') or '').strip()
    if len(content) > 5000:
        return Response({'detail': 'Message is too long (max 5000 characters).'}, status=400)
    files = list(request.FILES.getlist('attachments'))
    legacy = request.FILES.get('attachment')
    if legacy:
        files.append(legacy)
    if not content and not files:
        return Response({'detail': 'A message needs text or an attachment.'}, status=400)
    if len(files) > MAX_FILES_PER_MESSAGE:
        return Response({'detail': f'You can attach at most {MAX_FILES_PER_MESSAGE} files per message.'}, status=400)

    metas = [validate_upload(f) for f in files]  # raises before anything is stored

    reply_to = None
    reply_to_id = data.get('reply_to')
    if reply_to_id:
        try:
            if _can_see_message(request.user, int(reply_to_id)):
                reply_to = Message.objects.filter(pk=int(reply_to_id)).first()
        except (TypeError, ValueError):
            pass

    is_broadcast = str(data.get('broadcast', '')).lower() in ('true', '1', 'on')

    with transaction.atomic():
        if is_broadcast:
            m = Message.objects.create(sender_id=my_id, sender_role=my_role, receiver_id=0,
                                       receiver_role='agent', content=content, is_broadcast=True,
                                       reply_to=reply_to)
        else:
            to_role = data.get('to_role', 'agent')
            to_id = _validate_recipient(my_id, my_role, data.get('to_id'), to_role)
            m = Message.objects.create(sender_id=my_id, sender_role=my_role, receiver_id=to_id,
                                       receiver_role=to_role, content=content, reply_to=reply_to)
        for f, meta in zip(files, metas):
            att = MessageAttachment(message=m, uploaded_by_id=my_id, uploaded_by_role=my_role,
                                    extension=meta['extension'], mime_type=meta['mime_type'],
                                    category=meta['category'], size=meta['size'],
                                    original_name=meta['original_name'])
            att.file.save(f'{meta["original_name"]}', f, save=False)
            att.save()

    m = Message.objects.prefetch_related('attachments').select_related('reply_to').get(pk=m.pk)
    return Response({'message': MessageSerializer(m, context={'request': request}).data},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def messages_unread_view(request):
    my_id, my_role = _id(request.user)
    msgs = Message.objects.filter(receiver_id=my_id, receiver_role=my_role, read=False, is_broadcast=False)
    per = {}
    for m in msgs:
        k = f'{m.sender_id}_{m.sender_role}'
        per[k] = per.get(k, 0) + 1
    total = msgs.count()
    bcast_unread = Message.objects.filter(is_broadcast=True, read=False).exclude(sender_id=my_id, sender_role=my_role).count()
    if bcast_unread:
        per['0_broadcast'] = bcast_unread
        total += bcast_unread
    return Response({'total': total, 'per_contact': per})


@api_view(['POST'])
@permission_classes([IsAdminOrAgent])
def messages_mark_read_view(request):
    my_id, my_role = _id(request.user)
    from_id = request.data.get('from_id')
    from_role = request.data.get('from_role')
    now = timezone.now()
    if from_role == 'broadcast':
        Message.objects.filter(is_broadcast=True, read=False).exclude(
            sender_id=my_id, sender_role=my_role).update(read=True, read_at=now)
    else:
        Message.objects.filter(sender_id=from_id, sender_role=from_role, receiver_id=my_id,
                               receiver_role=my_role, is_broadcast=False, read=False).update(
            read=True, read_at=now, delivered_at=now)
    return Response({'ok': True})


# ── attachments: secure download, link refresh, shared files ──────
def _attachment_for(user, uid):
    att = MessageAttachment.objects.select_related('message').filter(uid=uid).first()
    if not att:
        raise Http404
    if not user.is_staff and not _can_see_message(user, att.message_id):
        raise Http404  # 404, not 403 — don't confirm the file exists
    return att


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def attachment_download_view(request, uid):
    """
    GET /api/v1/messages/attachments/<uuid>/download/?t=<signed>[&dl=1]
    The signed token is minted only for accounts allowed to see the message (see
    MessageSerializer), expires after an hour, and is bound to this exact file.
    Serves the ORIGINAL bytes with the validated MIME type — never converted.
    """
    if not token_is_valid(uid, request.GET.get('t', '')):
        raise Http404
    att = MessageAttachment.objects.filter(uid=uid).first()
    if not att:
        raise Http404
    try:
        fh = att.file.open('rb')
    except Exception:
        raise Http404
    inline = (att.category in INLINE_SAFE or att.extension == 'pdf') and request.GET.get('dl') != '1'
    resp = FileResponse(fh, content_type=att.mime_type, as_attachment=not inline, filename=att.original_name)
    resp['X-Content-Type-Options'] = 'nosniff'
    resp['Cache-Control'] = 'private, max-age=3600'
    resp['Content-Length'] = str(att.size)
    return resp


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def attachment_link_view(request, uid):
    """GET /api/v1/messages/attachments/<uuid>/link/ — fresh signed link (used when a cached one expired)."""
    att = _attachment_for(request.user, uid)
    return Response(serialize_attachment(att, request))


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def shared_files_view(request):
    """
    GET /api/v1/messages/files/?with_id=&with_role=&q=&type=images|documents|spreadsheets|videos|other
                              &sort=date_desc|date_asc|name|size
    Without with_id/with_role it searches every conversation the user may access.
    """
    my_id, my_role = _id(request.user)
    qs = MessageAttachment.objects.select_related('message').filter(
        message__in=_visible_messages(request.user))

    with_role = request.GET.get('with_role')
    if with_role == 'broadcast':
        qs = qs.filter(message__is_broadcast=True)
    elif with_role in ('admin', 'agent'):
        try:
            with_id = int(request.GET.get('with_id', 0))
        except ValueError:
            return Response({'detail': 'Invalid conversation.'}, status=400)
        qs = qs.filter(message__is_broadcast=False).filter(
            Q(message__sender_id=my_id, message__sender_role=my_role,
              message__receiver_id=with_id, message__receiver_role=with_role) |
            Q(message__sender_id=with_id, message__sender_role=with_role,
              message__receiver_id=my_id, message__receiver_role=my_role))

    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(original_name__icontains=q) | Q(extension__iexact=q.lstrip('.')))
    t = request.GET.get('type')
    if t in TYPE_GROUPS:
        qs = qs.filter(category__in=TYPE_GROUPS[t])
    qs = qs.order_by({'date_asc': 'uploaded_at', 'name': 'original_name', 'size': '-size'}
                     .get(request.GET.get('sort'), '-uploaded_at'))[:300]
    return Response({'files': [serialize_attachment(a, request) for a in qs]})


# ── contacts ──────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_chat_contacts_view(request):
    """GET /api/v1/admin/chat/contacts/ — sidebar list for the admin chat screen."""
    agents = list(Agent.objects.filter(status='active').select_related('user'))
    unread_map = {}
    for m in Message.objects.filter(receiver_role='admin', read=False, is_broadcast=False):
        k = str(m.sender_id)
        unread_map[k] = unread_map.get(k, 0) + 1

    last_by_agent = {}
    dm_msgs = Message.objects.filter(is_broadcast=False).filter(
        Q(sender_role='agent') | Q(receiver_role='agent')).prefetch_related('attachments').order_by('-id')
    for m in dm_msgs:
        aid = m.sender_id if m.sender_role == 'agent' else m.receiver_id
        if aid not in last_by_agent:
            last_by_agent[aid] = m

    contacts = []
    for a in agents:
        m = last_by_agent.get(a.id)
        contacts.append({
            'id': a.id, 'role': 'agent', 'name': a.name, 'avatar_url': a.avatar_url,
            'region': a.region, 'district': a.district, 'username': a.username, 'email': a.email,
            'phone': a.phone, 'is_online': a.is_online,
            'last_seen': a.last_seen.isoformat() if a.last_seen else None,
            'joined': a.created_at.isoformat() if a.created_at else None,
            'last_message_preview': _preview_for(m),
            'last_message_time': m.created_at.isoformat() if m else None,
            'last_message_mine': bool(m and m.sender_role == 'admin'),
            'unread_from': unread_map.get(str(a.id), 0),
        })
    contacts.sort(key=lambda c: (c['unread_from'] == 0, -(c['id'])))

    last_team = Message.objects.filter(is_broadcast=True).order_by('-id').first()
    return Response({
        'contacts': contacts,
        'last_team_preview': _preview_for(last_team),
        'last_team_time': last_team.created_at.isoformat() if last_team else None,
    })


@api_view(['GET'])
@permission_classes([IsAgent])
def agent_chat_contacts_view(request):
    """GET /api/v1/agent/chat/contacts/ — sidebar list for the agent chat screen (admin + other agents)."""
    agent = request.user.agent_profile
    admin_u = User.objects.filter(is_staff=True).order_by('id').first()

    def thread_summary(other_id, other_role):
        last = Message.objects.filter(is_broadcast=False).filter(
            Q(sender_id=agent.id, sender_role='agent', receiver_id=other_id, receiver_role=other_role) |
            Q(sender_id=other_id, sender_role=other_role, receiver_id=agent.id, receiver_role='agent')
        ).order_by('-id').first()
        unread = Message.objects.filter(is_broadcast=False, sender_id=other_id, sender_role=other_role,
                                        receiver_id=agent.id, receiver_role='agent', read=False).count()
        return last, unread

    admin_last, admin_unread = (None, 0)
    if admin_u:
        admin_last, admin_unread = thread_summary(admin_u.id, 'admin')

    other_agents = list(Agent.objects.filter(status='active').exclude(pk=agent.pk).select_related('user'))
    agent_contacts = []
    for a in other_agents:
        last, unread = thread_summary(a.id, 'agent')
        agent_contacts.append({
            'id': a.id, 'role': 'agent', 'name': a.name, 'avatar_url': a.avatar_url, 'region': a.region,
            'is_online': a.is_online, 'last_seen': a.last_seen.isoformat() if a.last_seen else None,
            'joined': a.created_at.isoformat() if a.created_at else None,
            'last_message_preview': _preview_for(last),
            'last_message_time': last.created_at.isoformat() if last else None,
            'last_message_mine': bool(last and last.sender_id == agent.id and last.sender_role == 'agent'),
            'unread_from': unread,
        })
    agent_contacts.sort(key=lambda c: (c['unread_from'] == 0, -(c['id'])))

    last_team = Message.objects.filter(is_broadcast=True).order_by('-id').first()
    return Response({
        'admin': {'id': admin_u.id if admin_u else 1, 'name': 'Muddo Agro Admin',
                  'last_message_preview': _preview_for(admin_last),
                  'last_message_time': admin_last.created_at.isoformat() if admin_last else None,
                  'last_message_mine': bool(admin_last and admin_last.sender_role == 'agent'),
                  'unread_from': admin_unread},
        'other_agents': agent_contacts,
        'last_team_preview': _preview_for(last_team),
        'last_team_time': last_team.created_at.isoformat() if last_team else None,
    })
