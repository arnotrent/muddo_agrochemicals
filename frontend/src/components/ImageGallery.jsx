import { useMemo, useState } from 'react'
import AttachmentViewer from './chat/AttachmentViewer'
import Reveal from './Reveal'
import Icon from './Icon'
import manifest from '../data/imageManifest.json'

/**
 * Shows images from public/images that no page uses yet (list generated at build time by
 * scripts/build-image-manifest.mjs). It only ADDS — nothing already in use is touched.
 * pool: 'field' | 'product' | 'banner' | 'misc' (or an array). part/of split a pool across pages.
 */
export default function ImageGallery({ pool, part = 0, of = 1, title = 'More from MACL', subtitle, max = 9, className = '', exclude }) {
  const pools = Array.isArray(pool) ? pool : [pool]
  const all = useMemo(() => (manifest.images || []).filter((m) => pools.includes(m.group)).filter((_, i) => i % of === part).filter((m) => m.file !== exclude), [pools.join(','), part, of, exclude]) // eslint-disable-line
  const [open, setOpen] = useState(null)
  const [showAll, setShowAll] = useState(false)
  if (!all.length) return null
  const shown = showAll ? all : all.slice(0, max)
  const items = all.map((m) => ({
    id: m.file, name: m.caption, url: m.src, category: 'image', extension: m.file.split('.').pop(), size: null,
    uploaded_by_name: 'Muddo Agro Chemicals', uploaded_by_role: 'admin', uploaded_at: new Date().toISOString(), legacy: true,
  }))
  return (
    <section className={`py-12 ${className}`} aria-label={title}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-2.5"><Icon name="eye" />Gallery</div>
          <h2 className="text-2xl font-bold text-text-1">{title}</h2>
          {subtitle && <p className="text-text-3 mt-1.5 max-w-[60ch]">{subtitle}</p>}
        </div>
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [&>*]:mb-4">
          {shown.map((m, i) => (
            <Reveal key={m.file} delay={Math.min(i, 8) * 40} className="break-inside-avoid">
              <figure className="bg-bg-card border border-border rounded-card overflow-hidden group">
                <button type="button" onClick={() => setOpen(all.indexOf(m))} aria-label={`Enlarge photo: ${m.caption}`} className="block w-full overflow-hidden bg-bg-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue">
                  <img src={m.src} alt={m.caption} width={m.w || undefined} height={m.h || undefined} loading="lazy" decoding="async" className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]" />
                </button>
                <figcaption className="px-3 py-2 text-xs text-text-2">{m.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        {all.length > max && !showAll && (
          <div className="text-center mt-2"><button onClick={() => setShowAll(true)} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Show all {all.length} photos</button></div>
        )}
      </div>
      {open !== null && <AttachmentViewer items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  )
}
