import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { coreApi } from '../../api/services'
import PageHero from '../../components/PageHero'
import Reveal from '../../components/Reveal'
import { PhoneLinks, EmailLink, uniqueEmails } from '../../components/ContactDetails'
import Icon from '../../components/Icon'
import site from '../../data/siteConfig'

const STEPS = [
  ['new', 'Received', 'envelope', 'Your message reached our team and has been logged under your reference number. A confirmation e-mail was sent to the address you gave.'],
  ['pending', 'In progress', 'clock', 'A team member is working on it — checking stock and prices, or preparing agronomy advice for your crop. We may call or e-mail you for details.'],
  ['resolved', 'Resolved', 'check', 'We have replied and closed the enquiry. If you still need help, send a follow-up and quote the same reference.'],
]
const NEXT = {
  new: 'Expect a reply within 1 business day. For something urgent, call or WhatsApp us and quote your reference.',
  pending: 'No action needed from you unless we contact you. Keep your phone nearby and check your e-mail (including spam).',
  resolved: 'Need something else? Submit a new enquiry — or reply to our e-mail and quote the reference below.',
}
const FAQ = [
  ['Where do I find my reference number?', 'It looks like ENQ-3A7X9K2M. It was shown on screen right after you sent your message and e-mailed to you in the “Enquiry Received” message (check spam or promotions).'],
  ['How long does a reply take?', `Usually the same business day, and within 1 business day at the latest. We are open ${site.business_hours}.`],
  ['Why is part of my information hidden?', 'To protect your privacy anyone who sees this page only gets your first name and a partly hidden e-mail and phone number, plus a short preview of the message.'],
  ['The status has not changed — what now?', 'Statuses change when a team member updates your enquiry. If it has been more than one business day, call or WhatsApp us and quote your reference.'],
  ['Can I change or cancel an enquiry?', 'Yes — contact us with your reference number and tell us what to change. We will update or close it for you.'],
]
const HOW = [
  ['envelope', '1. Send your enquiry', 'Use the Contact form. You get a reference number on screen and by e-mail straight away.'],
  ['clock', '2. We work on it', `Our team replies within 1 business day. Open ${site.business_hours}.`],
  ['check-circle', '3. Track it here', 'Come back any time with your reference to see the status — no account needed.'],
]
const fmt = (iso) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const ago = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${Math.max(m, 1)} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} day${Math.floor(m / 1440) > 1 ? 's' : ''} ago` }
const pill = 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide'

export default function TrackPage() {
  const [params, setParams] = useSearchParams()
  const [ref, setRef] = useState(params.get('ref') || '')
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [faq, setFaq] = useState(null)
  const [grown, setGrown] = useState(false)

  const run = async (value) => {
    const r = value.trim().toUpperCase()
    if (!r) return
    setLoading(true); setError(''); setSearched(false)
    try {
      const { data } = await coreApi.trackEnquiry(r)
      setResult(data.found ? data.result : null)
      setSearched(true)
    } catch (err) {
      setResult(null)
      setError(err.response?.status === 429 ? 'Too many look-ups in a short time. Please wait a minute and try again.' : 'We could not reach the server. Check your connection and try again — it may be waking up.')
    } finally { setLoading(false) }
  }
  useEffect(() => { if (params.get('ref')) run(params.get('ref')) }, []) // eslint-disable-line
  useEffect(() => { setGrown(false); if (!result) return undefined; const t = setTimeout(() => setGrown(true), 150); return () => clearTimeout(t) }, [result])

  const submit = (e) => { e.preventDefault(); setParams({ ref: ref.trim().toUpperCase() }); run(ref) }
  const copy = async () => { try { await navigator.clipboard.writeText(result.ref_number); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ } }
  const idx = result ? STEPS.findIndex((s) => s[0] === result.status) : -1
  const msg = result ? encodeURIComponent(`Hello MACL, I am following up on enquiry ${result.ref_number}.`) : ''

  return (
    <>
      <PageHero
        bg="/images/field_crops_collage.jpg" tone="deep"
        side={{ src: '/images/field_pests_caterpillars.jpg', alt: 'Caterpillar pests on crop leaves', caption: 'Describe the pest, we reply with the right product.', w: 929, h: 377 }}
        crumbs={[['Home', '/'], ['Track Enquiry']]} eyebrow="Enquiry status" icon={<Icon name="clock" />}
        title="Track Your Enquiry" subtitle="Enter the reference number from your confirmation e-mail to see where your enquiry stands and what happens next."
      />

      <section className="py-14">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="bg-bg-card border border-border rounded-card overflow-hidden transition-colors duration-300 hover:border-accent-blue">
              <div className="p-6 sm:p-8 border-b border-border">
                <div className={`${pill} mb-3`}><Icon name="search" />Enquiry lookup</div>
                <h2 className="text-2xl font-bold text-text-1 mb-1">Enter your reference number</h2>
                <p className="text-sm text-text-3 mb-5">Format: <span className="font-mono">ENQ-</span> followed by 8 letters/numbers. Upper or lower case both work.</p>
                <form onSubmit={submit} className="flex gap-2.5 flex-wrap">
                  <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. ENQ-3A7X9K2M" aria-label="Reference number" maxLength={20} autoComplete="off"
                    className="flex-1 min-w-[200px] px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 font-mono outline-none focus:border-accent-blue transition-colors" />
                  <button type="submit" disabled={loading || !ref.trim()} className="px-6 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm whitespace-nowrap flex items-center gap-2 shadow-glow-blue disabled:opacity-60 transition-all duration-300 hover:-translate-y-0.5 active:scale-95">
                    <Icon name="search" />{loading ? 'Checking…' : 'Track'}
                  </button>
                </form>
              </div>
              {error && <div role="alert" className="p-5 bg-accent-red/10 text-accent-red text-sm flex gap-2 animate-viewerIn"><Icon name="exclamation-circle" className="mt-0.5" />{error}</div>}
            </div>
          </Reveal>

          {result && (
            <div className="mt-6 space-y-5" aria-live="polite">
              <div className="animate-revealUp bg-bg-card border border-border rounded-card p-6 flex items-center justify-between gap-3 flex-wrap transition-all duration-300 hover:border-accent-blue hover:shadow-md">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-text-3">Current status</div>
                  <div className="font-bold text-2xl text-text-1">{result.status_label}</div>
                  <div className="text-xs text-text-3 mt-0.5">Submitted {fmt(result.created_at)} · {ago(result.created_at)}</div>
                </div>
                <button onClick={copy} className="px-4 py-2 rounded-btn border border-border text-text-2 text-sm font-bold flex items-center gap-2 transition-all duration-300 hover:border-accent-blue hover:text-accent-blue active:scale-95" title="Copy reference number">
                  <span className="font-mono">{result.ref_number}</span><Icon name={copied ? 'check' : 'list'} />{copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div>
                <div className="flex gap-2 mb-3" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <div key={s[0]} className="h-1.5 flex-1 rounded-full bg-bg-alt overflow-hidden">
                      <div className="h-full rounded-full bg-accent-blue transition-all duration-700 ease-out" style={{ width: grown && i <= idx ? '100%' : '0%', transitionDelay: `${i * 250}ms` }} />
                    </div>
                  ))}
                </div>
                <ol className="grid sm:grid-cols-3 gap-4" aria-label="Enquiry progress">
                  {STEPS.map(([key, label, icon, text], i) => (
                    <li key={key} aria-current={i === idx ? 'step' : undefined} style={{ animationDelay: `${i * 100}ms` }}
                      className={`animate-revealUp p-5 rounded-card border bg-bg-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg ${i === idx ? 'border-accent-blue shadow-glow-blue' : 'border-border hover:border-accent-blue'} ${i > idx ? 'opacity-70 hover:opacity-100' : ''}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-500 ${i < idx ? 'bg-accent-green text-bg-deep' : i === idx ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-3'}`}><Icon name={i < idx ? 'check' : icon} /></div>
                      <div className="font-bold text-sm text-text-1">{i + 1}. {label}</div>
                      <p className="text-xs text-text-3 leading-relaxed mt-1">{text}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="animate-revealUp p-4 rounded-card border border-accent-blue/40 bg-accent-blue/5 text-sm text-text-2 flex gap-2.5"><Icon name="info-circle" className="text-accent-blue mt-0.5" /><div><strong className="text-text-1">What happens next:</strong> {NEXT[result.status]}</div></div>

              <div className="animate-revealUp bg-bg-card border border-border rounded-card p-6 transition-colors duration-300 hover:border-accent-blue">
                <table className="w-full border-collapse">
                  <tbody>
                    {[['Name', result.name], ['E-mail', result.email || '—'], ['Phone', result.phone || '—'], ['Subject', result.subject], ['Message (preview)', result.message_preview]].map(([label, value]) => (
                      <tr key={label} className="border-b border-border last:border-0">
                        <td className="py-2.5 px-1.5 text-xs font-bold text-text-3 w-[150px] align-top">{label}</td>
                        <td className="py-2.5 px-1.5 text-sm text-text-1 break-words">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2.5 flex-wrap mt-5">
                  <a href={`https://wa.me/${site.whatsapp_number}?text=${msg}`} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-btn bg-accent-green text-bg-deep font-bold text-sm inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-green"><Icon name="whatsapp" />WhatsApp about this enquiry</a>
                  <span className="px-4 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm inline-flex items-center gap-2"><Icon name="envelope" /><EmailLink email={uniqueEmails()[0]} subject={`Enquiry ${result.ref_number}`} /></span>
                  <Link to="/contact" className="px-4 py-2.5 rounded-btn border border-border text-text-2 font-bold text-sm inline-flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-blue hover:text-accent-blue"><Icon name="plus-circle" />New enquiry</Link>
                </div>
              </div>
            </div>
          )}

          {searched && !result && (
            <div className="mt-6 bg-bg-card border border-border rounded-card p-9 text-center animate-revealUp">
              <Icon name="search" size="2.5rem" className="text-border block mx-auto mb-3.5" />
              <h3 className="font-bold text-text-1 mb-2">No enquiry found</h3>
              <p className="text-text-3 text-sm mb-4">We have no enquiry with reference <strong className="font-mono">{ref.trim().toUpperCase()}</strong>.</p>
              <ul className="text-sm text-text-3 text-left max-w-[420px] mx-auto space-y-1.5 list-disc pl-5">
                <li>Check the letters — O and 0, I and 1 are easy to mix up.</li>
                <li>Copy it from your “Enquiry Received” e-mail (look in spam).</li>
                <li>Still stuck? Call us and we will find it by your phone number.</li>
              </ul>
              <div className="mt-4 text-sm font-semibold text-text-1 flex justify-center gap-2"><Icon name="phone" className="text-accent-blue mt-0.5" /><PhoneLinks inline /></div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {HOW.map(([i, t, d], n) => (
              <Reveal key={t} delay={n * 80} className="h-full">
                <div className="h-full p-6 rounded-card bg-bg-card border border-border transition-all duration-300 hover:-translate-y-1.5 hover:border-accent-blue hover:shadow-lg">
                  <div className="w-11 h-11 rounded-xl bg-bg-alt text-accent-blue flex items-center justify-center mb-3.5"><Icon name={i} /></div>
                  <h3 className="font-bold text-text-1 mb-1.5">{t}</h3><p className="text-sm text-text-3 leading-relaxed">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12">
            <div className={`${pill} mb-3`}><Icon name="question-circle" />Help</div>
            <h2 className="text-2xl font-bold text-text-1 mb-5">Questions about tracking</h2>
          </Reveal>
          <div className="flex flex-col gap-2.5">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={Math.min(i, 4) * 50}>
                <div className={`bg-bg-card border rounded-card overflow-hidden transition-colors duration-300 ${faq === i ? 'border-accent-blue' : 'border-border hover:border-accent-blue/60'}`}>
                  <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i} className="w-full p-4.5 text-left flex justify-between items-center gap-3 font-bold text-text-1 text-sm">
                    <span>{q}</span><Icon name="chevron-down" className={`text-accent-blue transition-transform duration-300 ${faq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ${faq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden"><div className="px-4.5 pb-4.5 text-sm text-text-2 leading-relaxed border-t border-border pt-3.5">{a}</div></div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="text-center mt-8"><Link to="/contact" className="text-sm text-accent-blue hover:underline">&larr; Submit a new enquiry</Link></div>
        </div>
      </section>
    </>
  )
}
