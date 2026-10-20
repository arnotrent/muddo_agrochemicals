import { Link } from 'react-router-dom'

/**
 * Page header with a real photo behind the text and an optional framed image on the right.
 * Uses <img> (not CSS backgrounds) so images get srcset, lazy/priority hints and no blur from upscaling.
 */
export default function PageHero({ bg, bgSet, side, eyebrow, icon, title, subtitle, crumbs = [], children, narrow = false, tone = 'deep' }) {
  return (
    <section className="relative overflow-hidden bg-bg-deep isolate">
      {bg && (
        <img src={bg} srcSet={bgSet} sizes="100vw" alt="" aria-hidden="true" fetchpriority="high" decoding="async"
          className="absolute inset-0 w-full h-full object-cover -z-20" />
      )}
      <div className={`absolute inset-0 -z-10 ${tone === 'deep'
        ? 'bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/80 to-[#0F172A]/45'
        : 'bg-gradient-to-b from-[#0F172A]/70 to-[#0F172A]/90'}`} />
      <div className={`${narrow ? 'max-w-[760px]' : 'max-w-[1240px]'} mx-auto px-4 sm:px-6 py-12 sm:py-16 relative grid ${side ? 'lg:grid-cols-[1.15fr_1fr] gap-10 items-center' : ''}`}>
        <div>
          {crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="text-xs text-white/65 mb-3">
              {crumbs.map(([label, to], i) => (
                <span key={label}>{i > 0 && ' / '}{to ? <Link to={to} className="text-white/75 hover:text-white">{label}</Link> : <span className="text-accent-blue font-bold">{label}</span>}</span>
              ))}
            </nav>
          )}
          {eyebrow && <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-3.5">{icon}{eyebrow}</div>}
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-white/85 max-w-[56ch] mt-3 leading-relaxed">{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
        {side && (
          <figure className="hidden lg:block justify-self-end w-full max-w-[420px]">
            <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white/5 rotate-[1.2deg]">
              <img src={side.src} alt={side.alt} width={side.w} height={side.h} loading="eager" decoding="async" className="w-full h-auto max-h-[300px] object-cover" />
            </div>
            {side.caption && <figcaption className="text-xs text-white/70 mt-2.5 text-center">{side.caption}</figcaption>}
          </figure>
        )}
      </div>
    </section>
  )
}
