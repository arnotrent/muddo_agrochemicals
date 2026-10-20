import { useEffect, useState } from 'react'
import { reviewsApi } from '../../api/services'
import { Stars, StarPicker } from '../../components/StarRating'
import Icon from '../../components/Icon'

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]
const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1'

export default function AdminReviewsPage() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState(null)

  const load = () => {
    reviewsApi.adminList({ status: tab || undefined, page_size: 200 }).then(({ data }) => setRows(data.results || data)).catch(() => setError('Could not load reviews.'))
    reviewsApi.adminList({ page_size: 500 }).then(({ data }) => { const c = {}; (data.results || data).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 }); setCounts(c) }).catch(() => {})
  }
  useEffect(() => { load() }, [tab]) // eslint-disable-line

  const act = async (id, fn) => { setBusy(id); setError(''); try { await fn(); load() } catch { setError('Action failed — please try again.') } finally { setBusy(null) } }
  const save = async (e) => {
    e.preventDefault(); setBusy('save'); setError('')
    try {
      await reviewsApi.adminUpdate(editor.id, { name: editor.name, rating: editor.rating, comment: editor.comment })
      setEditor(null); load()
    } catch (err) { const errs = err.response?.data?.errors; setError((errs && Object.values(errs).flat()[0]) || 'Could not save the changes.') } finally { setBusy(null) }
  }

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
              <button onClick={() => setEditor({ id: r.id, name: r.name, rating: r.rating, comment: r.comment, product_name: r.product_name })} className="px-3 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs font-bold flex items-center gap-1.5"><Icon name="edit" />Edit</button>
              <button disabled={busy === r.id} onClick={() => confirm('Delete this review permanently?') && act(r.id, () => reviewsApi.adminDelete(r.id))} className="px-3 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs font-bold disabled:opacity-60" aria-label="Delete review"><Icon name="trash" /></button>
            </div>
          </article>
        ))}
        {!rows.length && <div className="bg-bg-card border border-border rounded-card p-10 text-center text-text-3">No {tab || ''} reviews.</div>}
      </div>

      {editor && (
        <div className="fixed inset-0 z-[4000] bg-black/55 flex items-center justify-center p-4" onClick={() => setEditor(null)} role="dialog" aria-modal="true">
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-bg-card rounded-2xl p-6 w-full max-w-[520px] max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h3 className="font-extrabold text-text-1">Edit review — {editor.product_name}</h3><button type="button" onClick={() => setEditor(null)} aria-label="Close"><Icon name="times" /></button></div>
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Reviewer name</label>
            <input required minLength={2} maxLength={80} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className={`${cls} mb-3.5`} />
            <span className="text-sm font-semibold text-text-2 block mb-1.5">Rating</span>
            <div className="mb-3.5"><StarPicker value={editor.rating} onChange={(rating) => setEditor({ ...editor, rating })} size={28} /></div>
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Review text</label>
            <textarea required minLength={10} maxLength={1500} rows={6} value={editor.comment} onChange={(e) => setEditor({ ...editor, comment: e.target.value })} className={`${cls} resize-y mb-5`} />
            <div className="flex gap-2.5"><button disabled={busy === 'save'} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{busy === 'save' ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setEditor(null)} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
