"""
Private storage for chat attachments.

Files are NEVER placed under MEDIA_ROOT/MEDIA_URL, so there is no public
URL that serves them. They are only reachable through the authenticated /
signed-link download endpoint in api_views.py.

A *callable* is used (rather than a storage instance) so migrations stay
stable across local-disk and S3 deployments.
"""
from django.conf import settings
from django.core.files.storage import FileSystemStorage


def get_private_storage():
    if getattr(settings, 'USE_S3_MEDIA', False):
        from storages.backends.s3boto3 import S3Boto3Storage
        return S3Boto3Storage(
            default_acl='private', querystring_auth=True,
            file_overwrite=False, custom_domain=None,
        )
    root = getattr(settings, 'PRIVATE_MEDIA_ROOT', settings.BASE_DIR / 'private_media')
    return FileSystemStorage(location=str(root), base_url=None)
