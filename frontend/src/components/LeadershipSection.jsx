import { useEffect, useState } from 'react'
import { leadershipApi } from '../api/services'
import Avatar from './Avatar'
import Icon from './Icon'
import Reveal from './Reveal'

/**
 * Company leadership — each person appears ONCE: photo, name, title, bio and (if written) their personal greeting,
 * together on one card. Hidden entirely until the admin has added at least one active leader.
 */
export default function LeadershipSection({ intro }) {
  const [leaders, setLeaders] = useState([])
  useEffect(() => { leadershipApi.list().then(({ data }) => setLeaders(data.results || data)).catch(() => {}) }, [])
  if (!leaders.length) return null

  return (
    <section className="py-14 bg-bg-alt" aria-label="Company leadership">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="users" />Leadership</div>
          <h2 className="text-3xl font-bold text-text-1">The People Behind MACL</h2>
          {intro && <p className="text-text-2 max-w-[70ch] mx-auto mt-3 leading-relaxed">{intro}</p>}
        </div>
        <div className="grid gap-6">
          {leaders.map((l, i) => (
            <Reveal key={l.id} delay={i * 60}>
              <article className="bg-bg-card border border-border rounded-card overflow-hidden grid sm:grid-cols-[240px_1fr]">
                <div className="bg-bg-deep min-h-[220px] flex items-center justify-center overflow-hidden">
                  <LeaderPhoto leader={l} />
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="font-bold text-text-1 text-xl">{l.name}</h3>
                  <div className="text-sm font-semibold text-accent-blue mb-3">{l.title}</div>
                  {l.bio && <p className="text-sm text-text-2 leading-relaxed mb-4">{l.bio}</p>}
                  {l.greeting && (
                    <blockquote className="border-l-[3px] border-accent-blue pl-4 text-text-2 leading-relaxed whitespace-pre-line break-words">
                      {l.greeting}
                    </blockquote>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function LeaderPhoto({ leader }) {
  const [failed, setFailed] = useState(false)
  if (leader.photo_url && !failed) {
    return <img src={leader.photo_url} alt={`${leader.name}, ${leader.title}`} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />
  }
  return <Avatar name={leader.name} className="w-28 h-28" textClass="text-3xl" alt="" />
}
