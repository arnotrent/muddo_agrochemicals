import { useState } from 'react'
import AttachmentViewer from './chat/AttachmentViewer'
import Reveal from './Reveal'
import Icon from './Icon'

/** Responsive photo gallery with a keyboard-accessible lightbox (reuses the chat viewer). */
export default function FieldGallery({ photos, title = 'In the Field', subtitle, className = '' }) {
  const [open, setOpen] = useState(null)
  if (!photos?.length) return null
  const items = photos.map((p) => ({
    id: p.id, name: p.caption, url: p.src, category: 'image', extension: 'jpg', size: null,
    uploaded_by_name: 'Muddo Agro Chemicals', uploaded_by_role: 'admin', uploaded_at: new Date().toISOString(), legacy: true,
  }))
  const layout = photos.length === 1 ? 'grid-cols-1 max-w-[900px]' : photos.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <section className={`py-12 ${className}`} aria-label={title}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-2.5"><Icon name="eye" />Gallery</div>
          <h2 className="text-2xl font-bold text-text-1">{title}</h2>
          {subtitle && <p className="text-text-3 mt-1.5 max-w-[60ch]">{subtitle}</p>}
        </div>
        <div className={`grid grid-cols-1 ${layout} gap-5 ${photos.length === 1 ? 'mx-auto' : ''}`}>
          {photos.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <figure className="bg-bg-card border border-border rounded-card overflow-hidden group h-full flex flex-col">
                <button type="button" onClick={() => setOpen(i)} aria-label={`Enlarge photo: ${p.caption}`} className="block overflow-hidden bg-bg-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue">
                  <img src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" className="w-full h-auto max-h-[460px] object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </button>
                <figcaption className="p-3.5 text-sm text-text-2">{p.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
      {open !== null && <AttachmentViewer items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  )
}
