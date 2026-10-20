from django.conf import settings


def public_media_url(fieldfile):
    """
    Absolute URL for an uploaded file. Profile pictures (agents, staff, leaders, testimonials) used to come back as a
    RELATIVE '/media/...' path, which the browser resolved against the FRONTEND's address — so every one of them 404'd.
    Uses PUBLIC_BASE_URL (falls back to Render's RENDER_EXTERNAL_URL). S3 / custom-domain URLs are already absolute.
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
    return f'{base}{url}' if base else url
