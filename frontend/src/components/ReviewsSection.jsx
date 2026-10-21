import { useEffect, useState } from 'react'
import { reviewsApi } from '../api/services'
import { Stars } from './StarRating'
import FeedbackModal from './FeedbackModal'
import Icon from './Icon'


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

export default function ReviewsSection({ productId, productName = 'this product' }) {
  const [data, setData] = useState({ summary: { average: 0, count: 0, distribution: {} }, results: [] })
  const [open, setOpen] = useState(false)
  useEffect(() => { reviewsApi.list(productId).then(({ data }) => setData(data)).catch(() => {}) }, [productId])
  return (
    <section className="mt-16" aria-label="Customer reviews">
      <h2 className="text-2xl font-bold text-text-1 mb-6">Customer Reviews</h2>
      <div className="grid lg:grid-cols-[340px_1fr] gap-8">
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-card p-6"><RatingSummary summary={data.summary} /></div>
          <div className="bg-bg-card border border-border rounded-card p-6">
            <h3 className="font-bold text-text-1 mb-1.5">Used {productName}?</h3>
            <p className="text-sm text-text-3 mb-4">Tell other farmers how it worked for you. It takes about a minute.</p>
            <button onClick={() => setOpen(true)} className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2"><Icon name="comments" />Give feedback</button>
          </div>
        </div>
        <div className="space-y-4">{data.results.map((r) => <ReviewCard key={r.id} r={r} />)}</div>
      </div>
      <FeedbackModal open={open} onClose={() => setOpen(false)} mode="product" product={{ id: productId, name: productName }} />
    </section>
  )
}
