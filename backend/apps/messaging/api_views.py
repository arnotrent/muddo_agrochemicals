import logging
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Max, Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes, parser_classes, throttle_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, APIException

from apps.core.permissions import IsAdminOrAgent, IsAdmin, IsAgent
from apps.core.throttles import ChatSendThrottle
from apps.agents.models import Agent
from apps.messaging.models import Message, MessageAttachment, BroadcastRead
from apps.messaging.file_validation import validate_upload, MAX_FILES_PER_MESSAGE, INLINE_SAFE
from apps.messaging.serializers import (
    MessageSerializer, serialize_attachment, token_is_valid, attachment_url, display_name,
)

logger = logging.getLogger('django.request')

TYPE_GROUPS = {
    'images': ['image'], 'documents': ['document', 'presentation'],
    'spreadsheets': ['spreadsheet'], 'videos': ['video'], 'other': ['audio', 'archive'],
}


# ── identity / thread helpers ─────────────────────────────────────
def _id(user):
    if user.is_staff:
        return user.id, 'admin'
    try:
        return user.agent_profile.id, 'agent'
    except Exception:
        return user.id, 'agent'


def _bump(user):
    """Presence: stamp last_seen, but at most every 45 s (not on every 3-second poll)."""
    if user.is_staff:
        return
    try:
        a = user.agent_profile
        now = timezone.now()
        if not a.last_seen or (now - a.last_seen).total_seconds() > 45:
            a.last_seen = now
            a.save(update_fields=['last_seen'])
    except Exception:
        pass


def _sent_by(role, sid):
    # All administrators share ONE inbox: for the 'admin' side the account id is ignored, so a
    # message to / from any admin appears for every admin (and an agent sees every admin's replies).
    return Q(sender_role=role) if role == 'admin' else Q(sender_role=role, sender_id=sid)


def _sent_to(role, sid):
    return Q(receiver_role=role) if role == 'admin' else Q(receiver_role=role, receiver_id=sid)


def _thread_q(my_id, my_role, with_id, with_role):
    return Q(is_broadcast=False) & ((_sent_by(my_role, my_id) & _sent_to(with_role, with_id)) |
                                    (_sent_by(with_role, with_id) & _sent_to(my_role, my_id)))


def _incoming_q(my_id, my_role, with_id, with_role):
    return Q(is_broadcast=False) & _sent_by(with_role, with_id) & _sent_to(my_role, my_id)


def _visible_messages(user):
    """Staff: everything (elevated access). Agent: broadcasts + threads they are a party to."""
    if user.is_staff:
        return Message.objects.all()
    my_id, _ = _id(user)
    return Message.objects.filter(
        Q(is_broadcast=True) | Q(sender_id=my_id, sender_role='agent') | Q(receiver_id=my_id, receiver_role='agent'))


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
    GET /api/v1/messages/?with_id=3&with_role=agent&after=120&track=118,119
    -> { messages: [...new since `after`...], statuses: { "118": {status, read}, ... } }
    `track` = ids of MY messages the client still shows without the "read" tick; their fresh status is returned
    in the same request, so one poll does the work that used to take three.
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
        thread = Message.objects.filter(is_broadcast=True)
    elif with_role in ('admin', 'agent'):
        thread = Message.objects.filter(_thread_q(my_id, my_role, with_id, with_role))
    else:
        return Response({'detail': 'Invalid conversation.'}, status=400)

    qs = thread
    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(content__icontains=q) | Q(attachments__original_name__icontains=q)).distinct()
    qs = qs.select_related('reply_to').prefetch_related('attachments')

    msgs = list(qs.filter(id__gt=after).order_by('id')[:150]) if after else list(qs.order_by('-id')[:100])[::-1]

    # delivery receipts for everything addressed to me that I have now fetched
    ids = [m.id for m in msgs if not m.is_broadcast and not m.delivered_at and m.receiver_role == my_role
           and (my_role == 'admin' or m.receiver_id == my_id)]
    if ids:
        Message.objects.filter(pk__in=ids).update(delivered_at=timezone.now())

    statuses = {}
    if with_role != 'broadcast':
        track = [int(x) for x in (request.GET.get('track') or '').split(',') if x.strip().isdigit()][:60]
        if track:
            for m in thread.filter(pk__in=track):
                statuses[str(m.id)] = {'status': m.status, 'read': m.read}

    return Response({'messages': MessageSerializer(msgs, many=True, context={'request': request}).data,
                     'statuses': statuses})


def _validate_recipient(my_id, my_role, to_id, to_role):
    try:
        to_id = int(to_id)
    except (TypeError, ValueError):
        raise ValidationError({'detail': 'Missing or invalid recipient.'})
    if to_role == 'admin':
        ok = my_role == 'agent' and User.objects.filter(pk=to_id, is_staff=True).exists()
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
    try:
        return _send_message(request)
    except (APIException, Http404):
        raise
    except Exception:
        logger.exception('Chat send failed (user=%s)', getattr(request.user, 'pk', None))
        return Response(
            {'detail': 'The server could not save your message (code chat_send_failed). '
                       'Please try again; if it keeps happening, tell the administrator.',
             'code': 'chat_send_failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _send_message(request):
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

    metas = [validate_upload(f) for f in files]

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
                                       receiver_role='agent', content=content, is_broadcast=True, reply_to=reply_to)
        else:
            to_role = data.get('to_role', 'agent')
            to_id = _validate_recipient(my_id, my_role, data.get('to_id'), to_role)
            m = Message.objects.create(sender_id=my_id, sender_role=my_role, receiver_id=to_id,
                                       receiver_role=to_role, content=content, reply_to=reply_to)
        for f, meta in zip(files, metas):
            att = MessageAttachment(message=m, uploaded_by_id=my_id, uploaded_by_role=my_role,
                                    extension=meta['extension'], mime_type=meta['mime_type'],
                                    category=meta['category'], size=meta['size'], original_name=meta['original_name'])
            att.file.save(f'{meta["original_name"]}', f, save=False)
            att.save()

    m = Message.objects.prefetch_related('attachments').select_related('reply_to').get(pk=m.pk)
    return Response({'message': MessageSerializer(m, context={'request': request}).data}, status=status.HTTP_201_CREATED)


def _unseen_broadcasts(my_id, my_role):
    seen = BroadcastRead.objects.filter(reader_id=my_id, reader_role=my_role).values('message_id')
    return Message.objects.filter(is_broadcast=True).exclude(_sent_by(my_role, my_id)).exclude(pk__in=seen)


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def messages_unread_view(request):
    my_id, my_role = _id(request.user)
    dms = Message.objects.filter(is_broadcast=False, read=False).filter(_sent_to(my_role, my_id))
    per = {f'{sid}_{role}': c for sid, role, c in dms.order_by().values_list('sender_id', 'sender_role').annotate(c=Count('id'))}
    bc = _unseen_broadcasts(my_id, my_role).count()
    if bc:
        per['0_broadcast'] = bc
    return Response({'total': sum(per.values()), 'per_contact': per})


@api_view(['POST'])
@permission_classes([IsAdminOrAgent])
def messages_mark_read_view(request):
    my_id, my_role = _id(request.user)
    from_role = request.data.get('from_role')
    now = timezone.now()
    if from_role == 'broadcast':
        ids = list(_unseen_broadcasts(my_id, my_role).values_list('id', flat=True)[:500])
        if ids:
            BroadcastRead.objects.bulk_create(
                [BroadcastRead(message_id=i, reader_id=my_id, reader_role=my_role) for i in ids], ignore_conflicts=True)
    elif from_role in ('admin', 'agent'):
        try:
            from_id = int(request.data.get('from_id') or 0)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid conversation.'}, status=400)
        Message.objects.filter(_incoming_q(my_id, my_role, from_id, from_role), read=False).update(
            read=True, read_at=now, delivered_at=now)
    return Response({'ok': True})


# ── attachments ───────────────────────────────────────────────────
def _attachment_for(user, uid):
    att = MessageAttachment.objects.select_related('message').filter(uid=uid).first()
    if not att:
        raise Http404
    if not user.is_staff and not _can_see_message(user, att.message_id):
        raise Http404
    return att


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def attachment_download_view(request, uid):
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
    att = _attachment_for(request.user, uid)
    return Response(serialize_attachment(att, request))


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def shared_files_view(request):
    my_id, my_role = _id(request.user)
    qs = MessageAttachment.objects.select_related('message').filter(message__in=_visible_messages(request.user))

    with_role = request.GET.get('with_role')
    if with_role == 'broadcast':
        qs = qs.filter(message__is_broadcast=True)
    elif with_role in ('admin', 'agent'):
        try:
            with_id = int(request.GET.get('with_id', 0))
        except ValueError:
            return Response({'detail': 'Invalid conversation.'}, status=400)
        qs = qs.filter(message__in=Message.objects.filter(_thread_q(my_id, my_role, with_id, with_role)))

    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(original_name__icontains=q) | Q(extension__iexact=q.lstrip('.')))
    t = request.GET.get('type')
    if t in TYPE_GROUPS:
        qs = qs.filter(category__in=TYPE_GROUPS[t])
    qs = qs.order_by({'date_asc': 'uploaded_at', 'name': 'original_name', 'size': '-size'}
                     .get(request.GET.get('sort'), '-uploaded_at'))[:300]
    return Response({'files': [serialize_attachment(a, request) for a in qs]})


# ── contacts (aggregated: a handful of queries no matter how many messages exist) ──
def _last_and_unread(out_qs, in_qs, out_key, in_key):
    """
    out_qs: messages I sent, grouped by `out_key` (the other person's id);
    in_qs : messages I received, grouped by `in_key`.  Returns (last_message_id_by_person, unread_by_person).
    """
    last = {}
    for pid, mid in out_qs.order_by().values_list(out_key).annotate(m=Max('id')):
        last[pid] = max(last.get(pid, 0), mid)
    for pid, mid in in_qs.order_by().values_list(in_key).annotate(m=Max('id')):
        last[pid] = max(last.get(pid, 0), mid)
    unread = dict(in_qs.filter(read=False).order_by().values_list(in_key).annotate(c=Count('id')))
    return last, unread


def _messages_by_id(ids):
    return {m.id: m for m in Message.objects.filter(pk__in=ids).prefetch_related('attachments')}


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_chat_contacts_view(request):
    agents = list(Agent.objects.filter(status='active').select_related('user'))
    dm = Message.objects.filter(is_broadcast=False)
    last, unread = _last_and_unread(
        dm.filter(sender_role='admin', receiver_role='agent'),
        dm.filter(sender_role='agent', receiver_role='admin'), 'receiver_id', 'sender_id')
    by_id = _messages_by_id(set(last.values()))

    contacts = []
    for a in agents:
        m = by_id.get(last.get(a.id))
        contacts.append({
            'id': a.id, 'role': 'agent', 'name': a.name, 'avatar_url': a.avatar_url,
            'region': a.region, 'district': a.district, 'username': a.username, 'email': a.email,
            'phone': a.phone, 'is_online': a.is_online,
            'last_seen': a.last_seen.isoformat() if a.last_seen else None,
            'joined': a.created_at.isoformat() if a.created_at else None,
            'last_message_preview': _preview_for(m),
            'last_message_time': m.created_at.isoformat() if m else None,
            'last_message_mine': bool(m and m.sender_role == 'admin'),
            'unread_from': unread.get(a.id, 0),
        })
    # unread first, then most recent conversation first
    contacts.sort(key=lambda c: (c['unread_from'] == 0, -(last.get(c['id'], 0)), c['name'].lower()))

    last_team = Message.objects.filter(is_broadcast=True).order_by('-id').first()
    return Response({
        'contacts': contacts,
        'last_team_preview': _preview_for(last_team),
        'last_team_time': last_team.created_at.isoformat() if last_team else None,
        'team_unread': _unseen_broadcasts(*_id(request.user)).count(),
    })


@api_view(['GET'])
@permission_classes([IsAgent])
def agent_chat_contacts_view(request):
    agent = request.user.agent_profile
    admin_u = User.objects.filter(is_staff=True).order_by('id').first()
    dm = Message.objects.filter(is_broadcast=False)

    # admin thread (all admins share one inbox)
    a_last = dm.filter(_thread_q(agent.id, 'agent', 0, 'admin')).order_by('-id').first()
    a_unread = dm.filter(sender_role='admin', receiver_role='agent', receiver_id=agent.id, read=False).count()

    # agent <-> agent threads
    other_agents = list(Agent.objects.filter(status='active').exclude(pk=agent.pk).select_related('user'))
    last, unread = _last_and_unread(
        dm.filter(sender_role='agent', receiver_role='agent', sender_id=agent.id),
        dm.filter(sender_role='agent', receiver_role='agent', receiver_id=agent.id), 'receiver_id', 'sender_id')
    by_id = _messages_by_id(set(last.values()))

    agent_contacts = []
    for a in other_agents:
        m = by_id.get(last.get(a.id))
        agent_contacts.append({
            'id': a.id, 'role': 'agent', 'name': a.name, 'avatar_url': a.avatar_url, 'region': a.region,
            'is_online': a.is_online, 'last_seen': a.last_seen.isoformat() if a.last_seen else None,
            'joined': a.created_at.isoformat() if a.created_at else None,
            'last_message_preview': _preview_for(m),
            'last_message_time': m.created_at.isoformat() if m else None,
            'last_message_mine': bool(m and m.sender_id == agent.id),
            'unread_from': unread.get(a.id, 0),
        })
    agent_contacts.sort(key=lambda c: (c['unread_from'] == 0, -(last.get(c['id'], 0)), c['name'].lower()))

    last_team = Message.objects.filter(is_broadcast=True).order_by('-id').first()
    return Response({
        'admin': {'id': admin_u.id if admin_u else 1, 'name': 'Muddo Agro Admin',
                  'last_message_preview': _preview_for(a_last),
                  'last_message_time': a_last.created_at.isoformat() if a_last else None,
                  'last_message_mine': bool(a_last and a_last.sender_role == 'agent'),
                  'unread_from': a_unread},
        'other_agents': agent_contacts,
        'last_team_preview': _preview_for(last_team),
        'last_team_time': last_team.created_at.isoformat() if last_team else None,
        'team_unread': _unseen_broadcasts(agent.id, 'agent').count(),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def chat_diagnostics_view(request):
    from apps.messaging.diagnostics import run_checks
    checks = run_checks()
    return Response({'ok': all(c['ok'] or c.get('level') == 'warn' for c in checks), 'checks': checks})
