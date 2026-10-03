import { useEffect, useState } from 'react'
import { leadershipApi } from '../api/services'
import Icon from './Icon'
import Reveal from './Reveal'

/** Company Leadership. Hidden entirely until the admin has added at least one active leader. */
export default function LeadershipSection() {
  const [leaders, setLeaders] = useState([])
  useEffect(() => { leadershipApi.list().then(({ data }) => setLeaders(data.results || data)).catch(() => {}) }, [])
  if (!leaders.length) return null
  return (
    <section className="py-14 bg-bg-alt" aria-label="Company leadership">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="users" />Leadership</div>
          <h2 className="text-3xl font-bold text-text-1">The People Behind MACL</h2>
          <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">The team guiding Muddo Agro Chemicals LTD.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaders.map((l, i) => (
            <Reveal key={l.id} delay={i * 60}>
              <article className="bg-bg-card border border-border rounded-card overflow-hidden h-full">
                <div className="aspect-[4/3] bg-bg-deep flex items-center justify-center overflow-hidden">
                  {l.photo_url ? <img src={l.photo_url} alt={`${l.name}, ${l.title}`} loading="lazy" className="w-full h-full object-cover" />
                    : <div className="w-24 h-24 rounded-full bg-accent-blue text-white text-4xl font-bold flex items-center justify-center" aria-hidden="true">{l.name[0]?.toUpperCase()}</div>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-text-1 text-lg">{l.name}</h3>
                  <div className="text-sm font-semibold text-accent-blue mb-2">{l.title}</div>
                  {l.bio && <p className="text-sm text-text-2 leading-relaxed">{l.bio}</p>}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
