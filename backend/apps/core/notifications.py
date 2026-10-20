"""
Near-instant notifications for the admin panel and agent portal (polling by design — no WebSockets/Redis).

The browser calls this endpoint every few seconds while the tab is visible (and immediately after any
change it makes, or when the tab regains focus). It returns badge counts plus any NEW events since the
client's cursors. The first call (no cursors) returns baseline cursors and NO events.

Admin and agents see the same unread numbers the chat screens show: direct messages are counted from
`Message.read`, team broadcasts from the per-person `BroadcastRead` table.
"""
from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsAdminOrAgent


def _preview(m):
    n = m.attachments.count() + (1 if m.attachment else 0)
    if m.content:
        return m.content[:90] + ('\u2026' if len(m.content) > 90 else '')
    return f'\U0001F4CE {n} attachment{"s" if n != 1 else ""}' if n else ''


def _int(request, key):
    try:
        return int(request.GET.get(key))
    except (TypeError, ValueError):
        return None


@api_view(['GET'])
@permission_classes([IsAdminOrAgent])
def notifications_summary_view(request):
    from apps.core.models import ContactRequest
    from apps.messaging.models import Message, BroadcastRead
    from apps.messaging.serializers import display_name
    from apps.requests_app.models import SupplyRequest

    user = request.user
    is_admin = user.is_staff
    events, counts, cursors = [], {}, {}

    if is_admin:
        my_id, my_role = user.id, 'admin'
        dm = Message.objects.filter(is_broadcast=False, receiver_role='admin')          # shared admin inbox
        bc = Message.objects.filter(is_broadcast=True).exclude(sender_role='admin')
        link = '/admin/chat'
    else:
        agent = user.agent_profile
        my_id, my_role = agent.id, 'agent'
        # presence: an agent is "online" while ANY portal page is open, not only the chat
        if not agent.last_seen or (timezone.now() - agent.last_seen).total_seconds() > 45:
            agent.last_seen = timezone.now()
            agent.save(update_fields=['last_seen'])
        dm = Message.objects.filter(is_broadcast=False, receiver_role='agent', receiver_id=agent.id)
        bc = Message.objects.filter(is_broadcast=True).exclude(sender_role='agent', sender_id=agent.id)
        link = '/portal/chat'

    # Delivery receipts (grey double tick): everything addressed to me counts as delivered the moment my client polls.
    dm.filter(delivered_at__isnull=True).update(delivered_at=timezone.now())

    seen = BroadcastRead.objects.filter(reader_id=my_id, reader_role=my_role).values('message_id')
    counts['messages'] = dm.filter(read=False).count() + bc.exclude(pk__in=seen).count()

    mine = dm | bc
    last = mine.order_by('-id').values_list('id', flat=True).first() or 0
    cursors['msg'] = last
    after = _int(request, 'after_msg')
    if after is not None and last > after:
        for m in mine.filter(id__gt=after).prefetch_related('attachments').order_by('id')[:10]:
            who = display_name(m.sender_role, m.sender_id)
            events.append({
                'id': f'msg-{m.id}', 'type': 'message',
                'title': f'Team message from {who}' if m.is_broadcast else f'New message from {who}',
                'body': _preview(m), 'link': link, 'created_at': m.created_at.isoformat(),
                'sender_id': m.sender_id, 'sender_role': m.sender_role, 'broadcast': m.is_broadcast,
            })

    if is_admin:
        from apps.products.models import ProductReview
        from apps.testimonials.models import Testimonial

        def queue(key, model, pending_filter, link_, title, body_fn, count_key):
            counts[count_key] = model.objects.filter(**pending_filter).count()
            top = model.objects.order_by('-id').values_list('id', flat=True).first() or 0
            cursors[key] = top
            a = _int(request, f'after_{key}')
            if a is not None and top > a:
                for o in model.objects.filter(id__gt=a).order_by('id')[:5]:
                    events.append({'id': f'{key}-{o.id}', 'type': count_key, 'title': title(o),
                                   'body': body_fn(o), 'link': link_, 'created_at': o.created_at.isoformat()})

        queue('enq', ContactRequest, {'status': 'new'}, '/admin/requests',
              lambda o: f'New enquiry from {o.name}', lambda o: f'{o.subject} \u2014 {o.message[:70]}', 'enquiries')
        queue('sup', SupplyRequest, {'status': 'pending'}, '/admin/supply-requests',
              lambda o: f'New supply request from {o.agent.name}', lambda o: f'{o.product_name} \u00d7 {o.quantity}', 'supply')
        queue('rev', ProductReview, {'status': 'pending'}, '/admin/reviews',
              lambda o: f'New product review ({o.rating}\u2605)', lambda o: f'{o.name} on {o.product.name}', 'reviews')
        queue('tes', Testimonial, {'status': 'pending'}, '/admin/testimonials',
              lambda o: f'New testimonial from {o.name}', lambda o: o.message[:80], 'testimonials')
    else:
        counts['supply'] = SupplyRequest.objects.filter(agent=user.agent_profile, status='pending').count()
        counts['enquiries'] = ContactRequest.objects.filter(assigned_agent=user.agent_profile).exclude(status='resolved').count()

    events.sort(key=lambda e: e['created_at'])
    return Response({'counts': counts, 'cursors': cursors, 'events': events[-12:]})
