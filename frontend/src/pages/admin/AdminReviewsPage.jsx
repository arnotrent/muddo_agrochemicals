import { useEffect, useState } from 'react'
import { reviewsApi } from '../../api/services'
import { Stars } from '../../components/StarRating'
import Icon from '../../components/Icon'

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]

export default function AdminReviewsPage() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    reviewsApi.adminList({ status: tab || undefined, page_size: 200 }).then(({ data }) => setRows(data.results || data)).catch(() => setError('Could not load reviews.'))
    reviewsApi.adminList({ page_size: 500 }).then(({ data }) => {
      const c = {}; (data.results || data).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 }); setCounts(c)
    }).catch(() => {})
  }
  useEffect(() => { load() }, [tab]) // eslint-disable-line

  const act = async (id, fn) => { setBusy(id); setError(''); try { await fn(); load() } catch { setError('Action failed — please try again.') } finally { setBusy(null) } }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="star" />Product Reviews</h1>
      {error && <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">{error}</div>}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${tab === v ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}{v && counts[v] ? ` (${counts[v]})` : ''}</button>)}
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="bg-bg-card border border-border rounded-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div><strong className="text-text-1">{r.name}</strong> <span className="text-text-3 text-sm">on</span> <strong className="text-accent-blue">{r.product_name}</strong></div>
              <div className="flex items-center gap-3"><Stars value={r.rating} /><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'approved' ? 'bg-accent-green/15 text-accent-green' : r.status === 'rejected' ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-alt text-accent-blue'}`}>{r.status}</span></div>
            </div>
            <p className="text-sm text-text-2 whitespace-pre-wrap break-words mb-3">{r.comment}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-3 mr-auto">{new Date(r.created_at).toLocaleString()}</span>
              {r.status !== 'approved' && <button disabled={busy === r.id} onClick={() => act(r.id, () => reviewsApi.adminSetStatus(r.id, 'approved'))} className="px-3 py-1.5 rounded-lg bg-accent-green text-bg-deep text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"><Icon name="check" />Approve</button>}
              {r.status !== 'rejected' && <button disabled={busy === r.id} onClick={() => act(r.id, () => reviewsApi.adminSetStatus(r.id, 'rejected'))} className="px-3 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"><Icon name="times" />Reject</button>}
              <button disabled={busy === r.id} onClick={() => confirm('Delete this review permanently?') && act(r.id, () => reviewsApi.adminDelete(r.id))} className="px-3 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs font-bold disabled:opacity-60" aria-label="Delete review"><Icon name="trash" /></button>
            </div>
          </article>
        ))}
        {!rows.length && <div className="bg-bg-card border border-border rounded-card p-10 text-center text-text-3">No {tab || ''} reviews.</div>}
      </div>
    </div>
  )
}
