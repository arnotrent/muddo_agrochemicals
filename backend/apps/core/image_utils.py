"""
Safe handling of images uploaded through public/admin forms.

Re-encoding through Pillow (instead of storing the uploaded bytes) strips EXIF/GPS metadata,
neutralises polyglot files (an image that is also a script/archive) and bounds the stored size.
"""
import io
import uuid

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard (Pillow raises above 2x this)
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP', 'GIF', 'MPO'}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def sanitize_image(upload, max_side=800, quality=86, name_prefix='img'):
    """Return a clean JPEG ContentFile (<= max_side px) or raise serializers.ValidationError."""
    if upload.size > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError('That photo is too large (max 5 MB).')
    try:
        upload.seek(0)
        im = Image.open(upload)
        if im.format not in ALLOWED_FORMATS:
            raise serializers.ValidationError('Please upload a JPG, PNG, WEBP or GIF photo.')
        im.load()
    except serializers.ValidationError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError):
        raise serializers.ValidationError('That file is not a valid image.')
    im = ImageOps.exif_transpose(im)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
    return ContentFile(out.getvalue(), name=f'{name_prefix}-{uuid.uuid4().hex[:12]}.jpg')
