"""
Visitors can fix or withdraw THEIR OWN review (product review or website testimonial) with the private link/token they
were given when they submitted it. Any edit sends the review back to 'pending' so it is moderated again.
"""
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core import edit_tokens
from apps.core.throttles import AuthThrottle


def _load(kind, token):
    parsed = edit_tokens.read(token)
    if not parsed or parsed[0] != kind:
        return None
    if kind == 'product':
        from apps.products.models import ProductReview
        return ProductReview.objects.select_related('product').filter(pk=parsed[1]).first()
    if kind == 'testimonial':
        from apps.testimonials.models import Testimonial
        return Testimonial.objects.select_related('product').filter(pk=parsed[1]).first()
    return None


def _out(kind, o):
    base = {'kind': kind, 'id': o.id, 'name': o.name, 'rating': o.rating, 'status': o.status,
            'product_name': o.product.name if getattr(o, 'product', None) else None, 'created_at': o.created_at}
    if kind == 'product':
        return {**base, 'comment': o.comment}
    return {**base, 'role': o.role, 'message': o.message}


def _clean(data, kind, errors):
    out = {}
    def text(key, lo, hi, label):
        if key in data:
            v = ' '.join(str(data.get(key) or '').split()) if key != 'comment' and key != 'message' else str(data.get(key) or '').strip()
            if not (lo <= len(v) <= hi):
                errors[key] = [f'{label} must be {lo}–{hi} characters.']
            else:
                out[key] = v
    text('name', 2, 80, 'Name')
    if kind == 'product':
        text('comment', 10, 1500, 'Review')
    else:
        text('message', 15, 1000, 'Testimonial')
        if 'role' in data:
            out['role'] = ' '.join(str(data.get('role') or '').split())[:120]
    if 'rating' in data:
        raw = data.get('rating')
        if raw in (None, '', 0, '0') and kind == 'testimonial':
            out['rating'] = None
        else:
            try:
                r = int(raw)
                if not 1 <= r <= 5:
                    raise ValueError
                out['rating'] = r
            except (TypeError, ValueError):
                errors['rating'] = ['Choose 1 to 5 stars.']
    return out


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def review_edit_view(request, kind, token):
    o = _load(kind, token)
    if not o:
        return Response({'detail': 'This edit link is invalid or has expired (links last 14 days).'}, status=404)
    if request.method == 'GET':
        return Response(_out(kind, o))
    if request.method == 'DELETE':
        if kind == 'testimonial' and getattr(o, 'photo', None):
            o.photo.delete(save=False)
        o.delete()
        return Response({'detail': 'Your review was removed.'})
    errors = {}
    changes = _clean(request.data, kind, errors)
    if errors:
        return Response({'detail': 'Please correct the highlighted fields.', 'errors': errors}, status=400)
    for k, v in changes.items():
        setattr(o, k, v)
    o.status = 'pending'          # edited text is moderated again before it shows
    o.save()
    return Response({**_out(kind, o), 'detail': 'Saved. Your updated review will show again once our team has checked it.'})
