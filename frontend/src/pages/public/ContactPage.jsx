import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { coreApi } from '../../api/services'
import site from '../../data/siteConfig'
import Icon from '../../components/Icon'

const SUBJECTS = ['Product Enquiry', 'Pricing / Quotation', 'Wholesale / Bulk Order', 'Distributor Partnership', 'Technical / Agronomy Advice', 'General Enquiry']

export default function ContactPage() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: params.get('subject') || '', message: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | { ok, ref } | { error }

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const { data } = await coreApi.contact(form)
      setStatus({ ok: true, ref: data.ref_number })
      setForm({ name: '', phone: '', email: '', subject: '', message: '' })
    } catch (err) {
      setStatus({ error: err.response?.data?.detail || 'Something went wrong — please try again.' })
    }
  }

  return (
    <>
      <div className="w-full bg-bg-deep">
        <img src="/images/hero_contact_banner.png" alt="Contact Muddo Agro Chemicals Ltd" className="w-full max-h-[320px] object-cover" />
      </div>
      <section className="py-10 pb-0">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <p className="max-w-[60ch] text-text-2 text-base leading-relaxed">
            Got a pest problem, need a price, or just want to ask before you buy — we usually reply the same day.
          </p>
        </div>
      </section>
      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_1.1fr] gap-12">
          <div>
            <h2 className="text-2xl font-bold text-text-1 mb-5">A Few Ways to Reach Us</h2>
            {[
              ['map-marker-alt', 'Visit us in Kampala', site.company_address],
              ['phone', 'Call or WhatsApp us', site.company_phone],
              ['envelope', 'Email the team', site.company_email],
              ['clock', "When we're open", site.business_hours],
            ].map(([icon, label, content]) => (
              <div key={label} className="flex items-start gap-3.5 p-4 bg-bg-card border border-border rounded-2xl mb-3 hover:border-accent-blue transition-colors">
                <div className="w-10 h-10 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0">
                  <Icon name={icon} />
                </div>
                <div>
                  <div className="text-[0.72rem] font-bold uppercase tracking-wide text-text-3 mb-1">{label}</div>
                  <div className="text-sm text-text-1 font-semibold">{content}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-bg-card border border-border rounded-card p-8">
            <h3 className="text-xl font-bold text-text-1 mb-1.5">Send Us a Message</h3>
            <p className="text-text-3 text-sm mb-5.5">We read every message ourselves — no call centre. You'll get a reference number to track your enquiry.</p>

            {status?.ok && (
              <div className="mb-5 p-3.5 rounded-lg bg-accent-green/[0.1] border border-accent-green text-sm">
                Message sent! Reference: <strong className="font-mono">{status.ref}</strong> — save it to track your enquiry.
              </div>
            )}
            {status?.error && (
              <div className="mb-5 p-3.5 rounded-lg bg-accent-red/[0.08] border border-accent-red text-accent-red text-sm">{status.error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="mb-4">
                  <label className="text-sm font-semibold text-text-2 block mb-1.5">Full Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
                </div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-text-2 block mb-1.5">Phone / WhatsApp</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+256 7XX XXX XXX" className="w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Email Address *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
              </div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Subject *</label>
                <select name="subject" value={form.subject} onChange={handleChange} required className="w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue">
                  <option value="">Select a topic…</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mb-5.5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Message *</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={5} required placeholder="Tell us what you need — product name, quantity, delivery location…" className="w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue resize-y" />
              </div>
              <button type="submit" disabled={status === 'sending'} className="w-full py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue disabled:opacity-60 flex items-center justify-center gap-2">
                <Icon name="paper-plane" />{status === 'sending' ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
