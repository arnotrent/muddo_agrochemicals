import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../../api/services'
import site from '../../data/siteConfig'
import faqGroups from '../../data/faqs'
import Icon from '../../components/Icon'
import { PhoneLinks, EmailLinks } from '../../components/ContactDetails'
import LeadershipSection from '../../components/LeadershipSection'

const CATEGORY_META = [
  ['pesticide', 'bug', 'Pesticides'],
  ['herbicide', 'seedling', 'Herbicides'],
  ['fungicide', 'microscope', 'Fungicides'],
  ['other', 'boxes', 'Others & Equipment'],
]

// Longer, friendlier copy lives HERE (About page) only — other pages keep their short headlines.
const DISTRIBUTE_PARAGRAPHS = [
  'Every farm tells a different story, and every story has its own challenges — a sudden attack of armyworms in the maize, a stubborn blanket of couch grass before planting, or damp weather that invites blight onto the tomatoes. Below, you will find the products we keep on our shelves, grouped by the problem they solve: pesticides for the insects that eat your harvest, herbicides for the weeds that steal its water and light, and fungicides for the diseases that spread when the rains come.',
  'Each card shows the product exactly as it reaches our shop. Tap any of them and you will find what it is made of, which crops it is meant for, how much to mix into a standard knapsack sprayer, the pack sizes we sell, and step-by-step directions written for the way most Ugandan growers actually spray. We keep the wording simple on purpose, so that a farmer in the field and a dealer behind the counter read the same instructions.',
  'Everything we distribute is registered with the Ministry of Agriculture, Animal Industry and Fisheries (MAAIF), and we buy for the shelf — not for the brochure — so what you see here is what we really stock. A few items are marked “Coming Soon”: these are products we are finalising for stock, listed early so you know what is on the way and can ask us to notify you the moment they arrive. And in the “Others & Equipment” group you will find the tools that make the chemicals work properly, such as knapsack sprayers.',
  'Not sure which one fits your garden, orchard or field? You do not need to guess. Tell us your crop, the pest, weed or disease you are fighting, and roughly how much land you are working, and our team will point you to the right product, the right dose and the right timing — free of charge. Browse below, compare what interests you, and when you are ready, call, WhatsApp or send us an enquiry: we buy and sell in small retail quantities as well as wholesale.',
]
const LEADERSHIP_INTRO = 'Behind every bottle on our shelves is a team that answers the phone, remembers your crop and takes responsibility for what we sell. These are the people who guide Muddo Agro Chemicals LTD — meet them, read their words, and get in touch whenever you like.'
const FAQ_INTRO = 'We hear the same sensible questions from farmers, agro-dealers and first-time buyers, so we have gathered the answers here — from where to find us and whether a product is genuine, to wholesale prices, delivery upcountry and what to do if something is not right. If your question is not covered, call or write to us and we will gladly help.'

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    Promise.all(CATEGORY_META.map(([cat]) => productsApi.list({ category: cat, page_size: 8 }))).then((responses) => {
      setGroups(
        CATEGORY_META.map(([cat, icon, title], i) => ({
          cat, icon, title, products: responses[i].data.results || responses[i].data,
        })).filter((g) => g.products.length)
      )
    }).catch(() => {})
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
              Based at {site.company_address}, MACL is a MAAIF-registered distributor of pesticides,
              herbicides, fungicides, fertilizers and spraying equipment serving all regions of Uganda.
            </p>
            <p className="leading-relaxed text-text-2">
              <Icon name="building" className="text-accent-blue mr-1.5" /><strong>P.O. Box:</strong> {site.company_po_box}<br />
              <Icon name="phone" className="text-accent-blue mr-1.5" /><strong>Tel:</strong> <PhoneLinks inline /><br />
              <Icon name="envelope" className="text-accent-blue mr-1.5" /><strong>Email:</strong> <EmailLinks inline />
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img src="/images/about_side.jpg" alt="Healthy greenhouse tomatoes grown with MACL products" className="w-full h-auto object-cover" />
          </div>
        </div>
      </section>

      <LeadershipSection intro={LEADERSHIP_INTRO} />

      <section className="py-14 bg-bg-alt">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="flask" />Our Products</div>
            <h2 className="text-3xl font-bold text-text-1">What We Distribute</h2>
          </div>
          <div className="max-w-[820px] mx-auto mb-12 space-y-4 text-text-2 leading-relaxed">
            {DISTRIBUTE_PARAGRAPHS.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            <div className="flex gap-2.5 flex-wrap pt-2">
              <Link to="/contact?subject=Product+Enquiry" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm"><Icon name="envelope" />Ask about a product</Link>
              <Link to="/compare" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn border border-border text-text-2 font-bold text-sm"><Icon name="balance-scale" />Compare products</Link>
            </div>
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
                    <div className="p-3.5"><div className="text-sm font-bold text-text-1 leading-snug">{p.name}</div></div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-9">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="question-circle" />FAQ</div>
            <h2 className="text-3xl font-bold text-text-1">Frequently Asked Questions</h2>
            <p className="text-text-2 max-w-[66ch] mx-auto mt-3 leading-relaxed">{FAQ_INTRO}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {faqGroups.map((g) => (
              <a key={g.id} href={`#faq-${g.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-bg-alt text-text-2 text-xs font-bold hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"><Icon name={g.icon} className="text-accent-blue" />{g.title}</a>
            ))}
          </div>
          {faqGroups.map((group) => (
            <div key={group.id} id={`faq-${group.id}`} className="mb-9 scroll-mt-24">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name={group.icon} /></div>
                <h3 className="text-lg font-bold text-text-1">{group.title}</h3>
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((f) => (
                  <div key={f.id} className="bg-bg-card border border-border rounded-card overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)} aria-expanded={openFaq === f.id} className="w-full p-4.5 text-left flex justify-between items-center gap-3.5 font-bold text-text-1">
                      <span>{f.question}</span>
                      <Icon name="chevron-down" className={`text-accent-blue transition-transform flex-shrink-0 ${openFaq === f.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === f.id && <div className="px-4.5 pb-4.5 text-sm text-text-2 leading-relaxed border-t border-border pt-3.5">{f.answer}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
