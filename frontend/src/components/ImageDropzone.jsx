import { useEffect, useRef, useState } from 'react'
import ChatIcon from './chat/ChatIcon'

const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

export function checkImage(file) {
  if (!file) return 'No file received.'
  if (!TYPES.includes(file.type)) return 'Please use a JPG, PNG, WEBP or GIF image.'
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_BYTES) return 'That image is over 5 MB — please use a smaller one.'
  return ''
}

/**
 * One image picker for the whole site: drag & drop, click to browse, paste (Ctrl+V) or "Paste a link".
 *  - file / onFile ............ the chosen File (null when none)
 *  - existingUrl .............. picture already saved (shown until replaced); onRemoveExisting makes it removable
 *  - onLink / linkValue ....... OPTIONAL. When given, a pasted link is stored as text (products' image_url).
 *                               Without it the link is downloaded in the browser and turned into a File, so every
 *                               image still goes through the server's normal upload checks.
 */
export default function ImageDropzone({ file, onFile, existingUrl = null, onRemoveExisting, onLink, linkValue = '', shape = 'square', label = 'Add a photo', hint = 'JPG, PNG, WEBP or GIF · up to 5 MB' }) {
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)
  const depth = useRef(0)

  useEffect(() => {
    if (!file) { setPreview(null); return undefined }
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const typedLink = /^(https?:\/\/|\/)/i.test(linkValue || '') ? linkValue : null
  const shown = preview || typedLink || existingUrl
  const canRemove = !!(file || typedLink || (existingUrl && onRemoveExisting))

  const take = (f) => {
    const m = checkImage(f)
    if (m) { setErr(m); return }
    setErr(''); onLink?.(''); setLinkOpen(false); onFile(f)
  }

  const fromLink = async (raw) => {
    const url = (raw || '').trim()
    if (!/^https?:\/\//i.test(url)) { setErr('Paste a full image link starting with https://'); return }
    setErr('')
    if (onLink) { onFile(null); onLink(url); setLink(''); setLinkOpen(false); return }
    setBusy(true)
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (!res.ok) throw new Error('bad status')
      const blob = await res.blob()
      const type = (blob.type || '').split(';')[0]
      if (!TYPES.includes(type)) throw new Error('not an image')
      take(new File([blob], `photo.${EXT[type]}`, { type }))
      setLink('')
    } catch {
      setErr('We couldn’t copy that image from the link (the website may block it). Save the image to your device and drop it here instead.')
    } finally { setBusy(false) }
  }

  const remove = () => {
    setErr('')
    if (file) onFile(null)
    else if (typedLink) onLink?.('')
    else onRemoveExisting?.()
  }

  const drop = (e) => {
    e.preventDefault(); depth.current = 0; setOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) { take(f); return }
    const u = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain')
    if (u) fromLink(u.split('\n')[0])
  }
  const paste = (e) => {
    const f = Array.from(e.clipboardData?.files || [])[0]
    if (f) { e.preventDefault(); take(f); return }
    const t = (e.clipboardData?.getData('text') || '').trim()
    if (/^https?:\/\//i.test(t)) { e.preventDefault(); fromLink(t) }
  }
  const round = shape === 'round'
  const btn = 'px-3 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs font-bold hover:text-accent-blue transition-colors'

  return (
    <div>
      <div role="button" tabIndex={0} aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
        onDragEnter={(e) => { e.preventDefault(); depth.current++; setOver(true) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false) }}
        onDrop={drop} onPaste={paste}
        className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 outline-none focus-visible:border-accent-blue ${over ? 'border-accent-blue bg-accent-blue/10 scale-[1.01]' : 'border-border bg-bg-alt/40 hover:border-accent-blue'}`}>
        <div className={`w-20 h-20 flex-shrink-0 overflow-hidden bg-bg-alt border border-border flex items-center justify-center text-text-3 ${round ? 'rounded-full' : 'rounded-xl'}`}>
          {shown ? <img src={shown} alt="Selected" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <ChatIcon name="image" size="1.9rem" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-text-1">{shown ? 'Replace photo' : label}</div>
          <div className="text-xs text-text-3">{over ? 'Drop it here…' : 'Drag & drop, click to browse, or paste an image.'}</div>
          <div className="text-[0.7rem] text-text-4 mt-0.5">{hint}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button type="button" onClick={() => setLinkOpen((o) => !o)} aria-expanded={linkOpen} className={btn}>Paste a link</button>
        {canRemove && <button type="button" onClick={remove} className={`${btn} !text-accent-red`}>Remove</button>}
      </div>
      {linkOpen && (
        <div className="flex gap-2 mt-2 animate-viewerIn">
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/photo.jpg" aria-label="Image link"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fromLink(link) } }}
            className="flex-1 min-w-0 px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm outline-none focus:border-accent-blue" />
          <button type="button" disabled={busy || !link.trim()} onClick={() => fromLink(link)} className="px-4 py-2 rounded-btn bg-accent-blue text-white text-sm font-bold disabled:opacity-60">{busy ? 'Fetching…' : 'Use link'}</button>
        </div>
      )}
      {err && <p role="alert" className="text-xs text-accent-red mt-1.5">{err}</p>}
      <input ref={inputRef} type="file" accept={TYPES.join(',')} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); e.target.value = '' }} />
    </div>
  )
}
