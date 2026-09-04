import csv
import io
from datetime import timedelta

from django.db.models import Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from apps.core.permissions import IsAdmin
from apps.core.models import ContactRequest
from apps.products.models import Product
from apps.inventory.models import Inventory
from apps.agents.models import Agent
from apps.requests_app.models import SupplyRequest
from apps.messaging.models import Message
from apps.distributors.models import Distributor


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_dashboard_stats_view(request):
    """GET /api/v1/admin/dashboard/ — the KPI cards + recent-activity lists."""
    stats = {
        'total_products': Product.objects.count(),
        'total_distributors': Distributor.objects.count(),
        'new_requests': ContactRequest.objects.filter(status='new').count(),
        'total_requests': ContactRequest.objects.count(),
        'total_agents': Agent.objects.count(),
        'active_agents': Agent.objects.filter(status='active').count(),
        'pending_supply': SupplyRequest.objects.filter(status='pending').count(),
        'unread_msgs': Message.objects.filter(receiver_role='admin', read=False).count(),
        'low_stock': Inventory.objects.filter(stock_qty__lte=F('reorder_level')).count(),
    }

    from apps.core.serializers import ContactRequestAdminSerializer
    from apps.requests_app.serializers import SupplyRequestSerializer
    from apps.agents.serializers import AgentSerializer
    from apps.inventory.serializers import InventorySerializer

    return Response({
        'stats': stats,
        'recent_requests': ContactRequestAdminSerializer(ContactRequest.objects.order_by('-created_at')[:5], many=True).data,
        'agents': AgentSerializer(Agent.objects.select_related('user').order_by('-last_seen')[:10], many=True).data,
        'recent_supply': SupplyRequestSerializer(SupplyRequest.objects.select_related('agent__user').order_by('-created_at')[:5], many=True).data,
        'low_stock_items': InventorySerializer(
            Inventory.objects.filter(stock_qty__lte=F('reorder_level')).select_related('product').order_by('stock_qty')[:5],
            many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_analytics_charts_view(request):
    """GET /api/v1/admin/dashboard/charts/ — feeds the Chart.js widgets."""
    since = timezone.now() - timedelta(days=14)
    daily = (ContactRequest.objects.filter(created_at__gte=since)
             .annotate(day=TruncDate('created_at')).values('day').annotate(cnt=Count('id')).order_by('day'))
    return Response({
        'daily_enquiries': [{'day': str(r['day']), 'cnt': r['cnt']} for r in daily],
        'supply_by_status': list(SupplyRequest.objects.values('status').annotate(cnt=Count('id'))),
        'products_by_cat': list(Product.objects.values('category').annotate(cnt=Count('id'))),
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_import_csv_view(request):
    """
    POST /api/v1/admin/products/import-csv/  (multipart, field name: csv_file)
    Columns: name, category, description, active_ingredient, formulation,
    crops, dosage, packing, image_url. Only name+category are required.
    Existing products (by exact name) are skipped, never overwritten.
    """
    f = request.FILES.get('csv_file')
    if not f or not f.name.endswith('.csv'):
        return Response({'detail': 'Upload a .csv file.'}, status=status.HTTP_400_BAD_REQUEST)

    reader = csv.DictReader(io.StringIO(f.read().decode('utf-8-sig', errors='replace')))
    added = 0
    skipped = 0
    errors = []
    for row in reader:
        try:
            name = (row.get('name') or '').strip()
            cat = (row.get('category') or '').strip().lower()
            if not name or cat not in ('pesticide', 'herbicide', 'fungicide', 'other'):
                skipped += 1
                continue
            p, created = Product.objects.get_or_create(name=name, defaults={
                'category': cat, 'description': (row.get('description') or '').strip(),
                'active_ingredient': (row.get('active_ingredient') or '').strip(),
                'formulation': (row.get('formulation') or '').strip(),
                'crops': (row.get('crops') or '').strip(), 'dosage': (row.get('dosage') or '').strip(),
                'packing': (row.get('packing') or '').strip(), 'image_url': (row.get('image_url') or '').strip(),
            })
            if created:
                Inventory.objects.get_or_create(product=p, defaults={'stock_qty': 0})
                added += 1
            else:
                skipped += 1
        except Exception as e:
            errors.append(str(e))

    return Response({'added': added, 'skipped': skipped, 'errors': errors})


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_change_password_view(request):
    """POST { old_password, new_password, confirm_password } — for the logged-in admin's own account."""
    old = request.data.get('old_password', '')
    new = request.data.get('new_password', '')
    confirm = request.data.get('confirm_password', '')
    if new != confirm:
        return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new) < 8:
        return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(old):
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new)
    request.user.save()
    return Response({'detail': 'Password updated. Please log in again.'})


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_reset_agent_password_view(request):
    """POST { agent_id, new_password } — admin resets a field agent's password."""
    from django.shortcuts import get_object_or_404
    pw = request.data.get('new_password', '')
    if len(pw) < 6:
        return Response({'detail': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    agent = get_object_or_404(Agent, pk=request.data.get('agent_id'))
    agent.user.set_password(pw)
    agent.user.save()
    return Response({'detail': f'Password reset for {agent.name}.'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_sysinfo_view(request):
    import django
    return Response({
        'total_products': Product.objects.count(),
        'total_agents': Agent.objects.count(),
        'total_enquiries': ContactRequest.objects.count(),
        'distributors': Distributor.objects.count(),
        'logged_in_as': request.user.username,
        'django_version': django.get_version(),
    })
