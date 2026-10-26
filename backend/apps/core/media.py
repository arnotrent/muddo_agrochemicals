import os

from django.conf import settings


def public_media_url(fieldfile):
    """
    Absolute URL for an uploaded file. Pictures used to come back as a RELATIVE '/media/...' path, which the browser
    resolved against the FRONTEND's address — so they 404'd. Uses PUBLIC_BASE_URL, then Render's RENDER_EXTERNAL_URL /
    RENDER_EXTERNAL_HOSTNAME. S3 / custom-domain URLs are already absolute.
    """
    if not fieldfile:
        return None
    try:
        url = fieldfile.url
    except ValueError:
        return None
    if url.startswith(('http://', 'https://')):
        return url
    base = (getattr(settings, 'PUBLIC_BASE_URL', '') or '').rstrip('/')
    if not base and os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
        base = f"https://{os.environ['RENDER_EXTERNAL_HOSTNAME']}"
    return f'{base}{url}' if base else url
