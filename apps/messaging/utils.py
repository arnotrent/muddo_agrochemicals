def message_preview(msg, limit=46):
    """One-line conversation-list preview: text first, then a paperclip count for attachments."""
    text = (msg.content or '').strip().replace('\n', ' ')
    if len(text) > limit:
        text = text[:limit] + '…'
    try:
        n = msg.attachments.count() + (1 if msg.attachment else 0)
    except Exception:
        n = 0
    if n:
        tail = f'📎 {n} attachment' + ('s' if n != 1 else '')
        return f'{text} · {tail}' if text else tail
    return text
