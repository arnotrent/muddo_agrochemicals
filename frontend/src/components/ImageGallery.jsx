import { useMemo, useState } from 'react'
import AttachmentViewer from './chat/AttachmentViewer'
import Reveal from './Reveal'
import Icon from './Icon'
import manifest from '../data/imageManifest.json'

/**
 * MACL gallery — condensed to genuine PRODUCT photos (and product boxes/packs) only. Shows 4 at first; "Show all" expands
 * the full gallery. Images come from public/images that no page uses yet (build-time manifest) — nothing in use is touched.
 * (Any `pool` prop from older pages is ignored on purpose: there is now ONE gallery, not several.)
 */
export default function ImageGallery({ title = 'Genuine MACL Products', subtitle = 'The real packs and boxes, exactly as they reach our shelves.', initial = 4, className = '' }) {
  const all = useMemo(() => (manifest.images || []).filter((m) => m.group === 'product'), [])
  const [open, setOpen] = useState(null)
  const [expanded, setExpanded] = useState(false)
  if (!all.length) return null
  const shown = expanded ? all : all.slice(0, initial)
  const items = all.map((m) => ({
    id: m.file, name: m.caption, url: m.src, category: 'image', extension: m.file.split('.').pop(), size: null,
    uploaded_by_name: 'Muddo Agro Chemicals', uploaded_by_role: 'admin', uploaded_at: new Date().toISOString(), legacy: true,
  }))
  return (
    <section className={`py-12 ${className}`} aria-label={title}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-2.5"><Icon name="box" />Gallery</div>
          <h2 className="text-2xl font-bold text-text-1">{title}</h2>
          {subtitle && <p className="text-text-3 mt-1.5 max-w-[60ch]">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shown.map((m, i) => (
            <Reveal key={m.file} delay={Math.min(i, 8) * 40}>
              <figure className="bg-bg-card border border-border rounded-card overflow-hidden group h-full">
                <button type="button" onClick={() => setOpen(all.indexOf(m))} aria-label={`Enlarge photo: ${m.caption}`} className="block w-full aspect-square overflow-hidden bg-bg-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue">
                  <img src={m.src} alt={m.caption} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                </button>
                <figcaption className="px-3 py-2 text-xs font-semibold text-text-2 truncate">{m.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        {all.length > initial && (
          <div className="text-center mt-6">
            <button onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm inline-flex items-center gap-2 hover:text-accent-blue">
              <Icon name="chevron-down" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />{expanded ? 'Show fewer' : `Show all ${all.length} photos`}
            </button>
          </div>
        )}
      </div>
      {open !== null && <AttachmentViewer items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  )
}
