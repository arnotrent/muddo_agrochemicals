import json
import random
import re
from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse, Http404, HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.utils import timezone
from django.utils.http import content_disposition_header
from django.views.decorators.http import require_GET, require_POST
from django.conf import settings

from apps.agents.models import Agent
from apps.core.models import ContactRequest
from apps.messaging import uploads
from apps.messaging.models import Attachment, Message
from apps.messaging.utils import message_preview

PAGE = 60
ROLES = ('admin', 'agent', 'broadcast')


# ───────────────────────── small helpers ─────────────────────────
def _err(message, code='error', status=400):
    return JsonResponse({'error': message, 'code': code}, status=status)


def _int(v, default=0):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _id(user):
    if user.is_staff: return user.id, 'admin'
    try: return user.agent_profile.id, 'agent'
    except Exception: return user.id, 'agent'


def _bump(user):
    if not user.is_staff:
        try:
            user.agent_profile.last_seen = timezone.now()
            user.agent_profile.save(update_fields=['last_seen'])
        except Exception:
            pass


def _throttle(key, limit, window):
    """True when `key` has exceeded `limit` hits in `window` seconds (shared file cache)."""
    k = f'chatthr:{key}'
    try:
        cache.add(k, 0, window)
        return cache.incr(k) > limit
    except Exception:
        return False


class _Names:
    """Per-request memo so serialising 60 messages doesn't run 120 queries."""
    def __init__(self): self._n, self._a = {}, {}

    def name(self, role, pid):
        k = (role, pid)
        if k not in self._n:
            if role == 'admin':
                u = User.objects.filter(pk=pid, is_staff=True).first()
                if u:
                    try: self._n[k] = u.staff_profile.name
                    except Exception: self._n[k] = u.get_full_name() or u.username
                else: self._n[k] = 'Admin'
            else:
                a = Agent.objects.filter(pk=pid).select_related('user').first()
                self._n[k] = a.name if a else 'Agent'
        return self._n[k]

    def avatar(self, role, pid):
        k = (role, pid)
        if k not in self._a:
            url = None
            if role == 'admin':
                u = User.objects.filter(pk=pid).first()
                if u:
                    try: url = u.staff_profile.avatar_url
                    except Exception: url = None
            else:
                a = Agent.objects.filter(pk=pid).first()
                url = a.avatar_url if a else None
            self._a[k] = url
        return self._a[k]


def _thread_q(my_id, my_role, with_role, with_id):
    if with_role == 'broadcast':
        return Message.objects.filter(is_broadcast=True)
    return Message.objects.filter(is_broadcast=False).filter(
        Q(sender_id=my_id, sender_role=my_role, receiver_id=with_id, receiver_role=with_role) |
        Q(sender_id=with_id, sender_role=with_role, receiver_id=my_id, receiver_role=my_role))


def _party_exists(role, pid):
    if role == 'admin': return User.objects.filter(pk=pid, is_staff=True).exists()
    if role == 'agent': return Agent.objects.filter(pk=pid).exists()
    return False


def _can_access_message(user, m):
    """Administrators have elevated access; everyone else only their own threads + the Team channel."""
    if user.is_staff or m.is_broadcast:
        return True
    my_id, my_role = _id(user)
    return ((m.sender_id == my_id and m.sender_role == my_role) or
            (m.receiver_id == my_id and m.receiver_role == my_role))


# ───────────────────────── serialisers ─────────────────────────
def _att_dict(a, names):
    return {
        'id': a.id, 'name': a.original_filename, 'ext': a.file_extension, 'mime': a.mime_type,
        'size': a.file_size, 'size_h': uploads.human_size(a.file_size),
        'kind': a.kind, 'category': a.category, 'preview': a.preview,
        'url': reverse('api_chat_attachment', args=[a.id]),
        'uploaded_by_role': a.uploaded_by_role,
        'uploaded_by_name': names.name(a.uploaded_by_role, a.uploaded_by_id),
        'uploaded_at': a.uploaded_at.isoformat(), 'message_id': a.message_id, 'pending': a.message_id is None,
    }


def _legacy_att_dict(m, names):
    name = m.attachment.name.rsplit('/', 1)[-1]
    ext = uploads.get_ext(name)
    try: size = m.attachment.size
    except Exception: size = 0
    return {
        'id': f'L{m.id}', 'name': name, 'ext': ext, 'mime': uploads.guess_mime(ext, name), 'size': size,
        'size_h': uploads.human_size(size), 'kind': uploads.file_kind(ext), 'category': uploads.file_category(ext),
        'preview': uploads.preview_type(ext), 'url': reverse('api_chat_legacy_attachment', args=[m.id]),
        'uploaded_by_role': m.sender_role, 'uploaded_by_name': names.name(m.sender_role, m.sender_id),
        'uploaded_at': m.created_at.isoformat(), 'message_id': m.id, 'pending': False,
    }


def _serialize(m, names):
    reply = None
    if m.reply_to_id and m.reply_to:
        r = m.reply_to
        reply = {'id': r.id, 'sender_role': r.sender_role, 'sender_name': names.name(r.sender_role, r.sender_id),
                 'content': (r.content[:80] if r.content else ('📎 Attachment' if (r.attachment or r.attachments.exists()) else ''))}
    atts = [_att_dict(a, names) for a in m.attachments.all()]
    if m.attachment and not atts:
        atts = [_legacy_att_dict(m, names)]
    return {
        'id': m.id, 'client_id': m.client_id, 'sender_id': m.sender_id, 'sender_role': m.sender_role,
        'sender_name': names.name(m.sender_role, m.sender_id),
        'sender_avatar_url': names.avatar(m.sender_role, m.sender_id),
        'receiver_id': m.receiver_id, 'receiver_role': m.receiver_role,
        'content': m.content, 'read': m.read, 'status': m.status, 'is_broadcast': m.is_broadcast,
        'reply_to': reply, 'attachments': atts, 'created_at': m.created_at.isoformat(),
    }


# ───────────────────────── admin page ─────────────────────────
@staff_member_required
def admin_chat(request):
    agents = list(Agent.objects.filter(status='active').select_related('user'))
    unread_map = {str(r['sender_id']): r['n'] for r in
                  Message.objects.filter(receiver_role='admin', read=False, is_broadcast=False)
                  .values('sender_id').annotate(n=Count('id'))}
    for a in agents:
        m = (Message.objects.filter(is_broadcast=False)
             .filter(Q(sender_role='agent', sender_id=a.id) | Q(receiver_role='agent', receiver_id=a.id))
             .order_by('-id').prefetch_related('attachments').first())
        a.last_message_preview = message_preview(m) if m else ''
        a.last_message_time = m.created_at if m else None
        a.last_message_mine = bool(m and m.sender_role == 'admin')
        a.unread_from = unread_map.get(str(a.id), 0)
    agents.sort(key=lambda a: (a.unread_from == 0, -(a.last_message_time.timestamp() if a.last_message_time else 0)))
    last_team = Message.objects.filter(is_broadcast=True).order_by('-id').prefetch_related('attachments').first()
    return render(request, 'admin/chat.html', {
        'agents': agents, 'unread_map': unread_map, 'last_team': last_team,
        'last_team_preview': message_preview(last_team, 38) if last_team else '',
    })


# ───────────────────────── messages ─────────────────────────
@login_required
@require_GET
def api_messages(request):
    _bump(request.user)
    my_id, my_role = _id(request.user)
    with_role = request.GET.get('with_role', 'agent')
    if with_role not in ROLES:
        return _err('Bad conversation.', 'bad_request')
    with_id = _int(request.GET.get('with_id'))
    after, before, around = (_int(request.GET.get(k)) for k in ('after', 'before', 'around'))

    qs = _thread_q(my_id, my_role, with_role, with_id).select_related('reply_to').prefetch_related('attachments')
    has_more = False
    if around:
        older = list(qs.filter(id__lte=around).order_by('-id')[:PAGE // 2 + 1])
        has_more = len(older) > PAGE // 2
        msgs = list(reversed(older[:PAGE // 2])) + list(qs.filter(id__gt=around).order_by('id')[:PAGE // 2])
    elif before:
        rows = list(qs.filter(id__lt=before).order_by('-id')[:PAGE + 1])
        has_more, msgs = len(rows) > PAGE, list(reversed(rows[:PAGE]))
    elif after:
        msgs = list(qs.filter(id__gt=after).order_by('id')[:100])
    else:
        rows = list(qs.order_by('-id')[:PAGE + 1])
        has_more, msgs = len(rows) > PAGE, list(reversed(rows[:PAGE]))

    if with_role != 'broadcast':  # everything addressed to me that I just fetched is now "delivered"
        ids = [m.id for m in msgs if m.receiver_id == my_id and m.receiver_role == my_role and not m.delivered]
        if ids:
            Message.objects.filter(pk__in=ids).update(delivered=True, delivered_at=timezone.now())

    names = _Names()
    out = {'messages': [_serialize(m, names) for m in msgs], 'has_more': has_more, 'typing': False, 'statuses': {}}
    track = [i for i in (_int(x) for x in request.GET.get('track', '').split(',')[:100]) if i]
    if track and with_role != 'broadcast':
        out['statuses'] = {str(m.id): m.status for m in
                           Message.objects.filter(pk__in=track, sender_id=my_id, sender_role=my_role)}
    if with_role != 'broadcast':
        out['typing'] = bool(cache.get(f'typing:{with_role}:{with_id}:{my_role}:{my_id}'))
    return JsonResponse(out)


@login_required
@require_POST
def api_send(request):
    _bump(request.user)
    my_id, my_role = _id(request.user)
    try: data = json.loads(request.body or b'{}')
    except ValueError: return _err('Invalid request.', 'bad_json')

    content = (data.get('content') or '').strip()
    if len(content) > settings.CHAT_MAX_MESSAGE_CHARS:
        return _err(f'Message is too long (max {settings.CHAT_MAX_MESSAGE_CHARS} characters).', 'too_long')
    att_ids = [i for i in (_int(x) for x in (data.get('attachment_ids') or [])[:settings.CHAT_MAX_FILES_PER_MESSAGE + 1]) if i]
    if len(att_ids) > settings.CHAT_MAX_FILES_PER_MESSAGE:
        return _err(f'You can attach up to {settings.CHAT_MAX_FILES_PER_MESSAGE} files per message.', 'too_many_files')
    if _throttle(f'send:{request.user.id}', 60, 60):
        return _err('You are sending messages too quickly. Please wait a moment.', 'throttled', 429)

    client_id = str(data.get('client_id') or '')[:64]
    if client_id:  # idempotent retry: same client_id -> return the message we already stored
        prev = Message.objects.filter(sender_id=my_id, sender_role=my_role, client_id=client_id).first()
        if prev:
            return JsonResponse({'message': _serialize(prev, _Names())})

    atts = list(Attachment.objects.filter(pk__in=att_ids, message__isnull=True, uploaded_by_id=my_id, uploaded_by_role=my_role))
    if len(atts) != len(set(att_ids)):
        return _err('One of the attachments is no longer available. Please attach it again.', 'attachment_missing')
    if not content and not atts:
        return _err('A message needs text or an attachment.', 'empty')

    is_broadcast = str(data.get('broadcast', '')).lower() in ('true', '1', 'on')
    to_id, to_role = 0, 'agent'
    if not is_broadcast:
        to_role = data.get('to_role', 'agent')
        to_id = _int(data.get('to_id'), -1)
        if to_role not in ('admin', 'agent') or not _party_exists(to_role, to_id):
            return _err('That recipient does not exist.', 'bad_recipient')
        if (to_id, to_role) == (my_id, my_role):
            return _err('You cannot message yourself.', 'bad_recipient')

    reply_to = None
    rid = _int(data.get('reply_to'))
    if rid:
        cand = Message.objects.filter(pk=rid).first()
        if cand and cand.is_broadcast == is_broadcast and (is_broadcast or (
                {(cand.sender_id, cand.sender_role), (cand.receiver_id, cand.receiver_role)} ==
                {(my_id, my_role), (to_id, to_role)})):
            reply_to = cand

    with transaction.atomic():
        m = Message.objects.create(sender_id=my_id, sender_role=my_role, receiver_id=to_id, receiver_role=to_role,
                                   content=content, is_broadcast=is_broadcast, reply_to=reply_to, client_id=client_id)
        if atts:
            Attachment.objects.filter(pk__in=[a.pk for a in atts]).update(message=m)
    m = Message.objects.select_related('reply_to').prefetch_related('attachments').get(pk=m.pk)
    return JsonResponse({'message': _serialize(m, _Names())})


@login_required
@require_POST
def api_typing(request):
    my_id, my_role = _id(request.user)
    try: d = json.loads(request.body or b'{}')
    except ValueError: return _err('Invalid request.', 'bad_json')
    role, pid = d.get('to_role'), _int(d.get('to_id'), -1)
    if role in ('admin', 'agent') and pid >= 0:
        cache.set(f'typing:{my_role}:{my_id}:{role}:{pid}', 1, 6)
    return JsonResponse({'ok': True})


@login_required
def api_unread(request):
    my_id, my_role = _id(request.user)
    mine = Message.objects.filter(receiver_id=my_id, receiver_role=my_role, is_broadcast=False)
    mine.filter(delivered=False).update(delivered=True, delivered_at=timezone.now())
    per = {}
    for r in mine.filter(read=False).values('sender_id', 'sender_role').annotate(n=Count('id')):
        per[f"{r['sender_id']}_{r['sender_role']}"] = r['n']
    total = sum(per.values())
    bcast = Message.objects.filter(is_broadcast=True, read=False).exclude(sender_id=my_id, sender_role=my_role).count()
    if bcast:
        per['0_broadcast'] = bcast
        total += bcast
    return JsonResponse({'total': total, 'per_contact': per})


@login_required
@require_POST
def api_mark_read(request):
    try: data = json.loads(request.body or b'{}')
    except ValueError: return _err('bad json', 'bad_json')
    my_id, my_role = _id(request.user)
    from_role, from_id = data.get('from_role'), _int(data.get('from_id'), -1)
    now = timezone.now()
    if from_role == 'broadcast':
        Message.objects.filter(is_broadcast=True, read=False).exclude(sender_id=my_id, sender_role=my_role)\
            .update(read=True, read_at=now, delivered=True)
    elif from_role in ('admin', 'agent'):
        Message.objects.filter(sender_id=from_id, sender_role=from_role, receiver_id=my_id, receiver_role=my_role,
                               is_broadcast=False, read=False).update(read=True, read_at=now, delivered=True)
    return JsonResponse({'ok': True})


# ───────────────────────── search / info / files / report ─────────────────────────
@login_required
@require_GET
def api_search(request):
    my_id, my_role = _id(request.user)
    with_role = request.GET.get('with_role', 'agent')
    q = (request.GET.get('q') or '').strip()
    if with_role not in ROLES or len(q) < 2:
        return JsonResponse({'results': []})
    qs = _thread_q(my_id, my_role, with_role, _int(request.GET.get('with_id')))
    qs = qs.filter(Q(content__icontains=q) | Q(attachments__original_filename__icontains=q)).distinct().order_by('-id')[:50]
    names = _Names()
    return JsonResponse({'results': [{
        'id': m.id, 'sender_name': names.name(m.sender_role, m.sender_id), 'created_at': m.created_at.isoformat(),
        'snippet': (m.content or message_preview(m))[:120]} for m in qs]})


@login_required
@require_GET
def api_info(request):
    my_id, my_role = _id(request.user)
    with_role, with_id = request.GET.get('with_role', 'agent'), _int(request.GET.get('with_id'))
    if with_role not in ROLES:
        return _err('Bad conversation.')
    thread = _thread_q(my_id, my_role, with_role, with_id)
    first = thread.order_by('id').first()
    info = {'created_at': first.created_at.isoformat() if first else None, 'message_count': thread.count(),
            'file_count': Attachment.objects.filter(message__in=thread).count() + thread.exclude(attachment='').exclude(attachment__isnull=True).count()}
    if with_role == 'broadcast':
        info.update(name='Team (Everyone)', role='Group', account={}, last_active=None)
    elif with_role == 'admin':
        u = User.objects.filter(pk=with_id, is_staff=True).first()
        info.update(name=_Names().name('admin', with_id), role='Head Office',
                    account={'Office': 'Muddo Agro Chemicals · Kampala'}, last_active=u.last_login.isoformat() if u and u.last_login else None)
    else:
        a = get_object_or_404(Agent.objects.select_related('user'), pk=with_id)
        acct = {'Username': a.username, 'Region': a.region or '—', 'District': a.district or '—'}
        if request.user.is_staff:  # contact details are for head office only
            acct.update({'Email': a.email or '—', 'Phone': a.phone or '—', 'Joined': a.created_at.strftime('%d %b %Y')})
        info.update(name=a.name, role='Field Agent', account=acct, avatar_url=a.avatar_url,
                    last_active=a.last_seen.isoformat() if a.last_seen else None, online=a.is_online)
    return JsonResponse(info)


@login_required
@require_GET
def api_files(request):
    """Shared files for one conversation (default) or every conversation I can see (scope=all)."""
    my_id, my_role = _id(request.user)
    names = _Names()
    if request.GET.get('scope') == 'all':
        msgs = Message.objects.filter(Q(is_broadcast=True) | Q(sender_id=my_id, sender_role=my_role) |
                                      Q(receiver_id=my_id, receiver_role=my_role))
    else:
        with_role = request.GET.get('with_role', 'agent')
        if with_role not in ROLES: return _err('Bad conversation.')
        msgs = _thread_q(my_id, my_role, with_role, _int(request.GET.get('with_id')))

    q = (request.GET.get('q') or '').strip().lower()
    cat = request.GET.get('category') or 'all'
    rows = []
    for a in Attachment.objects.filter(message__in=msgs).select_related('message'):
        rows.append((a, a.message, _att_dict(a, names)))
    for m in msgs.exclude(attachment='').exclude(attachment__isnull=True):
        if not m.attachments.exists():
            rows.append((None, m, _legacy_att_dict(m, names)))
    out = []
    for a, m, d in rows:
        if cat != 'all' and d['category'] != cat: continue
        if q and q not in d['name'].lower() and q not in d['uploaded_by_name'].lower() and q not in d['ext']: continue
        if m.is_broadcast: d['conversation'] = 'Team (Everyone)'
        else:
            o_role, o_id = (m.receiver_role, m.receiver_id) if (m.sender_id, m.sender_role) == (my_id, my_role) else (m.sender_role, m.sender_id)
            d['conversation'] = names.name(o_role, o_id)
        out.append(d)
    sort = request.GET.get('sort', 'date')
    rev = request.GET.get('order', 'desc') == 'desc'
    out.sort(key=(lambda d: d['name'].lower()) if sort == 'name' else (lambda d: d['uploaded_at']), reverse=rev)
    return JsonResponse({'files': out[:300], 'total': len(out)})


@login_required
@require_POST
def api_report(request):
    try: d = json.loads(request.body or b'{}')
    except ValueError: return _err('Invalid request.')
    if _throttle(f'report:{request.user.id}', 5, 3600):
        return _err('Too many reports. Please try again later.', 'throttled', 429)
    note = (d.get('note') or '').strip()[:1000]
    who = request.user.get_full_name() or request.user.username
    ContactRequest.objects.create(
        name=who[:200], email=(request.user.email or 'chat-report@muddo.invalid'), subject='General Enquiry',
        message=f'[Chat issue report by {request.user.username}] {note or "No details given."}'[:4000])
    return JsonResponse({'ok': True})


# ───────────────────────── uploads / downloads ─────────────────────────
def _purge_orphans():
    """Uploads that were never attached to a sent message are removed after 24h."""
    cutoff = timezone.now() - timedelta(hours=24)
    for a in Attachment.objects.filter(message__isnull=True, uploaded_at__lt=cutoff)[:50]:
        a.delete()


@login_required
@require_POST
def api_upload(request):
    _bump(request.user)
    limit = settings.CHAT_MAX_UPLOAD_BYTES
    if _int(request.META.get('CONTENT_LENGTH')) > limit + 1024 * 1024:  # refuse before parsing the body
        return _err(f'File too large. Please upload a file within the allowed size limit ({uploads.human_size(limit)}).', 'too_large', 413)
    if _throttle(f'upload:{request.user.id}', 40, 60):
        return _err('Too many uploads at once. Please wait a moment.', 'throttled', 429)
    f = request.FILES.get('file')
    if not f:
        return _err('No file was received.', 'no_file')
    try:
        info = uploads.validate_upload(f)
    except uploads.UploadError as e:
        return _err(e.message, e.code, e.status)
    my_id, my_role = _id(request.user)
    f.name = uploads.new_storage_name(info['ext'])
    a = Attachment.objects.create(file=f, original_filename=info['name'], file_extension=info['ext'],
                                  mime_type=info['mime'], file_size=info['size'], uploaded_by_id=my_id, uploaded_by_role=my_role)
    if random.random() < 0.03:
        _purge_orphans()
    return JsonResponse({'attachment': _att_dict(a, _Names())}, status=201)


@login_required
@require_POST
def api_upload_delete(request, aid):
    my_id, my_role = _id(request.user)
    a = Attachment.objects.filter(pk=aid, message__isnull=True, uploaded_by_id=my_id, uploaded_by_role=my_role).first()
    if a: a.delete()
    return JsonResponse({'ok': True})


def _range_iter(f, start, length, chunk=64 * 1024):
    try:
        f.seek(start)
        remaining = length
        while remaining > 0:
            data = f.read(min(chunk, remaining))
            if not data: break
            remaining -= len(data)
            yield data
    finally:
        f.close()


def _serve(request, fieldfile, name, mime, ext):
    """Stream a stored file with the ORIGINAL filename; supports Range requests (video seeking)."""
    try:
        f = fieldfile.open('rb')
        size = fieldfile.size
    except Exception:
        raise Http404('File not found')
    ptype = uploads.preview_type(ext)
    inline = ptype is not None and request.GET.get('download') != '1'
    if inline:
        ctype = 'text/plain; charset=utf-8' if ptype == 'text' else mime
    else:
        ctype = 'application/octet-stream'
    rng = request.headers.get('Range', '')
    resp = None
    if rng and inline:
        m = re.match(r'^bytes=(\d*)-(\d*)$', rng.strip())
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else size - 1
            else:
                start = max(size - int(m.group(2)), 0); end = size - 1
            end = min(end, size - 1)
            if start > end or start >= size:
                f.close()
                r = HttpResponse(status=416); r['Content-Range'] = f'bytes */{size}'; return r
            resp = StreamingHttpResponse(_range_iter(f, start, end - start + 1), status=206, content_type=ctype)
            resp['Content-Range'] = f'bytes {start}-{end}/{size}'
            resp['Content-Length'] = str(end - start + 1)
    if resp is None:
        resp = FileResponse(f, content_type=ctype)
        resp['Content-Length'] = str(size)
    resp['Accept-Ranges'] = 'bytes'
    resp['Content-Disposition'] = content_disposition_header(not inline, name)
    resp['X-Content-Type-Options'] = 'nosniff'
    resp['Cache-Control'] = 'private, max-age=300'
    resp['Referrer-Policy'] = 'no-referrer'
    return resp


@login_required
@require_GET
def api_attachment_file(request, aid):
    a = get_object_or_404(Attachment.objects.select_related('message'), pk=aid)
    if a.message_id is None:  # not yet sent: visible to the uploader only
        if (a.uploaded_by_id, a.uploaded_by_role) != _id(request.user):
            raise Http404
    elif not _can_access_message(request.user, a.message):
        raise Http404  # 404, not 403: don't reveal that the file exists
    return _serve(request, a.file, a.original_filename, a.mime_type, a.file_extension)


@login_required
@require_GET
def api_legacy_attachment_file(request, mid):
    m = get_object_or_404(Message, pk=mid)
    if not m.attachment or not _can_access_message(request.user, m):
        raise Http404
    name = m.attachment.name.rsplit('/', 1)[-1]
    ext = uploads.get_ext(name)
    return _serve(request, m.attachment, name, uploads.guess_mime(ext, name), ext)
