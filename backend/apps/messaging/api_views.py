from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrAgent, IsAdmin, IsAgent
from apps.agents.models import Agent
from apps.messaging.models import Message
from apps.messaging.serializers import MessageSerializer


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


def _preview_for(msg):
    if not msg:
        return ''
    if msg.content:
        return msg.content[:44] + ('\u2026' if len(msg.content) > 44 else '')
    return '\U0001F4CE Attachment' if msg.attachment else ''


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def messages_list_view(request):
    """
    GET /api/v1/messages/?with_role=broadcast
    GET /api/v1/messages/?with_id=3&with_role=agent&after=120
    """
    _bump(request.user)
    with_role = request.GET.get('with_role', 'agent')
    after = int(request.GET.get('after', 0) or 0)
    my_id, my_role = _id(request.user)

    if with_role == 'broadcast':
        msgs = Message.objects.filter(is_broadcast=True, id__gt=after).order_by('id')[:150]
    else:
        with_id = int(request.GET.get('with_id', 0) or 0)
        msgs = (Message.objects.filter(id__gt=after, sender_id=my_id, sender_role=my_role,
                                        receiver_id=with_id, receiver_role=with_role, is_broadcast=False) |
                Message.objects.filter(id__gt=after, sender_id=with_id, sender_role=with_role,
                                        receiver_id=my_id, receiver_role=my_role, is_broadcast=False)
                ).order_by('id')[:100]

    return Response({'messages': MessageSerializer(msgs, many=True, context={'request': request}).data})


@api_view(['POST'])
@permission_classes([IsAdminOrAgent])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def messages_send_view(request):
    _bump(request.user)
    my_id, my_role = _id(request.user)
    data = request.data

    content = (data.get('content') or '').strip()
    attachment = request.FILES.get('attachment')
    if not content and not attachment:
        return Response({'detail': 'A message needs text or an attachment.'}, status=status.HTTP_400_BAD_REQUEST)

    reply_to = None
    reply_to_id = data.get('reply_to')
    if reply_to_id:
        reply_to = Message.objects.filter(pk=reply_to_id).first()

    is_broadcast = str(data.get('broadcast', '')).lower() in ('true', '1', 'on')

    if is_broadcast:
        m = Message.objects.create(sender_id=my_id, sender_role=my_role, receiver_id=0,
                                    receiver_role='agent', content=content, is_broadcast=True,
                                    reply_to=reply_to, attachment=attachment)
    else:
        to_id = data.get('to_id')
        to_role = data.get('to_role', 'agent')
        if to_id is None:
            return Response({'detail': 'Missing recipient.'}, status=status.HTTP_400_BAD_REQUEST)
        m = Message.objects.create(sender_id=my_id, sender_role=my_role, receiver_id=to_id,
                                    receiver_role=to_role, content=content, reply_to=reply_to,
                                    attachment=attachment)

    return Response({'message': MessageSerializer(m, context={'request': request}).data}, status=status.HTTP_201_CREATED)


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
    if from_role == 'broadcast':
        Message.objects.filter(is_broadcast=True, read=False).exclude(sender_id=my_id, sender_role=my_role).update(read=True)
    else:
        Message.objects.filter(sender_id=from_id, sender_role=from_role, receiver_id=my_id,
                                receiver_role=my_role, is_broadcast=False).update(read=True)
    return Response({'ok': True})


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
        Q(sender_role='agent') | Q(receiver_role='agent')).order_by('-id')
    for m in dm_msgs:
        aid = m.sender_id if m.sender_role == 'agent' else m.receiver_id
        if aid not in last_by_agent:
            last_by_agent[aid] = m

    contacts = []
    for a in agents:
        m = last_by_agent.get(a.id)
        contacts.append({
            'id': a.id, 'role': 'agent', 'name': a.name, 'avatar_url': a.avatar_url,
            'region': a.region, 'is_online': a.is_online,
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
    from django.contrib.auth.models import User
    agent = request.user.agent_profile
    admin_u = User.objects.filter(is_staff=True).first()

    def thread_summary(other_id, other_role):
        last = (Message.objects.filter(is_broadcast=False, sender_id=agent.id, sender_role='agent',
                                        receiver_id=other_id, receiver_role=other_role) |
                Message.objects.filter(is_broadcast=False, sender_id=other_id, sender_role=other_role,
                                        receiver_id=agent.id, receiver_role='agent')).order_by('-id').first()
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
            'is_online': a.is_online, 'last_message_preview': _preview_for(last),
            'last_message_time': last.created_at.isoformat() if last else None,
            'last_message_mine': bool(last and last.sender_id == agent.id and last.sender_role == 'agent'),
            'unread_from': unread,
        })
    agent_contacts.sort(key=lambda c: (c['unread_from'] == 0, -(c['id'])))

    last_team = Message.objects.filter(is_broadcast=True).order_by('-id').first()
    return Response({
        'admin': {'id': admin_u.id if admin_u else 1, 'last_message_preview': _preview_for(admin_last),
                   'last_message_time': admin_last.created_at.isoformat() if admin_last else None,
                   'last_message_mine': bool(admin_last and admin_last.sender_role == 'agent'),
                   'unread_from': admin_unread},
        'other_agents': agent_contacts,
        'last_team_preview': _preview_for(last_team),
        'last_team_time': last_team.created_at.isoformat() if last_team else None,
    })
