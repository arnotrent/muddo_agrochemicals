import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../Icon'

const SLIDES = [
  { icon: 'bug', tag: 'Pesticides', img: '/images/hero_pesticides.jpg', title: 'Protection that actually holds up in the field.', desc: 'Broad-spectrum insecticides trusted by farmers across all four regions of Uganda.' },
  { icon: 'seedling', tag: 'Herbicides', img: '/images/hero_herbicides.jpg', title: 'Clear the weeds, keep the crop.', desc: 'Selective and non-selective control for even the most stubborn Couch and Kikuyu grass.' },
  { icon: 'microscope', tag: 'Fungicides', img: '/images/hero_fungicides.jpg', title: "Built for Uganda's humidity.", desc: 'Protective and curative fungicides that hold up against blight and mildew season after season.' },
  { icon: 'boxes', tag: 'Others & Equipment', img: '/images/hero_fertilizers.jpg', title: 'Everything else the farm needs.', desc: 'From basal fertilizer to a dependable knapsack sprayer — genuine, in stock, MAAIF-registered.' },
]

/** Full-screen shell for Login / Forgot / Reset: slideshow + form panel. No site header or footer. */
export default function AuthShell({ title, subtitle, children }) {
  const [slide, setSlide] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-bg">
      <div className="hidden lg:block relative overflow-hidden bg-bg-deep">
        {SLIDES.map((s, i) => (
          <div key={s.tag} aria-hidden={i !== slide}
            className={`absolute inset-0 flex items-end p-14 bg-cover bg-center transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,.25) 0%, rgba(15,23,42,.9) 100%), url('${s.img}')` }}>
            <div className="relative z-10 text-white">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-3.5"><Icon name={s.icon} />{s.tag}</div>
              <h2 className="text-4xl font-bold mb-2.5 leading-tight">{s.title}</h2>
              <p className="text-white/80 max-w-[40ch] leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
        <Link to="/" className="absolute top-9 left-14 z-10 flex items-center gap-2.5" aria-label="Muddo Agro — back to the website">
          <img src="/logo_icon.png" alt="MACL" className="h-10 rounded-lg bg-white p-0.5" />
          <span className="font-bold text-white">MUDDO AGRO</span>
        </Link>
        <div className="absolute bottom-6.5 right-14 z-20 flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.tag} onClick={() => setSlide(i)} aria-label={`Show ${s.tag} slide`}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5.5 bg-accent-blue' : 'w-1.5 bg-white/35'}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-text-2 hover:text-accent-blue">
            <Icon name="arrow-left" />Back to website
          </Link>
          <img src="/logo_icon.png" alt="" className="h-9 rounded-lg lg:hidden" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            <h1 className="text-2xl font-bold text-text-1 mb-1.5">{title}</h1>
            {subtitle && <p className="text-sm text-text-3 mb-7">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
