import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productsApi } from '../../api/services'
import ProductCard from '../../components/ProductCard'
import Icon from '../../components/Icon'
import Reveal from '../../components/Reveal'

const META = {
  pesticides: { category: 'pesticide', title: 'Pesticides', tag: 'Insect & Pest Control', icon: 'bug',
    desc: 'Professional-grade MAAIF-registered insecticides for all major crop pests across Uganda.' },
  herbicides: { category: 'herbicide', title: 'Herbicides', tag: 'Weed Control', icon: 'seedling',
    desc: 'Selective and non-selective herbicides for effective weed management in all crops.' },
  fungicides: { category: 'fungicide', title: 'Fungicides', tag: 'Disease Control', icon: 'microscope',
    desc: 'Systemic and contact fungicides for prevention and control of fungal crop diseases.' },
  other: { category: 'other', title: 'Others & Equipment', tag: 'Agri Inputs', icon: 'boxes',
    desc: 'Application equipment and other essential agri-inputs — genuine, durable, and serviced at every MACL outlet.' },
}

const TABS = [
  ['pesticides', 'Pesticides', 'bug'],
  ['herbicides', 'Herbicides', 'seedling'],
  ['fungicides', 'Fungicides', 'microscope'],
  ['other', 'Others & Equipment', 'boxes'],
]

export default function ProductCategoryPage() {
  const { slug } = useParams()
  const meta = META[slug] || META.pesticides
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    productsApi
      .list({ category: meta.category, page_size: 100 })
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false))
  }, [meta.category])

  const filtered = products.filter((p) => {
    const q = query.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.active_ingredient || '').toLowerCase().includes(q) || (p.crops || '').toLowerCase().includes(q)
  })

  return (
    <>
      <section
        className="relative py-16 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,.6) 0%, rgba(15,23,42,.88) 100%), url('/images/hero_${slug === 'other' ? 'fertilizers' : slug}.jpg')` }}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-xs text-white/65 mb-2.5">
            <Link to="/" className="text-white/75">Home</Link> / <span className="text-accent-blue font-bold">{meta.title}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-3.5">
            <Icon name={meta.icon} />{meta.tag}
          </div>
          <h1 className="text-white text-3xl sm:text-4xl font-bold my-3">{meta.title}</h1>
          <p className="text-white/85 max-w-[55ch] mb-6">{meta.desc}</p>
          <div className="flex gap-2.5 flex-wrap">
            <Link to="/contact?subject=Product+Enquiry" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue">
              <Icon name="envelope" />Enquire About Any Product
            </Link>
            <Link to="/compare" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn border border-white/40 text-white font-bold text-sm">
              <Icon name="balance-scale" />Compare Products
            </Link>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="flex gap-2 flex-wrap mb-7">
            {TABS.map(([s, label, icon]) => (
              <Link
                key={s}
                to={`/products/${s}`}
                className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full text-sm font-bold border transition-colors ${
                  s === slug ? 'bg-accent-blue text-white border-accent-blue shadow-glow-blue' : 'bg-bg-card text-text-2 border-border hover:border-accent-blue hover:text-accent-blue'
                }`}
              >
                <Icon name={icon} />{label}
              </Link>
            ))}
          </div>

          <div className="flex gap-3 items-center flex-wrap p-4 bg-bg-card border border-border rounded-2xl mb-7">
            <div className="flex-1 min-w-[200px] relative">
              <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, active ingredient or crop…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue"
              />
            </div>
            <div className="text-sm font-bold text-text-3 bg-bg-alt px-3.5 py-2 rounded-lg whitespace-nowrap">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-[380px] rounded-card bg-bg-alt animate-pulse" />)}
            </div>
          ) : filtered.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p, i) => <Reveal key={p.id} delay={Math.min(i, 8) * 50}><ProductCard product={p} /></Reveal>)}
            </div>
          ) : (
            <div className="text-center py-16 text-text-3">
              <Icon name="box-open" size="3rem" className="block mx-auto mb-4" />
              <h3 className="text-text-1 font-bold mb-2">No {meta.title.toLowerCase()} listed yet</h3>
              <p>Contact us directly — we stock a wide range of products not yet listed online.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
