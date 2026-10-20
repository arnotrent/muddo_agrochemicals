"""
Answering customer enquiries.

 Admin : list / open / change status / REPLY by e-mail / FORWARD to a field agent (or take it back).
 Agent : sees only the enquiries forwarded to them; REPLIES to the customer by e-mail; can mark it resolved.

E-mail honesty: a reply is always saved in the history, but `emailed` says whether the mail server accepted it.
If it did not (no SMTP password set, wrong password …) the screen tells the staff member to call / WhatsApp instead.
"""
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMessage, send_mail
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.agents.models import Agent
from apps.core.enquiry_serializers import EnquirySerializer
from apps.core.models import ContactRequest, EnquiryReply
from apps.core.notify import company_recipients, DEFAULT_PHONES
from apps.core.permissions import IsAdmin, IsAgent

logger = logging.getLogger('django.request')


def _qs():
    return ContactRequest.objects.select_related('assigned_agent__user').prefetch_related('replies').order_by('-created_at')


def _email_customer(enq, body, author_name, reply_to):
    """Returns True when the mail server accepted the message."""
    first = (enq.name or 'there').split(' ')[0]
    link = f"{settings.FRONTEND_URL.rstrip('/')}/track?ref={enq.ref_number}"
    text = (f"Dear {first},\n\n{body.strip()}\n\nKind regards,\n{author_name}\nMuddo Agro Chemicals LTD\n{DEFAULT_PHONES}\n\n"
            f"Your reference: {enq.ref_number}  (track it: {link})\n\n— Your original message —\n{enq.message}")
    try:
        EmailMessage(f'Re: {enq.subject} [{enq.ref_number}]', text, settings.DEFAULT_FROM_EMAIL, [enq.email],
                     bcc=company_recipients(), reply_to=reply_to).send(fail_silently=False)
        return True
    except Exception:
        logger.exception('Reply e-mail for %s failed', enq.ref_number)
        return False


def _first_admin():
    return User.objects.filter(is_staff=True).order_by('id').first()


def _do_reply(request, enq, role, author_name, reply_to):
    body = (request.data.get('message') or '').strip()
    if len(body) < 2:
        return Response({'detail': 'Write your reply first.'}, status=400)
    if len(body) > 5000:
        return Response({'detail': 'The reply is too long (max 5000 characters).'}, status=400)
    sent = _email_customer(enq, body, author_name, reply_to)
    EnquiryReply.objects.create(enquiry=enq, author_role=role, author_name=author_name, kind='reply', message=body, emailed=sent)
    resolve = str(request.data.get('resolve', '')).lower() in ('true', '1', 'on')
    enq.status = 'resolved' if resolve else ('pending' if enq.status == 'new' else enq.status)
    enq.save(update_fields=['status'])
    enq = _qs().get(pk=enq.pk)
    return Response({'enquiry': EnquirySerializer(enq).data, 'emailed': sent,
                     'detail': 'Reply e-mailed to the customer.' if sent else
                               'Reply saved, but the e-mail could not be sent — please call or WhatsApp the customer.'})


# ── admin ─────────────────────────────────────────────────────────
class AdminEnquiryList(generics.ListAPIView):
    queryset = _qs()
    serializer_class = EnquirySerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'assigned_agent']
    search_fields = ['name', 'email', 'subject', 'ref_number', 'message']


class AdminEnquiryDetail(generics.RetrieveUpdateAPIView):
    queryset = _qs()
    serializer_class = EnquirySerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'patch']


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_enquiry_reply(request, pk):
    enq = get_object_or_404(_qs(), pk=pk)
    profile = getattr(request.user, 'staff_profile', None)
    name = profile.name if profile else (request.user.get_full_name() or request.user.username)
    return _do_reply(request, enq, 'admin', name, [request.user.email] if request.user.email else company_recipients()[:1])


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_enquiry_assign(request, pk):
    """POST { agent_id | null, note } — forward to an agent (or take it back)."""
    from apps.messaging.models import Message
    enq = get_object_or_404(_qs(), pk=pk)
    agent_id = request.data.get('agent_id')
    note = (request.data.get('note') or '').strip()[:1000]
    admin_name = getattr(getattr(request.user, 'staff_profile', None), 'name', None) or request.user.get_full_name() or request.user.username

    if not agent_id:
        enq.assigned_agent, enq.assigned_at, enq.assigned_note = None, None, ''
        enq.save(update_fields=['assigned_agent', 'assigned_at', 'assigned_note'])
        EnquiryReply.objects.create(enquiry=enq, author_role='admin', author_name=admin_name, kind='forward', message='Taken back by the administrator.')
        return Response({'enquiry': EnquirySerializer(_qs().get(pk=pk)).data})

    agent = get_object_or_404(Agent, pk=agent_id, status='active')
    enq.assigned_agent, enq.assigned_at, enq.assigned_note = agent, timezone.now(), note
    if enq.status == 'new':
        enq.status = 'pending'
    enq.save(update_fields=['assigned_agent', 'assigned_at', 'assigned_note', 'status'])
    EnquiryReply.objects.create(enquiry=enq, author_role='admin', author_name=admin_name, kind='forward',
                                message=f'Forwarded to {agent.name}.' + (f' Note: {note}' if note else ''))
    # instant heads-up in the agent's chat (also triggers the toast / badge) …
    Message.objects.create(sender_id=request.user.id, sender_role='admin', receiver_id=agent.id, receiver_role='agent',
                           content=f'📨 Enquiry {enq.ref_number} from {enq.name} ({enq.subject}) was forwarded to you. '
                                   f'Please answer the customer from "Enquiries" in your portal.' + (f'\nNote: {note}' if note else ''))
    # … and by e-mail when the agent has an address
    if agent.email:
        try:
            send_mail(f'Enquiry {enq.ref_number} forwarded to you', f"Hello {agent.name},\n\n{admin_name} forwarded a customer enquiry to you.\n\n"
                      f"Customer: {enq.name}\nPhone: {enq.phone or '—'}\nE-mail: {enq.email}\nSubject: {enq.subject}\n\n{enq.message}\n\n"
                      f"{('Note from admin: ' + note) if note else ''}\n\nAnswer it in the Agent Portal → Enquiries: {settings.FRONTEND_URL.rstrip('/')}/portal/enquiries",
                      settings.DEFAULT_FROM_EMAIL, [agent.email], fail_silently=True)
        except Exception:
            logger.exception('Forward e-mail to agent failed')
    return Response({'enquiry': EnquirySerializer(_qs().get(pk=pk)).data})


# ── agent ─────────────────────────────────────────────────────────
class AgentEnquiryList(generics.ListAPIView):
    serializer_class = EnquirySerializer
    permission_classes = [IsAgent]
    filterset_fields = ['status']
    pagination_class = None

    def get_queryset(self):
        return _qs().filter(assigned_agent=self.request.user.agent_profile)


@api_view(['POST'])
@permission_classes([IsAgent])
def agent_enquiry_reply(request, pk):
    from apps.messaging.models import Message
    agent = request.user.agent_profile
    enq = get_object_or_404(_qs().filter(assigned_agent=agent), pk=pk)   # 404 for anyone else's enquiry
    resp = _do_reply(request, enq, 'agent', agent.name, [agent.email] if agent.email else company_recipients()[:1])
    if resp.status_code == 200:
        admin = _first_admin()
        if admin:
            Message.objects.create(sender_id=agent.id, sender_role='agent', receiver_id=admin.id, receiver_role='admin',
                                   content=f"✅ I replied to enquiry {enq.ref_number} ({enq.name})."
                                           + (' Marked resolved.' if resp.data['enquiry']['status'] == 'resolved' else ''))
    return resp
