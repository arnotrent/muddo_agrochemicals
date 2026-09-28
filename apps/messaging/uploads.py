"""Upload validation + file-type helpers for the chat attachment system.

Design rules (from the communication spec):
  * files are stored byte-for-byte in their ORIGINAL format - never converted;
  * the original filename / extension / MIME / size are kept as metadata;
  * the extension alone is never trusted - the file header ("magic bytes")
    must agree with it, and executable headers are refused outright;
  * dangerous / active-content types are blocked (see BLOCKED_EXTENSIONS).
"""
import mimetypes
import os
import re
import uuid

from django.conf import settings


class UploadError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


# Executables, scripts, installers and active web content. Blocking these is
# the "allowed file-type validation" - everything else (documents, images,
# spreadsheets, video, audio, archives, ...) is accepted.
BLOCKED_EXTENSIONS = frozenset('''
exe msi bat cmd com scr pif cpl gadget vb vbs vbe js jse jar wsf wsh ws ps1 psm1 psd1 sh bash csh ksh
apk ipa app dmg deb rpm bin run lnk reg hta msc dll sys drv so dylib
html htm xhtml shtml svg svgz php php3 php4 php5 phtml asp aspx jsp cgi pl py rb
'''.split())

TEXT_EXTS = frozenset('txt csv md log json tsv'.split())

IMAGE_PREVIEW = frozenset('jpg jpeg jfif png gif webp bmp avif'.split())
IMAGE_EXTS = IMAGE_PREVIEW | {'heic', 'heif', 'tif', 'tiff'}
VIDEO_EXTS = frozenset('mp4 webm mov m4v 3gp avi mkv mpg mpeg'.split())
VIDEO_PREVIEW = frozenset('mp4 webm m4v mov'.split())
AUDIO_EXTS = frozenset('mp3 wav ogg m4a aac opus amr weba'.split())
DOC_EXTS = frozenset('doc docx odt rtf txt md'.split())
SHEET_EXTS = frozenset('xls xlsx csv ods tsv'.split())
SLIDE_EXTS = frozenset('ppt pptx odp'.split())
ARCHIVE_EXTS = frozenset('zip rar 7z gz tar tgz bz2'.split())

_OLE = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'
_ZIPS = (b'PK\x03\x04', b'PK\x05\x06')
_RIFF = b'RIFF'

EXTRA_MIME = {
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'doc': 'application/msword', 'xls': 'application/vnd.ms-excel', 'ppt': 'application/vnd.ms-powerpoint',
    'csv': 'text/csv', 'txt': 'text/plain', 'md': 'text/markdown', 'json': 'application/json',
    'webp': 'image/webp', 'avif': 'image/avif', 'jfif': 'image/jpeg', 'heic': 'image/heic',
    'mp4': 'video/mp4', 'webm': 'video/webm', 'm4v': 'video/x-m4v', 'mov': 'video/quicktime',
    'mp3': 'audio/mpeg', 'm4a': 'audio/mp4', 'ogg': 'audio/ogg', 'wav': 'audio/wav', 'opus': 'audio/ogg',
    'zip': 'application/zip', 'rar': 'application/vnd.rar', '7z': 'application/x-7z-compressed',
    'pdf': 'application/pdf',
}


def get_ext(filename):
    return os.path.splitext(filename or '')[1].lower().lstrip('.')[:16]


def clean_filename(name):
    """Keep the user's original filename (and extension) but strip anything unsafe."""
    name = os.path.basename((name or '').replace('\\', '/'))
    name = re.sub(r'[\x00-\x1f\x7f]', '', name).strip().strip('.')
    if len(name) > 200:
        stem, ext = os.path.splitext(name)
        name = stem[:200 - len(ext)] + ext
    return name or 'file'


def guess_mime(ext, filename=''):
    return EXTRA_MIME.get(ext) or mimetypes.guess_type(filename or ('x.' + ext))[0] or 'application/octet-stream'


def file_kind(ext):
    """Fine-grained kind, used to choose an icon and a preview strategy."""
    if ext in IMAGE_EXTS: return 'image'
    if ext in VIDEO_EXTS: return 'video'
    if ext in AUDIO_EXTS: return 'audio'
    if ext == 'pdf': return 'pdf'
    if ext in SHEET_EXTS: return 'spreadsheet'
    if ext in SLIDE_EXTS: return 'presentation'
    if ext in DOC_EXTS: return 'document'
    if ext in ARCHIVE_EXTS: return 'archive'
    return 'other'


def file_category(ext):
    """Gallery category: image / document / spreadsheet / video / other."""
    k = file_kind(ext)
    if k == 'image': return 'image'
    if k in ('pdf', 'document'): return 'document'
    if k == 'spreadsheet': return 'spreadsheet'
    if k == 'video': return 'video'
    return 'other'


def preview_type(ext):
    """How the viewer may render this file inline, or None (download only)."""
    if ext in IMAGE_PREVIEW: return 'image'
    if ext == 'pdf': return 'pdf'
    if ext in VIDEO_PREVIEW: return 'video'
    if ext in ('mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'weba'): return 'audio'
    if ext in ('txt', 'csv', 'tsv', 'log', 'md', 'json'): return 'text'
    return None


def human_size(n):
    n = float(n or 0)
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024 or unit == 'GB':
            return f'{int(n)} {unit}' if unit == 'B' else f'{n:.1f} {unit}'
        n /= 1024


def _matches_signature(ext, head):
    """True/False if we know the signature for ext; None if we have no rule for it."""
    if ext in ('jpg', 'jpeg', 'jfif'): return head.startswith(b'\xff\xd8\xff')
    if ext == 'png': return head.startswith(b'\x89PNG\r\n\x1a\n')
    if ext == 'gif': return head[:6] in (b'GIF87a', b'GIF89a')
    if ext == 'webp': return head[:4] == _RIFF and head[8:12] == b'WEBP'
    if ext == 'bmp': return head.startswith(b'BM')
    if ext == 'pdf': return b'%PDF-' in head[:1024]
    if ext in ('docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'zip'): return head.startswith(_ZIPS)
    if ext in ('doc', 'xls', 'ppt'): return head.startswith(_OLE) or head.startswith(_ZIPS) or head.lstrip().startswith(b'{\\rtf')
    if ext == 'rtf': return head.lstrip().startswith(b'{\\rtf')
    if ext == 'rar': return head.startswith(b'Rar!')
    if ext == '7z': return head.startswith(b"7z\xbc\xaf'\x1c")
    if ext in ('gz', 'tgz'): return head.startswith(b'\x1f\x8b')
    if ext in ('mp4', 'm4v', 'm4a', 'mov', '3gp', 'heic', 'heif', 'avif'):
        return head[4:8] in (b'ftyp', b'moov', b'wide', b'mdat', b'free', b'skip')
    if ext in ('webm', 'mkv', 'weba'): return head.startswith(b'\x1a\x45\xdf\xa3')
    if ext == 'mp3': return head.startswith(b'ID3') or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)
    if ext == 'wav': return head[:4] == _RIFF and head[8:12] == b'WAVE'
    if ext in ('ogg', 'opus'): return head.startswith(b'OggS')
    if ext == 'avi': return head[:4] == _RIFF and head[8:12] == b'AVI '
    return None


def _looks_executable(head):
    return (head.startswith(b'MZ') or head.startswith(b'\x7fELF') or head.startswith(b'#!')
            or head[:4] in (b'\xca\xfe\xba\xbe', b'\xfe\xed\xfa\xce', b'\xfe\xed\xfa\xcf', b'\xcf\xfa\xed\xfe', b'\xce\xfa\xed\xfe'))


def validate_upload(f):
    """Validate an UploadedFile. Returns {'name','ext','mime','size'} or raises UploadError."""
    max_bytes = settings.CHAT_MAX_UPLOAD_BYTES
    size = f.size or 0
    name = clean_filename(f.name)
    ext = get_ext(name)
    if size <= 0:
        raise UploadError('empty', 'That file is empty.')
    if size > max_bytes:
        raise UploadError('too_large', f'File too large. Please upload a file within the allowed size limit ({human_size(max_bytes)}).', 413)
    if ext in BLOCKED_EXTENSIONS:
        raise UploadError('type_blocked', 'File type not supported. This file type cannot be uploaded.', 415)
    f.seek(0); head = f.read(4096); f.seek(0)
    if ext in TEXT_EXTS:
        if b'\x00' in head:
            raise UploadError('mismatch', f'This file is not a valid .{ext} file.', 415)
    else:
        if _looks_executable(head):
            raise UploadError('type_blocked', 'File type not supported. Executable files cannot be uploaded.', 415)
        ok = _matches_signature(ext, head)
        if ok is False:
            raise UploadError('mismatch', f'The contents of this file do not match its .{ext} extension.', 415)
    scan_for_malware(f)
    return {'name': name, 'ext': ext, 'mime': guess_mime(ext, name), 'size': size}


def scan_for_malware(f):
    """Optional ClamAV hook (CHAT_CLAMAV_ENABLED=True + `pip install pyclamd`). No-op otherwise."""
    if not getattr(settings, 'CHAT_CLAMAV_ENABLED', False):
        return
    try:
        import pyclamd
        cd = pyclamd.ClamdUnixSocket()
        f.seek(0); result = cd.scan_stream(f.read()); f.seek(0)
    except Exception:
        return  # scanner unavailable -> fail open; the header/extension checks above still apply
    if result:
        raise UploadError('infected', 'This file was blocked by the security scanner.', 422)


def new_storage_name(ext):
    return f'{uuid.uuid4().hex}.{ext}' if ext else uuid.uuid4().hex
