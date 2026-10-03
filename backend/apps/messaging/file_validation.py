"""
Upload validation for chat attachments.

Principles (from the Muddo communication spec, section 20):
  * never trust the extension alone  -> magic-byte sniffing per type
  * never trust the client MIME type -> we assign the MIME from our own table
  * original file keeps its original type/extension (no conversion)
  * unique, unguessable storage names (see models.attachment_path)
  * hard limits on size and count
Anything not on the allow-list (html, svg, exe, js, ...) is rejected.
"""
import os
import re
import zipfile

from rest_framework.exceptions import ValidationError

MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_FILES_PER_MESSAGE = 10
MAX_UNCOMPRESSED_OOXML = 500 * 1024 * 1024  # zip-bomb guard

# ext -> (mime, category)
ALLOWED = {
    'jpg': ('image/jpeg', 'image'), 'jpeg': ('image/jpeg', 'image'),
    'png': ('image/png', 'image'), 'gif': ('image/gif', 'image'),
    'webp': ('image/webp', 'image'),
    'pdf': ('application/pdf', 'document'),
    'doc': ('application/msword', 'document'),
    'docx': ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'),
    'txt': ('text/plain', 'document'),
    'xls': ('application/vnd.ms-excel', 'spreadsheet'),
    'xlsx': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'spreadsheet'),
    'csv': ('text/csv', 'spreadsheet'),
    'ppt': ('application/vnd.ms-powerpoint', 'presentation'),
    'pptx': ('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'presentation'),
    'mp4': ('video/mp4', 'video'), 'mov': ('video/quicktime', 'video'),
    'webm': ('video/webm', 'video'),
    'mp3': ('audio/mpeg', 'audio'), 'wav': ('audio/wav', 'audio'),
    'm4a': ('audio/mp4', 'audio'), 'ogg': ('audio/ogg', 'audio'),
    'zip': ('application/zip', 'archive'),
}

# Types a browser can safely render in-page; everything else is download-only.
INLINE_SAFE = {'image', 'video', 'audio'} | {'pdf'}

OLE = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'
MP4_BOXES = {b'ftyp', b'moov', b'mdat', b'free', b'wide'}
OOXML_ROOT = {'docx': 'word/', 'xlsx': 'xl/', 'pptx': 'ppt/'}


def ext_of(name):
    return name.rsplit('.', 1)[-1].lower() if '.' in name else ''


def sanitize_filename(name, ext):
    """Keep the ORIGINAL name + extension; only strip path/control chars."""
    name = (name or '').replace('\\', '/').rsplit('/', 1)[-1]
    name = re.sub(r'[\x00-\x1f\x7f<>:"|?*]', '', name).strip().strip('.')
    if len(name) > 150:
        base, _, e = name.rpartition('.')
        name = (base[:140] + '.' + e) if base else name[:150]
    return name or f'file.{ext}'


def _ooxml_ok(f, ext):
    try:
        with zipfile.ZipFile(f) as z:
            names = z.namelist()
            if '[Content_Types].xml' not in names:
                return False
            if not any(n.startswith(OOXML_ROOT[ext]) for n in names):
                return False
            return sum(i.file_size for i in z.infolist()) <= MAX_UNCOMPRESSED_OOXML
    except zipfile.BadZipFile:
        return False


def _sniff(f, ext, head):
    if ext in ('jpg', 'jpeg'):
        return head[:3] == b'\xff\xd8\xff'
    if ext == 'png':
        return head[:8] == b'\x89PNG\r\n\x1a\n'
    if ext == 'gif':
        return head[:4] == b'GIF8'
    if ext == 'webp':
        return head[:4] == b'RIFF' and head[8:12] == b'WEBP'
    if ext == 'pdf':
        return b'%PDF-' in head[:1024]
    if ext in ('doc', 'xls', 'ppt'):
        return head[:8] == OLE
    if ext in OOXML_ROOT:
        return head[:4] == b'PK\x03\x04' and _ooxml_ok(f, ext)
    if ext == 'zip':
        return head[:4] in (b'PK\x03\x04', b'PK\x05\x06') and zipfile.is_zipfile(f)
    if ext in ('txt', 'csv'):
        if b'\x00' in head:
            return False
        try:
            head.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                head.decode('cp1252')
            except UnicodeDecodeError:
                return False
        return True
    if ext in ('mp4', 'mov', 'm4a'):
        return head[4:8] in MP4_BOXES
    if ext == 'webm':
        return head[:4] == b'\x1aE\xdf\xa3'
    if ext == 'mp3':
        return head[:3] == b'ID3' or (len(head) > 1 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0)
    if ext == 'wav':
        return head[:4] == b'RIFF' and head[8:12] == b'WAVE'
    if ext == 'ogg':
        return head[:4] == b'OggS'
    return False


def validate_upload(f):
    """Return metadata dict for a validated upload or raise ValidationError({'detail': ...})."""
    name = getattr(f, 'name', '') or ''
    ext = ext_of(name)
    if ext not in ALLOWED:
        raise ValidationError({'detail': f'File type not supported: "{sanitize_filename(name, ext or "file")}" '
                                         f'(.{ext or "unknown"}) cannot be uploaded.'})
    if f.size > MAX_FILE_BYTES:
        raise ValidationError({'detail': f'File too large: "{sanitize_filename(name, ext)}" exceeds the '
                                         f'{MAX_FILE_BYTES // (1024 * 1024)} MB limit.'})
    if f.size == 0:
        raise ValidationError({'detail': f'"{sanitize_filename(name, ext)}" is empty.'})
    f.seek(0)
    head = f.read(4096)
    f.seek(0)
    ok = _sniff(f, ext, head)
    f.seek(0)
    if not ok:
        raise ValidationError({'detail': f'"{sanitize_filename(name, ext)}" does not look like a real .{ext} '
                                         f'file, so it was rejected.'})
    mime, category = ALLOWED[ext]
    return {'original_name': sanitize_filename(name, ext), 'extension': ext,
            'mime_type': mime, 'category': category, 'size': f.size}
