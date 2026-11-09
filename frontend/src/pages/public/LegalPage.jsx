import { Link, useParams } from 'react-router-dom'
import { LEGAL, LEGAL_UPDATED } from '../../data/legal'
import NotFoundPage from './NotFoundPage'
import Icon from '../../components/Icon'

const TABS = [['copyright', 'Copyright & Licence'], ['terms', 'Terms of Use'], ['privacy', 'Privacy Policy']]

export default function LegalPage() {
  const { doc } = useParams()
  const d = LEGAL[doc]
  if (!d) return <NotFoundPage />
  return (
    <section className="py-12">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6">
        <nav aria-label="Legal documents" className="flex gap-2 flex-wrap mb-8">
          {TABS.map(([k, l]) => <Link key={k} to={`/legal/${k}`} aria-current={k === doc ? 'page' : undefined} className={`px-4 py-2 rounded-full text-sm font-bold border ${k === doc ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-card text-text-2 border-border hover:border-accent-blue'}`}>{l}</Link>)}
        </nav>
        <h1 className="text-3xl font-bold text-text-1 mb-3 flex items-center gap-2.5"><Icon name="shield-alt" className="text-accent-blue" />{d.title}</h1>
        <p className="text-text-2 leading-relaxed mb-8 font-semibold">{d.intro}</p>
        <div className="space-y-6">
          {d.sections.map(([h, body], i) => (
            <section key={h}><h2 className="font-bold text-text-1 text-lg mb-1.5">{i + 1}. {h}</h2><p className="text-text-2 leading-relaxed">{body}</p></section>
          ))}
        </div>
        <p className="text-xs text-text-3 mt-10 pt-4 border-t border-border">Last updated: {LEGAL_UPDATED}</p>
      </div>
    </section>
  )
}
