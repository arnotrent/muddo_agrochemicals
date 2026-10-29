import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

/** Centered pop-up used by every admin / portal "add" and "edit" form. Esc or a click outside closes it. */
export default function Modal({ open, onClose, title, icon, wide = false, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[4000] bg-black/55 flex items-center justify-center p-3 sm:p-5 animate-viewerIn" role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-bg-card rounded-2xl w-full ${wide ? 'max-w-[760px]' : 'max-w-[560px]'} max-h-[92vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border sticky top-0 bg-bg-card z-10 rounded-t-2xl">
          <h3 className="font-extrabold text-text-1 flex items-center gap-2">{icon && <Icon name={icon} className="text-accent-blue" />}{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-bg-alt text-text-3 flex items-center justify-center"><Icon name="times" size="1.1rem" /></button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
