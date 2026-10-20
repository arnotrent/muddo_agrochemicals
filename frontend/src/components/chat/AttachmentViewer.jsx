import { useCallback, useEffect, useRef, useState } from 'react'
import ChatIcon from './ChatIcon'
import { formatDate, formatSize, kindLabel, KIND } from './fileUtils'
import { downloadAttachment, freshUrl } from './useAttachmentUrl'

/**
 * One viewer for every file type. Images: zoom + next/previous. PDF/video/audio: native players.
 * CSV/TXT: text preview. Anything else: honest "Preview unavailable" + Download.
 * Download always serves the ORIGINAL file.
 */
export default function AttachmentViewer({ items, index, onClose, onIndex }) {
  const att = items[index]
  const [url, setUrl] = useState(att?.url)
  const [zoom, setZoom] = useState(1)
  const [text, setText] = useState(null)
  const [failed, setFailed] = useState(false)
  const closeRef = useRef(null)
  const cat = att?.category
  const isImage = cat === 'image'
  const isText = ['txt', 'csv'].includes(att?.extension)

  useEffect(() => {
    let live = true
    setZoom(1); setText(null); setFailed(false); setUrl(att.url)
    freshUrl(att).then((u) => live && setUrl(u))
    return () => { live = false }
  }, [att])

  useEffect(() => {
    if (!url || !isText) return
    let live = true
    fetch(url).then((r) => r.text()).then((t) => live && setText(t.slice(0, 200000))).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [url, isText])

  const go = useCallback((d) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && items.length > 1) go(1)
      else if (e.key === 'ArrowLeft' && items.length > 1) go(-1)
      else if ((e.key === '+' || e.key === '=') && isImage) setZoom((z) => Math.min(4, z + 0.25))
      else if (e.key === '-' && isImage) setZoom((z) => Math.max(0.5, z - 0.25))
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [go, items.length, isImage, onClose])

  if (!att) return null
  const csvRows = att.extension === 'csv' && text ? text.split(/\r?\n/).slice(0, 200).map((l) => l.split(',')) : null
  const previewable = isImage || att.extension === 'pdf' || cat === 'video' || cat === 'audio' || (isText && text != null)

  return (
    <div className="fixed inset-0 z-[5000] bg-black/80 flex flex-col animate-viewerIn" role="dialog" aria-modal="true" aria-label={`Viewing ${att.name}`} onClick={onClose}>
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-deep text-white" onClick={(e) => e.stopPropagation()}>
        <ChatIcon name={KIND[cat]?.icon || 'file'} size="1.25rem" className="text-accent-blue" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{att.name}</div>
          <div className="text-xs text-white/60">{kindLabel(att)} · {formatSize(att.size)}{items.length > 1 ? ` · ${index + 1} of ${items.length}` : ''}</div>
        </div>
        {isImage && (
          <div className="hidden sm:flex items-center gap-1">
            <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><ChatIcon name="minus" /></button>
            <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><ChatIcon name="plus" /></button>
          </div>
        )}
        <button onClick={() => downloadAttachment(att)} className="px-3 h-9 rounded-lg bg-accent-blue text-white text-sm font-bold flex items-center gap-2"><ChatIcon name="download" />Download</button>
        <button ref={closeRef} aria-label="Close viewer" onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><ChatIcon name="x" size="1.2rem" /></button>
      </div>

      <div className="flex-1 min-h-0 relative flex items-center justify-center p-3 sm:p-6" onClick={(e) => e.stopPropagation()}>
        {items.length > 1 && (
          <>
            <button aria-label="Previous file" onClick={() => go(-1)} className="absolute left-2 sm:left-5 z-10 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"><ChatIcon name="left" size="1.4rem" /></button>
            <button aria-label="Next file" onClick={() => go(1)} className="absolute right-2 sm:right-5 z-10 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"><ChatIcon name="right" size="1.4rem" /></button>
          </>
        )}
        {isImage && !failed && (
          <div className="w-full h-full overflow-auto flex items-center justify-center">
            <img src={url} alt={att.name} onError={() => setFailed(true)} style={{ transform: `scale(${zoom})`, transition: 'transform .15s' }} className="max-w-full max-h-full object-contain select-none" draggable={false} />
          </div>
        )}
        {att.extension === 'pdf' && <iframe title={att.name} src={url} className="w-full h-full rounded-lg bg-white" />}
        {cat === 'video' && <video src={url} controls playsInline className="max-w-full max-h-full rounded-lg bg-black" />}
        {cat === 'audio' && (
          <div className="bg-bg-card rounded-2xl p-8 w-full max-w-[460px] text-center">
            <ChatIcon name="music" size="3rem" className="text-accent-blue mb-3" />
            <div className="font-bold text-text-1 mb-4 break-all">{att.name}</div>
            <audio src={url} controls className="w-full" />
          </div>
        )}
        {att.extension === 'txt' && text != null && <pre className="w-full h-full overflow-auto bg-bg-card text-text-1 rounded-lg p-4 text-sm whitespace-pre-wrap break-words">{text}</pre>}
        {csvRows && (
          <div className="w-full h-full overflow-auto bg-bg-card rounded-lg">
            <table className="text-xs text-text-1 border-collapse"><tbody>
              {csvRows.map((r, i) => <tr key={i} className={i === 0 ? 'font-bold bg-bg-alt' : ''}>{r.map((c, j) => <td key={j} className="border border-border px-2 py-1 whitespace-nowrap">{c}</td>)}</tr>)}
            </tbody></table>
          </div>
        )}
        {(failed || !previewable) && (
          <div className="bg-bg-card rounded-2xl p-8 w-full max-w-[420px] text-center">
            <ChatIcon name={KIND[cat]?.icon || 'file'} size="3rem" className="text-text-3 mb-3" />
            <h3 className="font-bold text-text-1 mb-1">Preview unavailable</h3>
            <p className="text-sm text-text-3 mb-5">{failed ? 'This file could not be loaded.' : 'This file type cannot be displayed directly.'}</p>
            <button onClick={() => downloadAttachment(att)} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm inline-flex items-center gap-2"><ChatIcon name="download" />Download File</button>
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-bg-deep text-white/70 text-xs flex flex-wrap gap-x-5" onClick={(e) => e.stopPropagation()}>
        <span>Uploaded by: <strong className="text-white">{att.uploaded_by_name} — {att.uploaded_by_role === 'admin' ? 'Admin' : 'Agent'}</strong></span>
        <span>Uploaded: <strong className="text-white">{formatDate(att.uploaded_at)}</strong></span>
      </div>
    </div>
  )
}
