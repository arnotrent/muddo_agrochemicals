import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

export default function ChatWindow({ myId, myRole, current, messages, sending, onSend }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  if (!current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-3 text-center p-10">
        <Icon name="comments" size="3.5rem" className="mb-4 opacity-50" />
        <h3 className="font-bold text-text-2 mb-2">Select a chat to start messaging</h3>
        <p className="text-sm">Choose a contact, or message everyone at once via "Team".</p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() && !file) return
    await onSend({ content: text.trim(), attachment: file, replyTo: replyTo?.id })
    setText('')
    setFile(null)
    setReplyTo(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3.5 border-b border-border flex items-center gap-3 bg-bg-card flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-accent-blue text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
          {current.avatar ? <img src={current.avatar} className="w-full h-full object-cover" /> : (current.role === 'broadcast' ? '📢' : current.name?.[0]?.toUpperCase())}
        </div>
        <div>
          <div className="font-bold text-sm text-text-1">{current.name}</div>
          <div className="text-xs text-text-3">{current.role === 'broadcast' ? 'Everyone' : current.is_online ? 'Online now' : 'Offline'}</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-1 bg-bg">
        {messages.map((m) => {
          const isMine = m.sender_role === myRole && m.sender_id === myId
          return (
            <div key={m.id} className={`flex gap-2 mb-1.5 group ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className="w-6.5 h-6.5 rounded-full bg-bg-deep text-white flex items-center justify-center text-[0.65rem] font-bold flex-shrink-0 overflow-hidden">
                {m.sender_avatar_url ? <img src={m.sender_avatar_url} className="w-full h-full object-cover" /> : (m.sender_name || '?')[0]?.toUpperCase()}
              </div>
              <div className={`max-w-[64%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${isMine ? 'bg-accent-blue text-white rounded-br-md' : 'bg-bg-card border border-border text-text-1 rounded-bl-md'}`}>
                {m.reply_to_detail && (
                  <div className={`border-l-[3px] border-accent-blue rounded-md px-2.5 py-1.5 mb-1.5 text-xs opacity-90 ${isMine ? 'bg-white/10' : 'bg-bg-alt'}`}>
                    <strong className="block text-accent-blue text-[0.7rem]">{m.reply_to_detail.sender_name}</strong>
                    {m.reply_to_detail.content}
                  </div>
                )}
                {m.attachment_url && (
                  m.attachment_is_image ? (
                    <a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} className="max-w-[220px] max-h-[220px] rounded-lg mb-1.5 object-cover" /></a>
                  ) : (
                    <a href={m.attachment_url} target="_blank" rel="noreferrer" download className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/10 mb-1.5 text-sm font-semibold">
                      <Icon name="file-pdf" />{m.attachment_name}
                    </a>
                  )
                )}
                {m.content}
                <div className={`text-[0.64rem] mt-1 text-right opacity-75 flex justify-end items-center gap-1`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => setReplyTo({ id: m.id, preview: m.content || m.attachment_name })} className="opacity-0 group-hover:opacity-100 self-center w-7 h-7 rounded-full border border-border bg-bg-card text-text-3 flex items-center justify-center flex-shrink-0">
                <Icon name="reply" size="0.85em" />
              </button>
            </div>
          )
        })}
      </div>

      {replyTo && (
        <div className="px-4.5 py-2 border-t border-border bg-bg-alt flex justify-between items-center gap-2.5 flex-shrink-0">
          <div className="text-sm text-text-2"><strong className="text-accent-blue block text-xs">Replying</strong><span className="text-text-3">{replyTo.preview}</span></div>
          <button onClick={() => setReplyTo(null)}><Icon name="times" /></button>
        </div>
      )}
      {file && (
        <div className="flex items-center gap-2 px-4.5 py-2 border-t border-border bg-bg-alt text-sm flex-shrink-0">
          <span className="flex-1 text-text-2 truncate">{'📎'} {file.name}</span>
          <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}><Icon name="times" /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3.5 border-t border-border flex items-end gap-2.5 bg-bg-card flex-shrink-0">
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full border border-border bg-bg-alt text-text-2 flex items-center justify-center flex-shrink-0">
          <Icon name="upload" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-full px-4.5 py-2.5 bg-bg-alt border border-transparent focus:bg-bg-input focus:border-accent-blue outline-none text-text-1"
        />
        <button type="submit" disabled={sending} className="w-10 h-10 rounded-full bg-accent-blue text-white flex items-center justify-center flex-shrink-0 disabled:opacity-60">
          <Icon name="paper-plane" />
        </button>
      </form>
    </div>
  )
}
