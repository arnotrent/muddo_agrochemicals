import { useEffect, useState } from 'react'
import { reviewsApi } from '../api/services'
import { Stars, StarPicker } from './StarRating'
import Icon from './Icon'

export default function ReviewsSection({ productId }) {
  const [data, setData] = useState({ summary: { average: 0, count: 0, distribution: {} }, results: [] })
  const [form, setForm] = useState({ name: '', rating: 0, comment: '', website: '' })
  const [state, setState] = useState(null) // null | 'sending' | {ok,msg}
  useEffect(() => { reviewsApi.list(productId).then(({ data }) => setData(data)).catch(() => {}) }, [productId])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.rating) return setState({ ok: false, msg: 'Please choose a star rating.' })
    setState('sending')
    try {
      const { data: r } = await reviewsApi.submit(productId, form)
      setState({ ok: true, msg: r.detail })
      setForm({ name: '', rating: 0, comment: '', website: '' })
    } catch (err) {
      const errs = err.response?.data?.errors
      const first = errs && Object.values(errs).flat()[0]
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many reviews from your connection — please try again later.' : (first || err.response?.data?.detail || 'Could not submit your review.') })
    }
  }
  const { summary, results } = data
  const inputCls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

  return (
    <section className="mt-16" aria-label="Customer reviews">
      <h2 className="text-2xl font-bold text-text-1 mb-6">Customer Reviews</h2>
      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-card p-6">
            {summary.count ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-text-1">{summary.average.toFixed(1)}</div>
                  <div><Stars value={summary.average} size={20} /><div className="text-sm text-text-3 mt-1">{summary.count} review{summary.count !== 1 ? 's' : ''}</div></div>
                </div>
                <div className="mt-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = summary.distribution[String(n)] || 0
                    return <div key={n} className="flex items-center gap-2 text-xs text-text-3"><span className="w-3">{n}</span><div className="flex-1 h-2 rounded-full bg-bg-alt overflow-hidden"><div className="h-full bg-accent-blue" style={{ width: `${summary.count ? (c / summary.count) * 100 : 0}%` }} /></div><span className="w-5 text-right">{c}</span></div>
                  })}
                </div>
              </>
            ) : <p className="text-text-3 text-sm">No reviews yet — be the first to share your experience with this product.</p>}
          </div>

          <form onSubmit={submit} className="bg-bg-card border border-border rounded-card p-6" noValidate>
            <h3 className="font-bold text-text-1 mb-4">Write a review</h3>
            {state?.msg && <div role="status" className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${state.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={state.ok ? 'check-circle' : 'exclamation-circle'} className="mt-0.5" />{state.msg}</div>}
            <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="rv-name">Your name *</label>
              <input id="rv-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
            <div className="mb-3.5"><span className="text-sm font-semibold text-text-2 block mb-1.5">Rating *</span><StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} /></div>
            <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="rv-comment">Your review *</label>
              <textarea id="rv-comment" required minLength={10} maxLength={1500} rows={4} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder="How did it work on your crop? (min. 10 characters)" className={`${inputCls} resize-y`} /></div>
            {/* honeypot — hidden from people, bots fill it in */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></label></div>
            <button disabled={state === 'sending'} className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"><Icon name="paper-plane" />{state === 'sending' ? 'Submitting…' : 'Submit review'}</button>
            <p className="text-xs text-text-3 mt-2.5">Reviews are checked by our team before they appear.</p>
          </form>
        </div>

        <div className="space-y-4">
          {results.map((r) => (
            <article key={r.id} className="bg-bg-card border border-border rounded-card p-5">
              <div className="flex items-center justify-between gap-3 mb-2"><div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-bg-alt text-accent-blue font-bold flex items-center justify-center">{r.name[0]?.toUpperCase()}</div>
                <div><div className="font-bold text-text-1 text-sm">{r.name}</div><Stars value={r.rating} size={14} /></div></div>
                <time className="text-xs text-text-3" dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</time></div>
              <p className="text-sm text-text-2 leading-relaxed whitespace-pre-wrap break-words">{r.comment}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
