import { useEffect, useMemo, useRef, useState } from 'react'
import ChatIcon from './chat/ChatIcon'
import Avatar from './Avatar'
import Composer from './chat/Composer'
import MessageAttachments from './chat/MessageAttachments'
import { formatDate, formatTime } from './chat/fileUtils'

// Delivery ticks, WhatsApp-style:  ✓ grey = sent · ✓✓ grey = delivered to their device · ✓✓ BLUE = read.
const BLUE = '#2563EB'
function Ticks({ status }) {
  if (status === 'read') return <span title="Read" aria-label="Read" className="inline-flex" style={{ color: BLUE }}><ChatIcon name="checks" size="1.05em" /></span>
  if (status === 'delivered') return <span title="Delivered" aria-label="Delivered" className="inline-flex text-text-3"><ChatIcon name="checks" size="1.05em" /></span>
  return <span title="Sent" aria-label="Sent" className="inline-flex text-text-3"><ChatIcon name="check" size="1.05em" /></span>
}

/** Centre pane: header, messages, drag-and-drop, composer. */
export default function ChatWindow({
  myId, myRole, current, messages, pending, onSend, onRetry, onDiscard, onBack, onOpenInfo, onOpenFiles,
  onOpenAttachment, clearedBefore, search, setSearch, searchOpen, setSearchOpen,
}) {
  const [replyTo, setReplyTo] = useState(null)
  const [focusKey, setFocusKey] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dropped, setDropped] = useState(null)
  const scrollRef = useRef(null)
  const dragDepth = useRef(0)
  const stick = useRef(true)

  const visible = useMemo(() => {
    const q = (search || '').toLowerCase()
    return messages.filter((m) => m.id > (clearedBefore || 0) && (!q || (m.content || '').toLowerCase().includes(q) || m.attachments?.some((a) => a.name.toLowerCase().includes(q))))
  }, [messages, search, clearedBefore])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight })
  }, [visible.length, pending.length, pending.map((p) => p.state + p.progress).join()]) // eslint-disable-line

  useEffect(() => { setReplyTo(null); stick.current = true }, [current?.id, current?.role])

  if (!current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-3 text-center p-10">
        <ChatIcon name="send" size="3.5rem" className="mb-4 opacity-40" />
        <h3 className="font-bold text-text-2 mb-2">No conversation selected</h3>
        <p className="text-sm max-w-[34ch]">Choose a contact on the left — or message everyone at once via “Team”. Attach photos, PDFs and spreadsheets straight from the composer.</p>
      </div>
    )
  }

  const startReply = (m) => { setReplyTo({ id: m.id, name: m.sender_name, preview: m.content || m.attachments?.[0]?.name }); setFocusKey((k) => k + 1) }
  const onScroll = () => { const el = scrollRef.current; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120 }
  const dragProps = {
    onDragEnter: (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); dragDepth.current++; setDragging(true) } },
    onDragOver: (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() },
    onDragLeave: () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) },
    onDrop: (e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (e.dataTransfer?.files?.length) setDropped(Array.from(e.dataTransfer.files)) },
  }

  let lastDay = ''
  const renderBubble = (m, isPending) => {
    const mine = isPending || (m.sender_role === myRole && m.sender_id === myId)
    const day = formatDate(m.created_at)
    const sep = day !== lastDay ? (lastDay = day, <div key={`d${m.id || m.localId}`} className="self-center my-2 text-[0.68rem] font-bold text-text-3 bg-bg-alt px-3 py-1 rounded-full">{day}</div>) : null
    const failed = isPending && m.state === 'failed'
    const sending = isPending && m.state === 'sending'
    return (
      <div key={m.id || m.localId} className="contents">
        {sep}
        <div className={`flex gap-2 mb-1.5 group animate-msgIn ${mine ? 'flex-row-reverse' : ''}`}>
          {!mine && <Avatar src={m.sender_avatar_url} name={m.sender_name} className="w-7 h-7 self-end" textClass="text-[0.65rem]" alt="" />}
          {/* my bubbles are a light blue tint so the grey / blue read-ticks stay visible on them */}
          <div className={`max-w-[78%] sm:max-w-[64%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm break-words ${
            failed ? 'bg-accent-red/10 border border-accent-red text-text-1 rounded-br-md'
              : mine ? 'bg-accent-blue/20 border border-accent-blue/30 text-text-1 rounded-br-md' : 'bg-bg-card border border-border text-text-1 rounded-bl-md'}`}>
            {!mine && (current.role === 'broadcast' || m.sender_role === 'admin') && <div className="text-[0.7rem] font-bold text-accent-blue mb-0.5">{m.sender_name}{m.sender_role === 'admin' ? ' · Admin' : ''}</div>}
            {m.reply_to_detail && (
              <div className="border-l-[3px] border-accent-blue rounded-md px-2.5 py-1.5 mb-1.5 text-xs bg-bg-alt/80">
                <strong className="block text-[0.7rem]">{m.reply_to_detail.sender_name}</strong><span className="line-clamp-2">{m.reply_to_detail.content}</span>
              </div>
            )}
            <MessageAttachments attachments={m.attachments} mine={false} onOpen={(a) => onOpenAttachment(a, m.attachments.filter((x) => !x.pending))} />
            {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
            {sending && m.files.length > 0 && (
              <div className="mt-2"><div className="h-1 rounded-full bg-bg-alt overflow-hidden"><div className="h-full bg-accent-blue transition-[width] duration-200" style={{ width: `${m.progress}%` }} /></div><div className="text-[0.66rem] mt-0.5 text-text-3">Uploading… {m.progress}%</div></div>
            )}
            {failed && (
              <div className="mt-2 flex items-center gap-2 text-xs text-accent-red"><ChatIcon name="alert" />{m.error}
                <button onClick={() => onRetry(m.localId)} className="ml-auto font-bold underline flex items-center gap-1"><ChatIcon name="retry" />Retry</button>
                <button onClick={() => onDiscard(m.localId)} className="font-bold underline">Remove</button></div>
            )}
            <div className="text-[0.64rem] mt-1 text-right flex justify-end items-center gap-1 text-text-3">
              {formatTime(m.created_at)}
              {mine && !failed && (sending ? <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" aria-label="Sending" /> : isPending ? <Ticks status="sent" /> : current.role !== 'broadcast' && <Ticks status={m.status} />)}
            </div>
          </div>
          {!isPending && (
            <button onClick={() => startReply(m)} aria-label="Reply to this message"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 max-sm:opacity-60 self-center w-7 h-7 rounded-full border border-border bg-bg-card text-text-3 flex items-center justify-center flex-shrink-0"><ChatIcon name="reply" size="0.85em" /></button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 relative" {...dragProps}>
      <div className="p-3 border-b border-border flex items-center gap-3 bg-bg-card flex-shrink-0">
        <button onClick={onBack} aria-label="Back to conversations" className="md:hidden w-9 h-9 rounded-full hover:bg-bg-alt text-text-2 flex items-center justify-center"><ChatIcon name="left" size="1.2rem" /></button>
        <div className="relative flex-shrink-0">
          {current.role === 'broadcast'
            ? <div className="w-10 h-10 rounded-full bg-bg-deep text-white flex items-center justify-center"><ChatIcon name="users" /></div>
            : <Avatar src={current.avatar_url} name={current.name} className="w-10 h-10" alt="" />}
          {current.role !== 'broadcast' && <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-bg-card ${current.is_online ? 'bg-accent-green' : 'bg-text-4'}`} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-text-1 truncate flex items-center gap-2">{current.name}
            <span className="px-2 py-0.5 rounded-full bg-bg-alt text-accent-blue text-[0.62rem] font-bold uppercase">{current.role === 'broadcast' ? 'Team' : current.role}</span></div>
          <div className="text-xs text-text-3">{current.role === 'broadcast' ? 'Everyone' : current.is_online ? 'Online now' : 'Offline'}</div>
        </div>
        <button onClick={() => setSearchOpen((s) => !s)} aria-label="Search conversation" aria-pressed={searchOpen} className={`w-9 h-9 rounded-full flex items-center justify-center ${searchOpen ? 'bg-accent-blue text-white' : 'hover:bg-bg-alt text-text-2'}`}><ChatIcon name="search" /></button>
        <button onClick={onOpenFiles} aria-label="Attachments and files" className="w-9 h-9 rounded-full hover:bg-bg-alt text-text-2 flex items-center justify-center"><ChatIcon name="paperclip" /></button>
        <button onClick={onOpenInfo} aria-label="Conversation information and more options" className="w-9 h-9 rounded-full hover:bg-bg-alt text-text-2 flex items-center justify-center"><ChatIcon name="more" /></button>
      </div>
      {searchOpen && (
        <div className="px-3 py-2 border-b border-border bg-bg-card flex items-center gap-2">
          <ChatIcon name="search" className="text-text-3" />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search in this conversation" placeholder="Search messages and file names…" className="flex-1 bg-transparent outline-none text-sm text-text-1" />
          <span className="text-xs text-text-3">{search ? `${visible.length} found` : ''}</span>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col bg-bg" role="log" aria-live="polite" aria-label="Messages">
        {!visible.length && !pending.length && <div className="m-auto text-center text-text-3 text-sm">{search ? 'No messages match your search.' : 'No messages yet — say hello, or drop a file here.'}</div>}
        {visible.map((m) => renderBubble(m, false))}
        {pending.map((m) => renderBubble(m, true))}
      </div>

      {dragging && (
        <div className="absolute inset-0 z-20 bg-accent-blue/10 border-2 border-dashed border-accent-blue rounded-lg flex flex-col items-center justify-center pointer-events-none animate-viewerIn" aria-hidden="true">
          <ChatIcon name="download" size="2.5rem" className="text-accent-blue mb-2" /><div className="font-bold text-accent-blue">Drop files here to attach</div>
        </div>
      )}
      <Composer onSend={onSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} externalFiles={dropped} onExternalConsumed={() => setDropped(null)} focusKey={focusKey} />
    </div>
  )
}
