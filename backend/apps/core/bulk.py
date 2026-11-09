"""Shared CSV reading for the admin bulk-import screens (products, agents, distributors)."""
import csv
import io
import re

from rest_framework.exceptions import ValidationError

MAX_BYTES = 2 * 1024 * 1024


def _norm(h):
    return re.sub(r'[^a-z0-9]+', '_', (h or '').strip().lower()).strip('_')


def read_csv(upload, aliases, required, max_rows):
    """
    Returns [(row_number, {canonical_field: value})]. Header names are matched loosely (case, spaces, aliases).
    Raises ValidationError({'detail': ...}) for anything that is not a usable CSV, so bad files never reach the database.
    """
    name = (getattr(upload, 'name', '') or '')
    if not name.lower().endswith('.csv'):
        raise ValidationError({'detail': 'Please upload a .csv file (in Excel: Save As > CSV).'})
    if upload.size == 0:
        raise ValidationError({'detail': 'That file is empty.'})
    if upload.size > MAX_BYTES:
        raise ValidationError({'detail': f'That file is too large (max {MAX_BYTES // 1024 // 1024} MB).'})
    raw = upload.read()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('cp1252', errors='replace')
    if '\x00' in text:
        raise ValidationError({'detail': 'That does not look like a text CSV file.'})
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=',;\t')
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    header = next(reader, None)
    if not header:
        raise ValidationError({'detail': 'The file has no header row.'})
    cols = {}
    for i, h in enumerate(header):
        key = _norm(h)
        canon = aliases.get(key, key if key in aliases.values() else None)
        if canon and canon not in cols.values():
            cols[i] = canon
    missing = [r for r in required if r not in cols.values()]
    if missing:
        raise ValidationError({'detail': f'Missing required column(s): {", ".join(missing)}. '
                                         f'Found: {", ".join(h.strip() for h in header if h.strip()) or "none"}.'})
    rows = []
    for n, cells in enumerate(reader, start=2):
        if not any((c or '').strip() for c in cells):
            continue
        rows.append((n, {canon: (cells[i].strip() if i < len(cells) else '') for i, canon in cols.items()}))
        if len(rows) > max_rows:
            raise ValidationError({'detail': f'Too many rows - the limit is {max_rows} per file. Split the file and upload it in parts.'})
    if not rows:
        raise ValidationError({'detail': 'The file has a header but no data rows.'})
    return rows


def flat_errors(err):
    """Turns DRF serializer errors into one short readable sentence."""
    out = []

    def walk(v, prefix=''):
        if isinstance(v, dict):
            for k, x in v.items():
                walk(x, '' if k in ('non_field_errors', 'detail') else f'{k}: ')
        elif isinstance(v, (list, tuple)):
            for x in v:
                walk(x, prefix)
        else:
            out.append(f'{prefix}{v}')
    walk(err)
    return '; '.join(out)[:300] or 'Invalid data.'
