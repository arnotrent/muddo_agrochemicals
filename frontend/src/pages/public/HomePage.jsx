import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, distributorsApi } from '../../api/services'
import ProductCard from '../../components/ProductCard'
import Icon from '../../components/Icon'
import { useSiteSettings } from '../../hooks/useSiteSettings'

const CATEGORIES = [
  ['bug', 'Pesticides', 'pesticides', '/images/hero_pesticides.jpg'],
  ['seedling', 'Herbicides', 'herbicides', '/images/hero_herbicides.jpg'],
  ['microscope', 'Fungicides', 'fungicides', '/images/hero_fungicides.jpg'],
  ['boxes', 'Fertilizers & Equipment', 'other', '/images/hero_fertilizers.jpg'],
]

const WHY_CARDS = [
  ['shield-alt', '100% Authentic', 'All products MAAIF-registered, sourced directly from certified manufacturers. Zero counterfeits.'],
  ['users', 'Farmer First', "Pricing and advice built around Uganda's farmers — retail and wholesale, no minimum order."],
  ['flask', 'Quality Assured', 'Every product meets MAAIF registration and international quality standards before we stock it.'],
  ['map-marked-alt', 'Nationwide Reach', '11 authorised outlets across Central, Eastern, Northern and Western Uganda.'],
  ['headset', 'Expert Support', 'Our trained team gives dosage guidance, application timing and crop-specific advice — free.'],
  ['handshake', 'Long-term Partners', 'We build lasting relationships with farmers and distributors, not just one-off transactions.'],
]

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [distCount, setDistCount] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)
  const site = useSiteSettings()

  useEffect(() => {
    productsApi.list({ page_size: 6, ordering: '?' }).then(({ data }) => {
      const results = data.results || data
      setFeatured(results.slice(0, 6))
    })
    productsApi.list({ page_size: 1 }).then(({ data }) => setTotalProducts(data.count ?? (data.results || data).length))
    distributorsApi.list({ page_size: 1 }).then(({ data }) => setDistCount(data.count ?? (data.results || data).length))
  }, [])

  return (
    <>
      <section className="relative min-h-[78vh] flex items-center bg-cover bg-center" style={{ backgroundImage: "linear-gradient(180deg, rgba(15,23,42,.55) 0%, rgba(15,23,42,.82) 100%), url('/images/hero_home.jpg')" }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-[640px] py-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-4.5">
              <Icon name="certificate" />MAAIF-Registered &middot; Est. 2020
            </div>
            <h1 className="text-white text-4xl sm:text-5xl font-bold mb-4.5 leading-tight">
              Uganda's Trusted <span className="text-accent-blue">Agrochemical</span> Partner
            </h1>
            <p className="text-white/88 text-base sm:text-lg leading-relaxed max-w-[52ch] mb-7">
              Genuine pesticides, herbicides, fungicides, fertilizers and equipment. MAAIF-registered. Kampala-based. Nationwide reach.
            </p>
            <div className="flex gap-3 flex-wrap mb-9">
              <Link to="/products/pesticides" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue">
                <Icon name="flask" />Browse Products
              </Link>
              <a href={`https://wa.me/${site?.whatsapp_number || ''}?text=Hello%20Muddo%20Agro`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-btn bg-accent-green text-bg-deep font-bold text-sm shadow-glow-green">
                <Icon name="whatsapp" />WhatsApp Us
              </a>
              <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-btn border border-white/40 text-white font-bold text-sm">
                <Icon name="envelope" />Enquire
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-[420px]">
              <div className="text-center p-4 bg-white/[0.08] border border-white/[0.14] rounded-2xl backdrop-blur">
                <div className="text-3xl font-bold text-accent-blue">{totalProducts}</div>
                <div className="text-[0.7rem] text-white/72 mt-1 font-semibold">Products</div>
              </div>
              <div className="text-center p-4 bg-white/[0.08] border border-white/[0.14] rounded-2xl backdrop-blur">
                <div className="text-3xl font-bold text-accent-blue">{distCount}</div>
                <div className="text-[0.7rem] text-white/72 mt-1 font-semibold">Outlets</div>
              </div>
              <div className="text-center p-4 bg-white/[0.08] border border-white/[0.14] rounded-2xl backdrop-blur">
                <div className="text-3xl font-bold text-accent-blue">4</div>
                <div className="text-[0.7rem] text-white/72 mt-1 font-semibold">Regions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-11">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="th-large" />Our Range
            </div>
            <h2 className="text-3xl font-bold text-text-1">Product Categories</h2>
            <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">MAAIF-registered products across four specialist categories — all genuine, all in stock.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {CATEGORIES.map(([icon, title, slug, img]) => (
              <Link key={slug} to={`/products/${slug}`} className="bg-bg-card border border-border rounded-card overflow-hidden hover:-translate-y-1.5 hover:scale-[1.015] hover:border-accent-blue transition-all group">
                <div className="h-[150px] overflow-hidden">
                  <img src={img} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.src = '/images/products_all.jpg' }} />
                </div>
                <div className="p-4.5 pb-5">
                  <div className="w-8.5 h-8.5 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center mb-2">
                    <Icon name={icon} />
                  </div>
                  <div className="font-bold text-text-1 group-hover:text-accent-blue">{title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="py-16 bg-bg-alt">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-11">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
                <Icon name="star" />Popular
              </div>
              <h2 className="text-3xl font-bold text-text-1">Featured Products</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-2 gap-4">
            <img src="/images/why_quality.jpg" alt="Pest identification close-up" className="w-full h-[230px] object-cover rounded-2xl shadow-md" />
            <img src="/images/why_equipment.jpg" alt="Application equipment" className="w-full h-[230px] object-cover rounded-2xl shadow-md mt-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="microscope" />Field-Tested
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-1 mb-3.5">We know the pest before we sell you the cure</h2>
            <p className="leading-relaxed mb-4 text-text-2">
              Every product we stock is matched against real Ugandan field conditions \u2014 the actual aphids, whitefly
              and beetles farmers bring to us, not just a label. That's why we can tell you exactly which product
              fits your crop, not just sell you the most expensive one.
            </p>
            <div className="flex flex-col gap-3">
              {[
                'Genuine, MAAIF-registered active ingredients \u2014 never diluted',
                'Correct dosage guidance for your crop, not a generic label rate',
                'Application equipment sold and serviced alongside the chemical',
              ].map((line) => (
                <div key={line} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name="check" /></div>
                  <span className="text-sm text-text-2">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-11">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="award" />Why Choose Us
            </div>
            <h2 className="text-3xl font-bold text-text-1">The MACL Difference</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_CARDS.map(([icon, title, desc]) => (
              <div key={title} className="p-6.5 rounded-card bg-bg-card border border-border hover:-translate-y-1 hover:border-accent-blue transition-all">
                <div className="w-11.5 h-11.5 rounded-xl bg-bg-alt text-accent-blue flex items-center justify-center mb-4">
                  <Icon name={icon} />
                </div>
                <h3 className="font-bold text-text-1 mb-2">{title}</h3>
                <p className="text-sm text-text-3 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
