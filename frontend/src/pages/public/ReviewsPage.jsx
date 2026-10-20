import { useEffect, useMemo, useState } from 'react'
import { testimonialsApi, productsApi } from '../../api/services'
import { communityApi } from '../../api/community'
import PageHero from '../../components/PageHero'
import { Stars } from '../../components/StarRating'
import Avatar from '../../components/Avatar'
import ShareExperience from '../../components/ShareExperience'
import MyReviews from '../../components/MyReviews'
import { ProductReviewForm, ReviewCard, RatingSummary } from '../../components/ReviewsSection'
import Icon from '../../components/Icon'

export default function ReviewsPage() {
  const [tab, setTab] = useState('site')
  const [site, setSite] = useState([])
  const [prod, setProd] = useState({ summary: { average: 0, count: 0, distribution: {} }, results: [] })
  const [products, setProducts] = useState([])
  useEffect(() => {
    testimonialsApi.list().then(({ data }) => setSite(data.results || data)).catch(() => {})
    communityApi.recentProductReviews().then(({ data }) => setProd(data)).catch(() => {})
    productsApi.list({ page_size: 200 }).then(({ data }) => setProducts(data.results || data)).catch(() => {})
  }, [])
  const siteAvg = useMemo(() => { const r = site.filter((t) => t.rating); return { average: r.length ? r.reduce((a, t) => a + t.rating, 0) / r.length : 0, count: r.length } }, [site])
  const tabBtn = (id, label, n) => <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`px-4 py-2 rounded-full text-sm font-bold border ${tab === id ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-card text-text-2 border-border'}`}>{label} <span className="opacity-75">({n})</span></button>

  return (
    <>
      <PageHero bg="/images/field_crops_collage.jpg" crumbs={[['Home', '/'], ['Reviews']]} eyebrow="Customer reviews" icon={<Icon name="star" />}
        title="What Customers Say" subtitle="Honest feedback about Muddo Agro Chemicals and the products we sell — and a place for you to add yours." />
      <section className="py-12">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="flex gap-2 flex-wrap mb-8">{tabBtn('site', 'About Muddo Agro', site.length)}{tabBtn('products', 'Product reviews', prod.summary.count)}</div>

          {tab === 'site' && (
            <>
              {siteAvg.count > 0 && <div className="flex items-center gap-3 mb-6"><Stars value={siteAvg.average} size={26} /><span className="text-2xl font-bold text-text-1">{siteAvg.average.toFixed(1)}</span><span className="text-text-3 text-sm">from {siteAvg.count} rating{siteAvg.count !== 1 ? 's' : ''}</span></div>}
              <div className="grid sm:grid-cols-2 gap-5 mb-10">
                {site.map((t) => (
                  <figure key={t.id} className="bg-bg-card border border-border rounded-card p-6 flex flex-col">
                    {t.rating ? <Stars value={t.rating} size={16} /> : null}
                    <blockquote className="text-text-2 leading-relaxed mt-3 flex-1 break-words">“{t.message}”</blockquote>
                    <figcaption className="flex items-center gap-3 mt-4 pt-4 border-t border-border"><Avatar src={t.photo_url} name={t.name} className="w-11 h-11" /><div className="min-w-0"><div className="font-bold text-text-1 text-sm truncate">{t.name}</div><div className="text-xs text-text-3 truncate">{[t.role, t.product_name].filter(Boolean).join(' · ')}</div></div></figcaption>
                  </figure>
                ))}
                {!site.length && <p className="text-text-3 col-span-full">No reviews yet — be the first below.</p>}
              </div>
              <ShareExperience />
            </>
          )}

          {tab === 'products' && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8">
              <div className="space-y-6">
                <div className="bg-bg-card border border-border rounded-card p-6"><RatingSummary summary={prod.summary} /></div>
                <ProductReviewForm products={products} onDone={() => communityApi.recentProductReviews().then(({ data }) => setProd(data)).catch(() => {})} />
              </div>
              <div className="space-y-4">{prod.results.map((r) => <ReviewCard key={r.id} r={r} />)}{!prod.results.length && <p className="text-text-3">No product reviews yet.</p>}</div>
            </div>
          )}
          <MyReviews className="mt-10" />
        </div>
      </section>
    </>
  )
}
