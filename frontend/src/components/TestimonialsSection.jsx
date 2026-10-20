import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { testimonialsApi } from '../api/services'
import { Stars } from './StarRating'
import Avatar from './Avatar'
import ShareExperience from './ShareExperience'
import MyReviews from './MyReviews'
import Icon from './Icon'
import Reveal from './Reveal'

export default function TestimonialsSection({ showAllLink = true }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { testimonialsApi.list().then(({ data }) => setItems(data.results || data)).catch(() => {}).finally(() => setLoaded(true)) }, [])
  const avg = useMemo(() => { const r = items.filter((t) => t.rating); return r.length ? r.reduce((a, t) => a + t.rating, 0) / r.length : 0 }, [items])
  if (!loaded) return null
  return (
    <section className="py-16" aria-label="Customer testimonials">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="comments" />Reviews</div>
          <h2 className="text-3xl font-bold text-text-1">What Farmers Say</h2>
          <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">Real experiences from the people who grow with MACL products.</p>
          {avg > 0 && <div className="mt-4 inline-flex items-center gap-2.5"><Stars value={avg} size={22} /><span className="font-bold text-text-1">{avg.toFixed(1)}</span><span className="text-sm text-text-3">from {items.filter((t) => t.rating).length} rating{items.filter((t) => t.rating).length !== 1 ? 's' : ''}</span></div>}
        </div>
        {items.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.slice(0, 6).map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i, 5) * 60}>
                <figure className="bg-bg-card border border-border rounded-card p-6 h-full flex flex-col hover:border-accent-blue transition-colors">
                  {t.rating ? <Stars value={t.rating} size={16} /> : null}
                  <blockquote className="text-text-2 leading-relaxed mt-3 flex-1 break-words">“{t.message}”</blockquote>
                  <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                    <Avatar src={t.photo_url} name={t.name} />
                    <div className="min-w-0"><div className="font-bold text-text-1 text-sm truncate">{t.name}</div>
                      <div className="text-xs text-text-3 truncate">{[t.role, t.product_name].filter(Boolean).join(' · ')}</div></div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        ) : <p className="text-center text-text-3">Be the first to share how MACL products worked for you.</p>}
        {showAllLink && items.length > 0 && <div className="text-center mt-7"><Link to="/reviews" className="text-sm font-bold text-accent-blue">See all reviews &rarr;</Link></div>}

        <div className="mt-12"><ShareExperience /></div>
        <MyReviews kind="testimonial" className="mt-6" />
      </div>
    </section>
  )
}
