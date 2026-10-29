import { useEffect, useMemo, useState } from 'react'
import { testimonialsApi } from '../api/services'
import { Stars } from './StarRating'
import Avatar from './Avatar'
import FeedbackModal from './FeedbackModal'
import Icon from './Icon'
import Reveal from './Reveal'

export default function TestimonialsSection() {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => { testimonialsApi.list().then(({ data }) => setItems(data.results || data)).catch(() => {}).finally(() => setLoaded(true)) }, [])
  const rated = useMemo(() => items.filter((t) => t.rating), [items])
  const avg = rated.length ? rated.reduce((a, t) => a + t.rating, 0) / rated.length : 0
  if (!loaded) return null
  return (
    <section className="py-16" aria-label="Customer testimonials">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="comments" />Testimonials</div>
          <h2 className="text-3xl font-bold text-text-1">What Farmers Say</h2>
          <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">Real experiences from the people who grow with MACL products.</p>
          {avg > 0 && <div className="mt-4 inline-flex items-center gap-2.5"><Stars value={avg} size={22} animate /><span className="font-bold text-text-1">{avg.toFixed(1)}</span><span className="text-sm text-text-3">from {rated.length} rating{rated.length !== 1 ? 's' : ''}</span></div>}
        </Reveal>
        {items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i, 5) * 80} className="h-full">
                <figure className="group relative overflow-hidden bg-bg-card border border-border rounded-card p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-accent-blue">
                  <span aria-hidden="true" className="absolute -top-2 right-4 text-8xl leading-none font-serif text-accent-blue/10 transition-all duration-500 group-hover:text-accent-blue/25 group-hover:-translate-y-1 select-none">”</span>
                  {t.rating ? <Stars value={t.rating} size={16} animate /> : null}
                  <blockquote className="text-text-2 leading-relaxed mt-3 flex-1 break-words relative">“{t.message}”</blockquote>
                  <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                    <span className="rounded-full transition-all duration-300 group-hover:ring-2 group-hover:ring-accent-blue group-hover:ring-offset-2 group-hover:ring-offset-bg-card"><Avatar src={t.photo_url} name={t.name} /></span>
                    <div className="min-w-0"><div className="font-bold text-text-1 text-sm truncate">{t.name}</div>
                      <div className="text-xs text-text-3 truncate">{[t.role, t.product_name].filter(Boolean).join(' · ')}</div></div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          {!items.length && <p className="text-text-3 mb-4">Be the first to share how MACL products worked for you.</p>}
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-7 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue hover:bg-accent-blue-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-300"><Icon name="comments" />Give feedback</button>
        </div>
      </div>
      <FeedbackModal open={open} onClose={() => setOpen(false)} mode="site" />
    </section>
  )
}
