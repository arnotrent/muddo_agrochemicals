"""
Near-instant notifications for the admin panel and agent portal.

The project deliberately uses polling (no WebSockets/Redis). The browser calls this tiny endpoint
every few seconds while the tab is visible; it returns badge counts plus any NEW events since the
client's cursors, so the UI can show toasts / desktop notifications / unread badges immediately.

First call (no cursors) returns baseline cursors and NO events, so a fresh login never floods
the user with old items.
"""
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
    from apps.messaging.models import Message
    from apps.messaging.serializers import display_name
    from apps.requests_app.models import SupplyRequest

    user = request.user
    is_admin = user.is_staff
    events, counts, cursors = [], {}, {}

    # ── messages ────────────────────────────────────────────────
    if is_admin:
        my_q = Q(receiver_role='admin', is_broadcast=False) | Q(is_broadcast=True, sender_role='agent')
        base = Message.objects.filter(my_q)
        link = '/admin/chat'
    else:
        agent = user.agent_profile
        my_q = Q(receiver_role='agent', receiver_id=agent.id, is_broadcast=False) | \
            Q(is_broadcast=True) & ~Q(sender_role='agent', sender_id=agent.id)
        base = Message.objects.filter(my_q)
        link = '/portal/chat'
    counts['messages'] = base.filter(read=False).count()
    last = base.order_by('-id').values_list('id', flat=True).first() or 0
    cursors['msg'] = last
    after = _int(request, 'after_msg')
    if after is not None and last > after:
        for m in base.filter(id__gt=after).prefetch_related('attachments').order_by('id')[:10]:
            who = display_name(m.sender_role, m.sender_id)
            events.append({
                'id': f'msg-{m.id}', 'type': 'message',
                'title': f'Team message from {who}' if m.is_broadcast else f'New message from {who}',
                'body': _preview(m), 'link': link, 'created_at': m.created_at.isoformat(),
                'sender_id': m.sender_id, 'sender_role': m.sender_role, 'broadcast': m.is_broadcast,
            })

    # ── admin-only queues ───────────────────────────────────────
    if is_admin:
        from apps.products.models import ProductReview
        from apps.testimonials.models import Testimonial

        def queue(key, model, pending_filter, link_, title, body_fn, count_key):
            qs = model.objects.filter(**pending_filter)
            counts[count_key] = qs.count()
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

    events.sort(key=lambda e: e['created_at'])
    return Response({'counts': counts, 'cursors': cursors, 'events': events[-12:]})
