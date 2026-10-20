import { useEffect, useState } from 'react'
import { reviewsApi } from '../api/services'
import { Stars, StarPicker } from './StarRating'
import MyReviews from './MyReviews'
import { addMine } from '../utils/myReviews'
import Icon from './Icon'

const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

/** Product review form. With `products` it shows a product picker (used on the Reviews page). */
export function ProductReviewForm({ productId, products, onDone }) {
  const [pid, setPid] = useState(productId || '')
  const [form, setForm] = useState({ name: '', rating: 0, comment: '', website: '' })
  const [state, setState] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (!pid) return setState({ ok: false, msg: 'Please choose the product you are reviewing.' })
    if (!form.rating) return setState({ ok: false, msg: 'Please choose a star rating.' })
    setState('sending')
    try {
      const { data } = await reviewsApi.submit(pid, form)
      const label = products?.find((p) => String(p.id) === String(pid))?.name || 'Product review'
      if (data.edit_token) addMine('product', data.edit_token, label)
      setState({ ok: true, msg: data.detail })
      setForm({ name: '', rating: 0, comment: '', website: '' })
      onDone?.()
    } catch (err) {
      const errs = err.response?.data?.errors
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many reviews from your connection — please try again later.' : (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Could not submit your review.' })
    }
  }
  return (
    <form onSubmit={submit} className="bg-bg-card border border-border rounded-card p-6" noValidate>
      <h3 className="font-bold text-text-1 mb-4">Write a review</h3>
      {state?.msg && <div role="status" className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${state.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={state.ok ? 'check-circle' : 'exclamation-circle'} className="mt-0.5" />{state.msg}</div>}
      {products && (
        <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="pr-prod">Product *</label>
          <select id="pr-prod" value={pid} onChange={(e) => setPid(e.target.value)} className={cls}><option value="">Choose a product…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      )}
      <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="rv-name">Your name *</label>
        <input id="rv-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={cls} /></div>
      <div className="mb-3.5"><span className="text-sm font-semibold text-text-2 block mb-1.5">Rating *</span><StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} /></div>
      <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="rv-comment">Your review * <span className="font-normal text-text-3">({form.comment.length}/1500)</span></label>
        <textarea id="rv-comment" required minLength={10} maxLength={1500} rows={4} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder="How did it work on your crop? (at least 10 characters)" className={`${cls} resize-y`} /></div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></label></div>
      <button disabled={state === 'sending'} className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"><Icon name="paper-plane" />{state === 'sending' ? 'Submitting…' : 'Submit review'}</button>
      <p className="text-xs text-text-3 mt-2.5">Reviews are checked by our team before they appear. You can edit or remove yours afterwards.</p>
    </form>
  )
}

export function ReviewCard({ r }) {
  return (
    <article className="bg-bg-card border border-border rounded-card p-5">
      <div className="flex items-center justify-between gap-3 mb-2"><div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-bg-alt text-accent-blue font-bold flex items-center justify-center">{r.name[0]?.toUpperCase()}</div>
        <div><div className="font-bold text-text-1 text-sm">{r.name}</div><Stars value={r.rating} size={14} /></div></div>
        <time className="text-xs text-text-3" dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</time></div>
      {r.product_name && <div className="text-xs font-semibold text-accent-blue mb-1">{r.product_name}</div>}
      <p className="text-sm text-text-2 leading-relaxed whitespace-pre-wrap break-words">{r.comment}</p>
    </article>
  )
}

export function RatingSummary({ summary }) {
  if (!summary?.count) return <p className="text-text-3 text-sm">No reviews yet — be the first to share your experience.</p>
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="text-5xl font-bold text-text-1">{summary.average.toFixed(1)}</div>
        <div><Stars value={summary.average} size={20} /><div className="text-sm text-text-3 mt-1">{summary.count} review{summary.count !== 1 ? 's' : ''}</div></div>
      </div>
      {summary.distribution && (
        <div className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = summary.distribution[String(n)] || 0
            return <div key={n} className="flex items-center gap-2 text-xs text-text-3"><span className="w-3">{n}</span><div className="flex-1 h-2 rounded-full bg-bg-alt overflow-hidden"><div className="h-full" style={{ width: `${summary.count ? (c / summary.count) * 100 : 0}%`, background: '#F5B301' }} /></div><span className="w-5 text-right">{c}</span></div>
          })}
        </div>
      )}
    </>
  )
}

export default function ReviewsSection({ productId }) {
  const [data, setData] = useState({ summary: { average: 0, count: 0, distribution: {} }, results: [] })
  useEffect(() => { reviewsApi.list(productId).then(({ data }) => setData(data)).catch(() => {}) }, [productId])
  return (
    <section className="mt-16" aria-label="Customer reviews">
      <h2 className="text-2xl font-bold text-text-1 mb-6">Customer Reviews</h2>
      <div className="grid lg:grid-cols-[340px_1fr] gap-8">
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-card p-6"><RatingSummary summary={data.summary} /></div>
          <ProductReviewForm productId={productId} />
          <MyReviews kind="product" />
        </div>
        <div className="space-y-4">{data.results.map((r) => <ReviewCard key={r.id} r={r} />)}</div>
      </div>
    </section>
  )
}
