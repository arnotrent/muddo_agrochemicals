import { useEffect, useState } from 'react'
import { reviewsApi } from '../../api/services'
import { Stars, StarPicker } from '../../components/StarRating'
import Modal from '../../components/Modal'
import Icon from '../../components/Icon'

// approved = shown on the site · hidden = approved earlier but kept out of sight · rejected = declined · pending = awaiting a decision
const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['hidden', 'Hidden'], ['rejected', 'Rejected'], ['', 'All']]
const BADGE = { approved: 'bg-accent-green/15 text-accent-green', rejected: 'bg-accent-red/15 text-accent-red', hidden: 'bg-bg-alt text-text-3', pending: 'bg-bg-alt text-accent-blue' }
const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

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
  const setStatus = (r, s) => act(r.id, () => reviewsApi.adminSetStatus(r.id, s))
  const save = async (e) => {
    e.preventDefault(); setBusy('save'); setError('')
    try {
      await reviewsApi.adminUpdate(editor.id, { name: editor.name, rating: editor.rating, comment: editor.comment })
      setEditor(null); load()
    } catch (err) { const errs = err.response?.data?.errors; setError((errs && Object.values(errs).flat()[0]) || 'Could not save the changes.') } finally { setBusy(null) }
  }
  const small = 'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-transform hover:-translate-y-0.5'

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="star" />Product Reviews</h1>
      {error && <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">{error}</div>}
      <div className="flex gap-2 mb-2 flex-wrap">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${tab === v ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}{v && counts[v] ? ` (${counts[v]})` : ''}</button>)}
      </div>
      <p className="text-xs text-text-3 mb-4">Only <strong>Approved</strong> reviews appear on the website. <strong>Hidden</strong> reviews are kept but not shown; you can show them again any time.</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="bg-bg-card border border-border rounded-card p-4 transition-colors hover:border-accent-blue/60">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div><strong className="text-text-1">{r.name}</strong> <span className="text-text-3 text-sm">on</span> <strong className="text-accent-blue">{r.product_name}</strong></div>
              <div className="flex items-center gap-3"><Stars value={r.rating} /><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${BADGE[r.status] || BADGE.pending}`}>{r.status}</span></div>
            </div>
            <p className="text-sm text-text-2 whitespace-pre-wrap break-words mb-3">{r.comment}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-3 mr-auto">{new Date(r.created_at).toLocaleString()}</span>
              {r.status !== 'approved' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'approved')} className={`${small} bg-accent-green text-bg-deep`}><Icon name="check" />{r.status === 'hidden' ? 'Show on site' : 'Approve'}</button>}
              {r.status === 'approved' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'hidden')} className={`${small} bg-bg-alt text-text-2`}><Icon name="eye-slash" />Hide</button>}
              {r.status !== 'rejected' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'rejected')} className={`${small} bg-bg-alt text-text-2`}><Icon name="times" />Decline</button>}
              <button onClick={() => setEditor({ id: r.id, name: r.name, rating: r.rating, comment: r.comment, product_name: r.product_name })} className={`${small} bg-bg-alt text-text-2`}><Icon name="edit" />Edit</button>
              <button disabled={busy === r.id} onClick={() => confirm('Delete this review permanently?') && act(r.id, () => reviewsApi.adminDelete(r.id))} className={`${small} border border-accent-red text-accent-red`} aria-label="Delete review"><Icon name="trash" /></button>
            </div>
          </article>
        ))}
        {!rows.length && <div className="bg-bg-card border border-border rounded-card p-10 text-center text-text-3">No {tab || ''} reviews.</div>}
      </div>

      <Modal open={!!editor} onClose={() => setEditor(null)} title={`Edit review — ${editor?.product_name || ''}`} icon="edit">
        {editor && (
          <form onSubmit={save}>
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Reviewer name</label>
            <input required minLength={2} maxLength={80} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className={`${cls} mb-3.5`} />
            <span className="text-sm font-semibold text-text-2 block mb-1.5">Rating</span>
            <div className="mb-3.5"><StarPicker value={editor.rating} onChange={(rating) => setEditor({ ...editor, rating })} size={28} /></div>
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Review text</label>
            <textarea required minLength={10} maxLength={1500} rows={6} value={editor.comment} onChange={(e) => setEditor({ ...editor, comment: e.target.value })} className={`${cls} resize-y mb-5`} />
            <div className="flex gap-2.5"><button disabled={busy === 'save'} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{busy === 'save' ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setEditor(null)} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button></div>
          </form>
        )}
      </Modal>
    </div>
  )
}
