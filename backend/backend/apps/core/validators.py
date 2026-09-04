from rest_framework import serializers

# Browser-renderable image formats. HEIC/HEIF (default on most iPhones)
# is deliberately excluded — almost no browser besides Safari can
# display it, so "succeeding" would just look broken everywhere else.
ALLOWED_IMAGE_EXTS = ('png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'jfif')


def ext_of(filename: str) -> str:
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def validate_image_upload(file_obj):
    """Raise a DRF ValidationError with a clear message for unsupported formats."""
    ext = ext_of(file_obj.name)
    if ext not in ALLOWED_IMAGE_EXTS:
        tail = (' HEIC/HEIF from iPhone isn\u2019t viewable in most browsers \u2014 export as JPEG first.'
                if ext in ('heic', 'heif') else '')
        raise serializers.ValidationError(
            f'That file (.{ext or "unknown"}) isn\u2019t a supported image format \u2014 '
            f'please use JPG, PNG, GIF, WEBP or BMP.{tail}'
        )
    return file_obj
