"""
Admin bulk import (CSV) for products, field agents and distributors.
Every row is validated and saved on its own, so one bad row never blocks the rest, and the response lists
exactly which rows were created / skipped / failed and why. Admin only.
"""
import logging
import re
import secrets

from django.db import transaction
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.bulk import read_csv, flat_errors
from apps.core.permissions import IsAdmin

logger = logging.getLogger('django.request')
TRUE = {'1', 'true', 'yes', 'y', 'featured'}


def _result(n, label, status, message=''):
    return {'row': n, 'name': label, 'status': status, 'message': message}


def _respond(results, **extra):
    count = lambda s: sum(1 for r in results if r['status'] == s)
    resp = Response({'created': count('created'), 'skipped': count('skipped'), 'failed': count('failed'), 'total': len(results),
                     'rows': [r for r in results if r['status'] != 'created'][:300], **extra})
    resp['Cache-Control'] = 'no-store'
    return resp


def _file(request):
    f = request.FILES.get('csv_file') or request.FILES.get('file')
    if not f:
        raise ValidationError({'detail': 'Choose a CSV file first.'})
    return f


# ── products ──────────────────────────────────────────────────────────────
PRODUCT_ALIASES = {
    'name': 'name', 'product': 'name', 'product_name': 'name', 'category': 'category', 'type': 'category',
    'description': 'description', 'usage_instructions': 'usage_instructions', 'usage': 'usage_instructions',
    'active_ingredient': 'active_ingredient', 'formulation': 'formulation', 'crops': 'crops', 'target_crops': 'crops',
    'dosage': 'dosage', 'rate': 'dosage', 'packing': 'packing', 'pack_sizes': 'packing', 'image_url': 'image_url', 'image': 'image_url',
    'stock_qty': 'stock_qty', 'stock': 'stock_qty', 'reorder_level': 'reorder_level', 'is_featured': 'is_featured', 'featured': 'is_featured',
}
CATEGORY = {'pesticide': 'pesticide', 'pesticides': 'pesticide', 'insecticide': 'pesticide', 'insecticides': 'pesticide',
            'herbicide': 'herbicide', 'herbicides': 'herbicide', 'fungicide': 'fungicide', 'fungicides': 'fungicide',
            'other': 'other', 'others': 'other', 'equipment': 'other', 'fertilizer': 'other', 'fertilizers': 'other'}
LIMITS = {'active_ingredient': 300, 'formulation': 200, 'crops': 300, 'dosage': 200, 'packing': 200, 'image_url': 500}


def _int(v, label, default):
    if v == '':
        return default
    try:
        n = int(float(v))
    except ValueError:
        raise ValueError(f'{label} must be a whole number')
    if n < 0:
        raise ValueError(f'{label} cannot be negative')
    return n


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([MultiPartParser, FormParser])
def import_products(request):
    from apps.products.models import Product
    from apps.inventory.models import Inventory
    rows = read_csv(_file(request), PRODUCT_ALIASES, ['name', 'category'], 1000)
    out = []
    for n, r in rows:
        name = ' '.join(r.get('name', '').split())
        try:
            if not name or len(name) > 200:
                raise ValueError('name is required (max 200 characters)')
            cat = CATEGORY.get(r.get('category', '').strip().lower())
            if not cat:
                raise ValueError('category must be pesticide, herbicide, fungicide or other')
            for k, mx in LIMITS.items():
                if len(r.get(k, '')) > mx:
                    raise ValueError(f'{k} is longer than {mx} characters')
            img = r.get('image_url', '')
            if img and not re.match(r'^(https?://|/)', img, re.I):
                raise ValueError('image_url must start with https:// or /')
            stock, reorder = _int(r.get('stock_qty', ''), 'stock_qty', 0), _int(r.get('reorder_level', ''), 'reorder_level', 10)
            if Product.objects.filter(name__iexact=name).exists():
                out.append(_result(n, name, 'skipped', 'A product with this name already exists'))
                continue
            with transaction.atomic():
                p = Product.objects.create(
                    name=name, category=cat, description=r.get('description', ''), usage_instructions=r.get('usage_instructions', '').replace(' | ', '\n'),
                    active_ingredient=r.get('active_ingredient', ''), formulation=r.get('formulation', ''), crops=r.get('crops', ''),
                    dosage=r.get('dosage', ''), packing=r.get('packing', ''), image_url=img,
                    is_featured=r.get('is_featured', '').lower() in TRUE)
                Inventory.objects.create(product=p, stock_qty=stock, reorder_level=reorder)
            out.append(_result(n, name, 'created'))
        except ValueError as e:
            out.append(_result(n, name or '(no name)', 'failed', str(e)))
        except Exception:  # noqa: BLE001
            logger.exception('Product import row %s failed', n)
            out.append(_result(n, name or '(no name)', 'failed', 'Unexpected error saving this row'))
    return _respond(out)


# ── agents ────────────────────────────────────────────────────────────────
AGENT_ALIASES = {'name': 'name', 'full_name': 'name', 'username': 'username', 'user': 'username', 'email': 'email', 'phone': 'phone',
                 'region': 'region', 'district': 'district', 'password': 'password'}
REGIONS = ['Central', 'Eastern', 'Northern', 'Western']
MAX_AGENT_ROWS = 50  # every password is hashed (slow on purpose); keeps the request inside the 120 s server timeout


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([MultiPartParser, FormParser])
def import_agents(request):
    from apps.agents.serializers import AgentCreateSerializer
    rows = read_csv(_file(request), AGENT_ALIASES, ['name', 'username'], MAX_AGENT_ROWS)
    out, creds = [], []
    for n, r in rows:
        label = r.get('name') or r.get('username') or '(blank)'
        try:
            username = r.get('username', '')
            if not re.match(r'^[\w.@+-]{1,150}$', username):
                raise ValueError('username may only contain letters, numbers and . @ + - _')
            region = ''
            if r.get('region'):
                region = next((x for x in REGIONS if x.lower() == r['region'].lower()), None)
                if region is None:
                    raise ValueError(f'region must be one of {", ".join(REGIONS)}')
            generated = not r.get('password')
            password = r.get('password') or secrets.token_urlsafe(8)
            s = AgentCreateSerializer(data={'name': r.get('name', ''), 'username': username, 'email': r.get('email', ''),
                                            'phone': r.get('phone', ''), 'region': region, 'district': r.get('district', ''), 'password': password})
            if not s.is_valid():
                raise ValueError(flat_errors(s.errors))
            with transaction.atomic():
                s.save()
            out.append(_result(n, label, 'created'))
            if generated:
                creds.append({'name': r['name'], 'username': username, 'password': password})
        except ValueError as e:
            out.append(_result(n, label, 'failed', str(e)))
        except Exception:  # noqa: BLE001
            logger.exception('Agent import row %s failed', n)
            out.append(_result(n, label, 'failed', 'Unexpected error saving this row'))
    return _respond(out, credentials=creds, max_rows=MAX_AGENT_ROWS)


# ── distributors ──────────────────────────────────────────────────────────
DIST_ALIASES = {'name': 'name', 'outlet': 'name', 'outlet_name': 'name', 'country': 'country', 'region': 'region', 'district': 'district',
                'town': 'town', 'city': 'town', 'address': 'address', 'street_address': 'address', 'location_details': 'location_details',
                'directions': 'location_details', 'phone': 'phone', 'email': 'email', 'lat': 'lat', 'latitude': 'lat',
                'lng': 'lng', 'lon': 'lng', 'long': 'lng', 'longitude': 'lng'}


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([MultiPartParser, FormParser])
def import_distributors(request):
    from apps.distributors.models import Distributor
    from apps.distributors.serializers import DistributorSerializer
    countries = {c.lower(): c for c, _ in Distributor.COUNTRIES}
    rows = read_csv(_file(request), DIST_ALIASES, ['name', 'region', 'district', 'lat', 'lng'], 500)
    out = []
    for n, r in rows:
        label = r.get('name') or '(blank)'
        try:
            country = countries.get((r.get('country') or 'Uganda').lower())
            if not country:
                raise ValueError(f'country must be one of {", ".join(countries.values())}')
            try:
                lat, lng = float(r['lat']), float(r['lng'])
            except (KeyError, ValueError):
                raise ValueError('latitude and longitude are required numbers, e.g. 0.313611 and 32.581111')
            data = {k: r.get(k, '') for k in ('name', 'region', 'district', 'town', 'address', 'location_details', 'phone', 'email')}
            data.update(country=country, lat=lat, lng=lng)
            s = DistributorSerializer(data=data)
            if not s.is_valid():
                raise ValueError(flat_errors(s.errors))
            with transaction.atomic():
                s.save()
            out.append(_result(n, label, 'created'))
        except ValueError as e:
            out.append(_result(n, label, 'failed', str(e)))
        except Exception:  # noqa: BLE001
            logger.exception('Distributor import row %s failed', n)
            out.append(_result(n, label, 'failed', 'Unexpected error saving this row'))
    return _respond(out)
