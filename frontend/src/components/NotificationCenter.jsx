import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import ChatIcon from './chat/ChatIcon'
import Icon from './Icon'

const ICON = { message: 'comments', enquiries: 'envelope', supply: 'truck', reviews: 'star', testimonials: 'award' }
const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : `${Math.floor(s / 3600)} h ago` }

/** Bell with badge + dropdown (recent items, sound & desktop-notification switches). */
export function NotificationBell() {
  const { total, recent, sound, perm, toggleSound, askPermission } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const nav = useNavigate()
  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away); return () => document.removeEventListener('mousedown', away)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${total ? `, ${total} pending` : ''}`} aria-expanded={open}
        className="relative w-8.5 h-8.5 rounded-lg border border-border flex items-center justify-center text-text-2 hover:text-accent-blue">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {total > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-white text-[0.64rem] font-bold flex items-center justify-center">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(340px,92vw)] bg-bg-card border border-border rounded-2xl shadow-xl z-[3000] overflow-hidden animate-viewerIn">
          <div className="px-4 py-3 border-b border-border font-bold text-text-1 text-sm">Notifications</div>
          <div className="max-h-[320px] overflow-y-auto">
            {recent.length ? recent.map((n) => (
              <button key={n.toastId} onClick={() => { setOpen(false); nav(n.link) }} className="w-full text-left px-4 py-3 border-b border-border hover:bg-bg-alt flex gap-3">
                <span className="w-8 h-8 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name={ICON[n.type] || 'bolt'} /></span>
                <span className="min-w-0"><span className="block text-sm font-bold text-text-1 truncate">{n.title}</span><span className="block text-xs text-text-3 truncate">{n.body}</span><span className="block text-[0.66rem] text-text-4 mt-0.5">{ago(n.at)}</span></span>
              </button>
            )) : <div className="px-4 py-8 text-center text-sm text-text-3">You're all caught up.</div>}
          </div>
          <div className="p-3 flex flex-col gap-2 bg-bg-alt text-sm">
            <label className="flex items-center justify-between gap-2 text-text-2 cursor-pointer">Sound for new items<input type="checkbox" checked={sound} onChange={toggleSound} className="w-4 h-4" /></label>
            {perm === 'default' && <button onClick={askPermission} className="text-left font-semibold text-accent-blue">Enable desktop notifications</button>}
            {perm === 'denied' && <span className="text-xs text-text-3">Desktop notifications are blocked in this browser's site settings.</span>}
            {perm === 'granted' && <span className="text-xs text-accent-green font-semibold">Desktop notifications are on.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/** Stacked toasts, bottom-right. Click to jump to the item. */
export function ToastStack() {
  const { toasts, dismiss } = useNotifications()
  const nav = useNavigate()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[6000] flex flex-col gap-2.5 w-[min(360px,calc(100vw-2rem))]" role="region" aria-label="New notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.toastId} className="bg-bg-card border border-border border-l-4 border-l-accent-blue rounded-xl shadow-xl p-3.5 flex gap-3 animate-msgIn">
          <button onClick={() => { dismiss(t.toastId); nav(t.link) }} className="flex gap-3 min-w-0 flex-1 text-left">
            <span className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name={ICON[t.type] || 'bolt'} /></span>
            <span className="min-w-0"><span className="block text-sm font-bold text-text-1 truncate">{t.title}</span><span className="block text-xs text-text-3 line-clamp-2">{t.body}</span></span>
          </button>
          <button onClick={() => dismiss(t.toastId)} aria-label="Dismiss notification" className="text-text-3 self-start"><ChatIcon name="x" /></button>
        </div>
      ))}
    </div>
  )
}
