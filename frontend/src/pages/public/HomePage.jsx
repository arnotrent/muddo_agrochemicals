import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, distributorsApi } from '../../api/services'
import ProductCard from '../../components/ProductCard'
import Icon from '../../components/Icon'
import Reveal from '../../components/Reveal'
import CountUp from '../../components/CountUp'
import site from '../../data/siteConfig'

const CATEGORIES = [
  ['bug', 'Pesticides', 'pesticides', '/images/hero_pesticides.jpg'],
  ['seedling', 'Herbicides', 'herbicides', '/images/hero_herbicides.jpg'],
  ['microscope', 'Fungicides', 'fungicides', '/images/hero_fungicides.jpg'],
  ['boxes', 'Others & Equipment', 'other', '/images/hero_fertilizers.jpg'],
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
  const [popularProducts, setPopularProducts] = useState([])
  const [comingSoon, setComingSoon] = useState([])
  const [distCount, setDistCount] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)

  useEffect(() => {
    productsApi.list({ page_size: 6, ordering: '?', is_featured: false }).then(({ data }) => {
      const results = data.results || data
      setPopularProducts(results.slice(0, 6))
    })
    productsApi.list({ is_featured: true, page_size: 12 }).then(({ data }) => setComingSoon(data.results || data))
    productsApi.list({ page_size: 1 }).then(({ data }) => setTotalProducts(data.count ?? (data.results || data).length))
    distributorsApi.list({ page_size: 1 }).then(({ data }) => setDistCount(data.count ?? (data.results || data).length))
  }, [])

  return (
    <>
      <section className="relative min-h-[78vh] flex items-center bg-cover bg-center" style={{ backgroundImage: "linear-gradient(180deg, rgba(15,23,42,.55) 0%, rgba(15,23,42,.82) 100%), url('/images/hero_home.jpg')" }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-[640px] py-16 text-left">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-4.5 animate-pageIn">
              <Icon name="certificate" />MAAIF-Registered &middot; Est. 2020
            </div>
            <h1 className="text-white text-4xl sm:text-5xl font-bold mb-4.5 leading-tight text-left animate-pageIn" style={{ animationDelay: '80ms' }}>
              Uganda's Trusted <span className="text-accent-blue">Agrochemical</span> Partner
            </h1>
            <p className="text-white/88 text-base sm:text-lg leading-relaxed max-w-[52ch] mb-7 text-left animate-pageIn" style={{ animationDelay: '140ms' }}>
              Genuine pesticides, herbicides, fungicides, fertilizers and equipment. MAAIF-registered. Kampala-based. Nationwide reach.
            </p>
            <div className="flex gap-3 flex-wrap mb-9 animate-pageIn" style={{ animationDelay: '200ms' }}>
              <Link to="/products/pesticides" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all">
                <Icon name="flask" />Browse Products
              </Link>
              <a href={`https://wa.me/${site.whatsapp_number || ''}?text=Hello%20Muddo%20Agro`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-btn bg-accent-green text-bg-deep font-bold text-sm shadow-glow-green hover:-translate-y-0.5 transition-all">
                <Icon name="whatsapp" />WhatsApp Us
              </a>
              <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-btn border border-white/40 text-white font-bold text-sm hover:-translate-y-0.5 transition-all">
                <Icon name="envelope" />Enquire
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-[420px]">
              <div className="text-center p-4 bg-white/[0.08] border border-white/[0.14] rounded-2xl backdrop-blur">
                <div className="text-3xl font-bold text-accent-blue"><CountUp value={totalProducts} /></div>
                <div className="text-[0.7rem] text-white/72 mt-1 font-semibold">Products</div>
              </div>
              <div className="text-center p-4 bg-white/[0.08] border border-white/[0.14] rounded-2xl backdrop-blur">
                <div className="text-3xl font-bold text-accent-blue"><CountUp value={distCount} /></div>
                <div className="text-[0.7rem] text-white/72 mt-1 font-semibold">Outlets</div>
              </div>
              <div className="text-center p-4 bg-white/[0.08] border border-white/[0.14] rounded-2xl backdrop-blur">
                <div className="text-3xl font-bold text-accent-blue"><CountUp value={4} /></div>
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
            {CATEGORIES.map(([icon, title, slug, img], i) => (
              <Reveal key={slug} delay={i * 60}>
              <Link to={`/products/${slug}`} className="block bg-bg-card border border-border rounded-card overflow-hidden hover:-translate-y-1.5 hover:scale-[1.015] hover:border-accent-blue transition-all group">
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {popularProducts.length > 0 && (
        <section className="py-16 bg-bg-alt">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-11">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
                <Icon name="star" />Popular
              </div>
              <h2 className="text-3xl font-bold text-text-1">Popular Products</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularProducts.map((p, i) => <Reveal key={p.id} delay={i * 60}><ProductCard product={p} /></Reveal>)}
            </div>
          </div>
        </section>
      )}

      {comingSoon.length > 0 && (
        <section className="py-16">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-11">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-green/10 text-accent-green text-xs font-bold uppercase tracking-wide mb-3">
                <Icon name="star" />Coming Soon
              </div>
              <h2 className="text-3xl font-bold text-text-1">New Products On The Way</h2>
              <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">Currently being finalised for stock — get in touch to be notified the moment they land.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoon.map((p, i) => <Reveal key={p.id} delay={i * 60}><ProductCard product={p} /></Reveal>)}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="grid grid-cols-2 gap-4">
            <img src="/images/why_quality.jpg" alt="Pest identification close-up" className="w-full h-[230px] object-cover rounded-2xl shadow-md" />
            <img src="/images/why_equipment.jpg" alt="Application equipment" className="w-full h-[230px] object-cover rounded-2xl shadow-md mt-8" />
          </Reveal>
          <Reveal delay={120}>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="microscope" />Field-Tested
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-1 mb-3.5">We know the pest before we sell you the cure</h2>
            <p className="leading-relaxed mb-4 text-text-2">
              Every product we stock is matched against real Ugandan field conditions — the actual aphids, whitefly
              and beetles farmers bring to us, not just a label. That's why we can tell you exactly which product
              fits your crop, not just sell you the most expensive one.
            </p>
            <div className="flex flex-col gap-3">
              {[
                'Genuine, MAAIF-registered active ingredients — never diluted',
                'Correct dosage guidance for your crop, not a generic label rate',
                'Application equipment sold and serviced alongside the chemical',
              ].map((line) => (
                <div key={line} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name="check" /></div>
                  <span className="text-sm text-text-2">{line}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-11">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="award" />Why Choose Us
            </div>
            <h2 className="text-3xl font-bold text-text-1">The MACL Difference</h2>
            <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">Six reasons Uganda's farmers and distributors choose Muddo Agro Chemicals LTD.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_CARDS.map(([icon, title, desc], i) => (
              <Reveal key={title} delay={i * 60} className="p-6.5 rounded-card bg-bg-card border border-border hover:-translate-y-1 hover:border-accent-blue transition-all">
                <div className="w-11.5 h-11.5 rounded-xl bg-bg-alt text-accent-blue flex items-center justify-center mb-4">
                  <Icon name={icon} />
                </div>
                <h3 className="font-bold text-text-1 mb-2">{title}</h3>
                <p className="text-sm text-text-3 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-bg-alt">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <Reveal className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center bg-bg-card border border-border rounded-card overflow-hidden shadow-lg">
            <div className="bg-white p-6 sm:p-9 flex items-center justify-start h-full">
              <img src="/logo_full.png" alt="Muddo Agro Chemicals LTD — official business card" className="w-full h-auto object-contain" />
            </div>
            <div className="p-6 sm:p-9 text-left">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-bold uppercase tracking-wide mb-3.5">
                <Icon name="headset" />Expert Agronomy Advice — Free
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-1 mb-3 text-left">Not Sure Which Product to Use?</h2>
              <p className="text-text-2 leading-relaxed mb-6 text-left max-w-[52ch]">
                Tell us your crop, pest or weed problem — our trained team will recommend the right product, dosage
                and timing for Ugandan conditions.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a href={`https://wa.me/${site.whatsapp_number || ''}?text=Hello%20MACL%2C%20I%20need%20advice`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-accent-green text-bg-deep font-bold text-sm shadow-glow-green hover:-translate-y-0.5 transition-all">
                  <Icon name="whatsapp" />WhatsApp Us
                </a>
                <a href={`tel:${site.company_phone?.split('/')[0].trim()}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue hover:-translate-y-0.5 transition-all">
                  <Icon name="phone" />{site.company_phone}
                </a>
                <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn border border-border text-text-2 font-bold text-sm hover:-translate-y-0.5 transition-all">
                  <Icon name="envelope" />Send a Message
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
