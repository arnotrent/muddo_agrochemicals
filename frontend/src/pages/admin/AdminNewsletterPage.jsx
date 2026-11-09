import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import Icon from '../../components/Icon'

const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const TABS = [['', 'All'], ['subscribed', 'Subscribed'], ['pending', 'Awaiting confirmation'], ['unsubscribed', 'Unsubscribed']]
const BADGE = { subscribed: 'bg-accent-green/15 text-accent-green', pending: 'bg-bg-alt text-accent-blue', unsubscribed: 'bg-bg-alt text-text-3' }
const LABEL = { subscribed: 'Subscribed', pending: 'Awaiting confirmation', unsubscribed: 'Unsubscribed' }

export default function AdminNewsletterPage() {
  const [subs, setSubs] = useState([])
  const [tab, setTab] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/newsletter/', { params: { page_size: 500 } }).then(({ data }) => setSubs(data.results || data)).catch(() => setError('Could not load subscribers.'))
  }, [])

  const count = (s) => subs.filter((x) => x.status === s).length
  const shown = useMemo(() => subs.filter((s) => !tab || s.status === tab), [subs, tab])
  const exportCsv = () => {
    const rows = [['email', 'name', 'status', 'consent_given', 'confirmed', 'source'],
      ...shown.map((s) => [s.email, s.name, s.status, s.consent_at || s.subscribed_at, s.confirmed_at || '', s.source || ''])]
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `newsletter-${tab || 'all'}.csv`
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="paper-plane" />Newsletter Subscribers</h1>
      {error && <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">{error}</div>}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        {[['Total', subs.length, 'text-text-1'], ['Subscribed', count('subscribed'), 'text-accent-green'], ['Awaiting confirmation', count('pending'), 'text-accent-blue'], ['Unsubscribed', count('unsubscribed'), 'text-text-3']].map(([l, v, c]) => (
          <div key={l} className="bg-bg-card border border-border rounded-card p-4.5"><div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1">{l}</div><div className={`text-3xl font-bold ${c}`}>{v}</div></div>
        ))}
      </div>
      <div className="bg-bg-card border border-border rounded-card">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">{TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${tab === v ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}</button>)}</div>
          <button onClick={exportCsv} disabled={!shown.length} className="px-4 py-2 rounded-btn bg-bg-alt text-text-2 font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="save" />Export CSV</button>
        </div>
        <p className="px-4 pt-3 text-xs text-text-3">Only people with status <strong>Subscribed</strong> agreed (and, when e-mail is configured, confirmed) to receive e-mail. Never send to the other groups. Every e-mail must include the unsubscribe link.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">#</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Consent given</th></tr></thead>
            <tbody>
              {shown.map((s, i) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="p-3 text-text-3">{i + 1}</td>
                  <td className="p-3"><a href={`mailto:${s.email}`} className="text-accent-blue font-semibold">{s.email}</a></td>
                  <td className="p-3">{s.name || '\u2014'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${BADGE[s.status]}`}>{LABEL[s.status]}</span></td>
                  <td className="p-3 text-text-3 text-xs">{new Date(s.consent_at || s.subscribed_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No subscribers here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
