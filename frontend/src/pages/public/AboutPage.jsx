import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../../api/services'
import site from '../../data/siteConfig'
import staticFaqs from '../../data/faqs'
import Icon from '../../components/Icon'

const CATEGORY_META = [
  ['pesticide', 'bug', 'Pesticides'],
  ['herbicide', 'seedling', 'Herbicides'],
  ['fungicide', 'microscope', 'Fungicides'],
  ['other', 'boxes', 'Fertilizers & Equipment'],
]

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [groups, setGroups] = useState([])
  const faqs = staticFaqs

  useEffect(() => {
    Promise.all(CATEGORY_META.map(([cat]) => productsApi.list({ category: cat, page_size: 8 }))).then((responses) => {
      setGroups(
        CATEGORY_META.map(([cat, icon, title], i) => ({
          cat, icon, title, products: responses[i].data.results || responses[i].data,
        })).filter((g) => g.products.length)
      )
    })
  }, [])

  return (
    <>
      <div className="w-full bg-bg-deep">
        <img src="/images/hero_about_banner.png" alt="About Muddo Agrochemicals Ltd" className="w-full max-h-[340px] object-cover" />
      </div>
      <section className="py-10 pb-0">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-4">
            <Icon name="certificate" />MAAIF-Registered &middot; Est. {site.year_founded || '2020'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-1 mb-3.5">
            Farming Uganda depends on, <span className="text-accent-blue">supplied honestly.</span>
          </h1>
          <p className="max-w-[60ch] text-text-2 text-base leading-relaxed">
            We're MACL — a Kampala-based, MAAIF-registered distributor of pesticides, herbicides, fungicides,
            fertilizers and spraying equipment. No counterfeits, no guesswork, just genuine products backed by
            people who actually know how to use them.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: '2rem' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img src="/images/handshake.jpg" alt="Trust, Respect, Integrity, Honesty — how MACL does business" className="w-full h-auto max-h-[280px] object-cover" />
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-1 mb-4">MACL — Muddo Agro Chemicals LTD</h2>
            <p className="leading-relaxed mb-3.5 text-text-2">
              Based in Kampala's {site.company_address}, MACL is a MAAIF-registered distributor of pesticides,
              herbicides, fungicides, fertilizers and spraying equipment serving all regions of Uganda.
            </p>
            <p className="leading-relaxed text-text-2">
              <Icon name="phone" className="text-accent-blue mr-1.5" /><strong>Tel:</strong> {site.company_phone}<br />
              <Icon name="envelope" className="text-accent-blue mr-1.5" /><strong>Email:</strong>{' '}
              <a href={`mailto:${site.company_email}`} className="text-accent-blue">{site.company_email}</a>
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img src="/images/about_side.jpg" alt="Healthy greenhouse tomatoes grown with MACL products" className="w-full h-auto object-cover" />
          </div>
        </div>
      </section>

      <section className="py-14 bg-bg-alt">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="flask" />Our Products
            </div>
            <h2 className="text-3xl font-bold text-text-1">What We Distribute</h2>
          </div>
          {groups.map((g) => (
            <div key={g.cat} className="mb-13">
              <div className="flex items-center gap-3.5 mb-5.5">
                <div className="w-13 h-13 rounded-2xl bg-bg-alt text-accent-blue flex items-center justify-center"><Icon name={g.icon} /></div>
                <h3 className="text-xl font-bold text-text-1">{g.title}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4.5">
                {g.products.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="bg-bg-card border border-border rounded-2xl overflow-hidden hover:-translate-y-1.5 hover:border-accent-blue transition-all">
                    <div className="aspect-[4/3] bg-bg-alt overflow-hidden">
                      <img src={p.display_image} alt={p.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/images/products_all.jpg' }} />
                    </div>
                    <div className="p-3.5">
                      <div className="text-sm font-bold text-text-1 leading-snug">{p.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[820px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3">
              <Icon name="question-circle" />FAQ
            </div>
            <h2 className="text-3xl font-bold text-text-1">Frequently Asked Questions</h2>
          </div>
          <div className="flex flex-col gap-2">
            {faqs.map((f) => (
              <div key={f.id} className="bg-bg-card border border-border rounded-card overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)} className="w-full p-4.5 text-left flex justify-between items-center gap-3.5 font-bold text-text-1">
                  <span>{f.question}</span>
                  <Icon name="chevron-down" className={`text-accent-blue transition-transform ${openFaq === f.id ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === f.id && <div className="px-4.5 pb-4.5 text-sm text-text-2 leading-relaxed border-t border-border pt-3.5">{f.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
