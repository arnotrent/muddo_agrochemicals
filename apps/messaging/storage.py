"""Private storage for chat attachments.

Attachments are NEVER exposed under /media/. They live outside MEDIA_ROOT
(or in a private S3 prefix) and are only reachable through the
authenticated download view in views.py, which checks the requester's
access to the conversation first.
"""
from django.conf import settings
from django.core.files.storage import FileSystemStorage


def private_attachment_storage():
    if getattr(settings, 'USE_S3_MEDIA', False):
        from storages.backends.s3boto3 import S3Boto3Storage
        return S3Boto3Storage(location='chat_private', default_acl='private',
                              querystring_auth=True, file_overwrite=False, custom_domain=False)
    return FileSystemStorage(location=str(settings.PRIVATE_MEDIA_ROOT), base_url=None)
