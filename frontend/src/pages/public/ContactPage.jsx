import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { coreApi } from '../../api/services'
import site from '../../data/siteConfig'
import Icon from '../../components/Icon'
import Reveal from '../../components/Reveal'
import { PhoneLinks, EmailLinks } from '../../components/ContactDetails'

const SUBJECTS = ['Product Enquiry', 'Pricing / Quotation', 'Wholesale / Bulk Order', 'Distributor Partnership', 'Technical / Agronomy Advice', 'General Enquiry']
const inputCls = 'w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue transition-colors'

export default function ContactPage() {
  const [params] = useSearchParams()
  const initialSubject = params.get('subject') || ''
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: SUBJECTS.includes(initialSubject) ? initialSubject : (initialSubject ? 'Product Enquiry' : ''), message: initialSubject.startsWith('Product Enquiry ') ? `I would like to know more about ${initialSubject.replace('Product Enquiry ', '')}.` : '' })
  const [status, setStatus] = useState(null)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const { data } = await coreApi.contact(form)
      setStatus({ ok: true, ref: data.ref_number })
      setForm({ name: '', phone: '', email: '', subject: '', message: '' })
    } catch (err) {
      const errs = err.response?.data?.errors
      setStatus({ error: (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Something went wrong — please try again.' })
    }
  }

  const cards = [
    ['map-marker-alt', 'Visit us in Kampala', site.company_address],
    ['building', 'Postal address', site.company_po_box],
    ['phone', 'Call or WhatsApp us', <PhoneLinks key="p" />],
    ['envelope', 'Email the team', <EmailLinks key="e" />],
    ['clock', "When we're open", site.business_hours],
  ]
  return (
    <>
      <div className="w-full bg-bg-deep"><img src="/images/hero_contact_banner.png" alt="Contact Muddo Agro Chemicals Ltd" className="w-full max-h-[320px] object-cover" /></div>

      <section className="pt-10">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="rounded-card border border-border bg-bg-card p-6 sm:p-8 transition-colors duration-300 hover:border-accent-blue">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="handshake" />Let&rsquo;s talk</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-1 mb-3">The best partnerships start with a simple conversation</h1>
              <p className="max-w-[78ch] text-text-2 leading-relaxed">
                Whether you&rsquo;re a retailer stocking up for the season, a large-scale grower managing acres, or a farmer fighting to save a patch of vegetables, your questions matter to us.
                Drop us a line below, tell us what you&rsquo;re growing, and let&rsquo;s work together to bring in a harvest we can both be proud of.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_1.1fr] gap-12">
          <div>
            <Reveal>
              <div className="relative overflow-hidden rounded-card bg-bg-deep text-white p-6 mb-7">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-accent-green/15 blur-2xl" aria-hidden="true" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-accent-green/20 text-accent-green flex items-center justify-center mb-3"><Icon name="seedling" /></div>
                  <h2 className="text-xl font-bold mb-2.5">We get it — farming is a labour of love</h2>
                  <p className="text-white/80 text-sm leading-relaxed mb-2.5">Pouring your heart into the soil and then waiting on a harvest takes faith, and even more hard work. Between unpredictable weather, sudden pests and stubborn weeds, it&rsquo;s stressful watching over everything you&rsquo;ve invested.</p>
                  <p className="text-white/80 text-sm leading-relaxed">You shouldn&rsquo;t carry that worry alone. Think of us as your partners in the field — right here with you, making sure your crops stay protected and your hard work truly pays off.</p>
                </div>
              </div>
            </Reveal>
            <h2 className="text-2xl font-bold text-text-1 mb-5">A Few Ways to Reach Us</h2>
            {cards.map(([icon, label, content], i) => (
              <Reveal key={label} delay={i * 60}>
                <div className="flex items-start gap-3.5 p-4 bg-bg-card border border-border rounded-2xl mb-3 transition-all duration-300 hover:border-accent-blue hover:-translate-y-0.5 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name={icon} /></div>
                  <div className="min-w-0"><div className="text-[0.72rem] font-bold uppercase tracking-wide text-text-3 mb-1">{label}</div><div className="text-sm text-text-1 font-semibold">{content}</div></div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="bg-bg-card border border-border rounded-card p-8">
              <h3 className="text-xl font-bold text-text-1 mb-1.5">Send Us a Message</h3>
              <p className="text-text-3 text-sm mb-5.5">We read every message ourselves — no call centre. You&rsquo;ll get a reference number to track your enquiry.</p>
              {status?.ok && <div className="mb-5 p-3.5 rounded-lg bg-accent-green/[0.1] border border-accent-green text-sm animate-viewerIn">Message sent! Reference: <strong className="font-mono">{status.ref}</strong> — save it to track your enquiry.</div>}
              {status?.error && <div role="alert" className="mb-5 p-3.5 rounded-lg bg-accent-red/[0.08] border border-accent-red text-accent-red text-sm">{status.error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="mb-4"><label className="text-sm font-semibold text-text-2 block mb-1.5">Full Name *</label><input name="name" value={form.name} onChange={handleChange} required className={inputCls} /></div>
                  <div className="mb-4"><label className="text-sm font-semibold text-text-2 block mb-1.5">Phone / WhatsApp</label><input name="phone" value={form.phone} onChange={handleChange} placeholder="+256 7XX XXX XXX" className={inputCls} /></div>
                </div>
                <div className="mb-4"><label className="text-sm font-semibold text-text-2 block mb-1.5">Email Address *</label><input type="email" name="email" value={form.email} onChange={handleChange} required className={inputCls} /></div>
                <div className="mb-4"><label className="text-sm font-semibold text-text-2 block mb-1.5">Subject *</label>
                  <select name="subject" value={form.subject} onChange={handleChange} required className={inputCls}><option value="">Select a topic…</option>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="mb-5.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Message *</label><textarea name="message" value={form.message} onChange={handleChange} rows={5} required placeholder="Tell us what you need — the crop you're growing, the product, quantity, delivery location…" className={`${inputCls} resize-y`} /></div>
                <button type="submit" disabled={status === 'sending'} className="w-full py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue disabled:opacity-60 flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]"><Icon name="paper-plane" />{status === 'sending' ? 'Sending…' : 'Send Message'}</button>
              </form>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
