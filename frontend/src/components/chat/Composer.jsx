import { useEffect, useMemo, useRef, useState } from 'react'
import ChatIcon from './ChatIcon'
import EmojiPicker from './EmojiPicker'
import { ACCEPT, MAX_FILES, categoryOf, formatSize, KIND, precheck, extOf } from './fileUtils'

function Chip({ file, onRemove, progress, state }) {
  const cat = categoryOf(file.name)
  const url = useMemo(() => (cat === 'image' ? URL.createObjectURL(file) : null), [file, cat])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])
  return (
    <div className="relative flex items-center gap-2.5 bg-bg-card border border-border rounded-xl p-2 pr-8 w-[230px] flex-shrink-0 animate-msgIn">
      {url
        ? <img src={url} alt={file.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
        : <span className="w-11 h-11 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><ChatIcon name={KIND[cat]?.icon || 'file'} size="1.3rem" /></span>}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-text-1 truncate" title={file.name}>{file.name}</div>
        <div className="text-[0.68rem] text-text-3">{extOf(file.name).toUpperCase()} · {formatSize(file.size)}</div>
        {state === 'sending' && (
          <div className="mt-1"><div className="h-1 rounded-full bg-bg-alt overflow-hidden"><div className="h-full bg-accent-blue transition-[width] duration-200" style={{ width: `${progress || 0}%` }} /></div>
            <div className="text-[0.64rem] text-text-3 mt-0.5">Uploading… {progress || 0}%</div></div>
        )}
      </div>
      {state !== 'sending' && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full hover:bg-bg-alt text-text-3 flex items-center justify-center"><ChatIcon name="x" size="0.9em" /></button>
      )}
    </div>
  )
}

export default function Composer({ onSend, disabled, replyTo, onCancelReply, externalFiles, onExternalConsumed }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileRef = useRef(null)
  const imgRef = useRef(null)
  const taRef = useRef(null)
  const wrapRef = useRef(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 400))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const add = (list) => {
    const incoming = Array.from(list || [])
    if (!incoming.length) return
    const ok = []
    let err = ''
    for (const f of incoming) {
      const p = precheck(f)
      if (p) { err = p; continue }
      if (files.length + ok.length >= MAX_FILES) { err = `You can attach up to ${MAX_FILES} files per message.`; break }
      if (![...files, ...ok].some((x) => x.name === f.name && x.size === f.size)) ok.push(f)
    }
    setError(err)
    if (ok.length) setFiles((p) => [...p, ...ok])
  }

  useEffect(() => { if (externalFiles?.length) { add(externalFiles); onExternalConsumed?.() } }, [externalFiles]) // eslint-disable-line

  useEffect(() => {
    const t = taRef.current
    if (t) { t.style.height = '44px'; t.style.height = `${Math.min(Math.max(t.scrollHeight, 44), 140)}px` }
  }, [text, narrow])

  // Insert at the caret (or replace the selection), then put the caret right after the emoji.
  const insertEmoji = (emoji) => {
    const t = taRef.current
    const start = t?.selectionStart ?? text.length
    const end = t?.selectionEnd ?? text.length
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, 5000)
    setText(next)
    requestAnimationFrame(() => { if (t) { t.focus(); const pos = Math.min(start + emoji.length, next.length); t.setSelectionRange(pos, pos) } })
  }

  const submit = async (e) => {
    e?.preventDefault()
    const content = text.trim()
    if (disabled || (!content && !files.length)) return
    const payload = { content, files, replyTo: replyTo?.id }
    setText(''); setFiles([]); setError(''); setEmojiOpen(false); onCancelReply?.()
    if (fileRef.current) fileRef.current.value = ''
    if (imgRef.current) imgRef.current.value = ''
    await onSend(payload)
  }

  const onPaste = (e) => {
    const pasted = Array.from(e.clipboardData?.files || [])
    if (pasted.length) { e.preventDefault(); add(pasted) }
  }

  const textarea = (extra) => (
    <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} onPaste={onPaste} rows={1} maxLength={5000} aria-label="Write a message"
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
      placeholder="Write a message…" {...extra}
      className={`resize-none rounded-2xl px-4 py-2.5 bg-bg-alt border border-transparent focus:bg-bg-input focus:border-accent-blue outline-none text-text-1 leading-snug [overflow-wrap:anywhere] ${narrow ? 'w-full min-w-0' : ''}`} />
  )
  const btn = 'w-10 h-10 rounded-full border border-border bg-bg-alt text-text-2 hover:text-accent-blue flex items-center justify-center flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue'

  return (
    <div ref={wrapRef} className="border-t border-border bg-bg-card flex-shrink-0 min-w-0 relative">
      {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
      {replyTo && (
        <div className="px-4 py-2 border-b border-border bg-bg-alt flex justify-between items-center gap-2.5">
          <div className="text-sm text-text-2 min-w-0"><strong className="text-accent-blue block text-xs">Replying to {replyTo.name}</strong><span className="text-text-3 truncate block">{replyTo.preview}</span></div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="text-text-3"><ChatIcon name="x" /></button>
        </div>
      )}
      {error && <div role="alert" className="px-4 py-2 bg-accent-red/10 text-accent-red text-xs flex items-center gap-2"><ChatIcon name="alert" />{error}<button type="button" className="ml-auto" onClick={() => setError('')} aria-label="Dismiss"><ChatIcon name="x" /></button></div>}
      {files.length > 0 && (
        <div className="px-3 pt-3 flex gap-2 overflow-x-auto" aria-label="Attachments to send">
          {files.map((f, i) => <Chip key={`${f.name}-${i}`} file={f} onRemove={() => setFiles((p) => p.filter((_, j) => j !== i))} />)}
        </div>
      )}
      <form onSubmit={submit} className={`p-3 flex gap-2 ${narrow ? 'flex-col' : 'items-end'}`}>
        <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        <input ref={imgRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        {narrow && textarea({ style: { minHeight: 44 } })}
        <div className={`flex items-center gap-2 ${narrow ? '' : 'contents'}`}>
          <button type="button" data-emoji-toggle aria-label="Insert emoji" aria-expanded={emojiOpen} title="Emoji" onClick={() => setEmojiOpen((o) => !o)} className={`${btn} text-lg ${emojiOpen ? '!bg-accent-blue !text-white' : ''}`}>😊</button>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach files" title="Attach files" className={btn}><ChatIcon name="paperclip" size="1.15rem" /></button>
          <button type="button" onClick={() => imgRef.current?.click()} aria-label="Attach photos" title="Attach photos" className={btn}><ChatIcon name="image" size="1.15rem" /></button>
          {!narrow && textarea({ style: { minHeight: 44, flex: '1 1 0%', minWidth: 0 } })}
          {narrow && <span className="flex-1" />}
          <button type="submit" disabled={disabled || (!text.trim() && !files.length)} aria-label="Send message" className="w-10 h-10 rounded-full bg-accent-blue text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue"><ChatIcon name="send" /></button>
        </div>
      </form>
    </div>
  )
}
