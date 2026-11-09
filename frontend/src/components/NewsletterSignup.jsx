import { useState } from 'react'
import { Link } from 'react-router-dom'
import { coreApi } from '../api/services'
import Icon from './Icon'

const input = 'w-full px-3.5 py-2.5 rounded-input border border-white/20 bg-white/10 text-white placeholder-white/50 outline-none focus:border-accent-blue text-sm'

/** Newsletter / updates sign-up band (footer). Consent box is required; hidden "website" field is a bot trap. */
export default function NewsletterSignup() {
  const [f, setF] = useState({ email: '', name: '', consent: false, website: '' })
  const [state, setState] = useState(null) // null | 'sending' | {ok,msg}
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.consent) return setState({ ok: false, msg: 'Please tick the box to agree to receive our updates.' })
    setState('sending')
    try {
      const { data } = await coreApi.subscribe(f)
      setState({ ok: true, msg: data.message })
      setF({ email: '', name: '', consent: false, website: '' })
    } catch (err) {
      const d = err.response?.data
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many attempts - please try again in a few minutes.' : (d?.errors && Object.values(d.errors).flat()[0]) || d?.detail || 'Could not subscribe right now. Please try again.' })
    }
  }

  return (
    <section aria-labelledby="nl-title" className="mb-10 rounded-2xl border border-white/15 bg-white/[0.06] p-6 sm:p-8 grid lg:grid-cols-[1fr_1.2fr] gap-6 items-center">
      <div>
        <div className="inline-flex items-center gap-1.5 text-accent-blue text-xs font-bold uppercase tracking-wide mb-2"><Icon name="envelope" />Stay informed</div>
        <h3 id="nl-title" className="text-white text-xl font-bold mb-1.5">Get news and updates from Muddo Agro Chemicals</h3>
        <p className="text-sm text-white/70 leading-relaxed">New products, stock arrivals and practical crop-protection advice, straight to your inbox. Unsubscribe any time.</p>
      </div>
      {state?.ok ? (
        <div role="status" className="p-4 rounded-xl bg-accent-green/15 text-accent-green text-sm flex gap-2"><Icon name="check-circle" className="mt-0.5" />{state.msg}</div>
      ) : (
        <form onSubmit={submit} noValidate>
          {state && state !== 'sending' && <div role="alert" className="mb-3 p-2.5 rounded-lg bg-accent-red/15 text-accent-red text-sm flex gap-2"><Icon name="exclamation-circle" className="mt-0.5" />{state.msg}</div>}
          <div className="grid sm:grid-cols-2 gap-2.5 mb-2.5">
            <input aria-label="Your name (optional)" placeholder="Your name (optional)" maxLength={80} autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} className={input} />
            <input aria-label="E-mail address" type="email" required placeholder="E-mail address" maxLength={254} autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} />
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label></div>
          <label className="flex items-start gap-2.5 text-xs text-white/70 mb-3 cursor-pointer leading-relaxed">
            <input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>I agree that Muddo Agro Chemicals LTD may e-mail me news and updates. I can unsubscribe at any time. See the <Link to="/legal/privacy" className="underline hover:text-accent-blue">Privacy Policy</Link>.</span>
          </label>
          <button disabled={state === 'sending' || !f.email} className="px-6 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60 hover:bg-accent-blue-hover transition-colors"><Icon name="paper-plane" />{state === 'sending' ? 'Subscribing…' : 'Subscribe'}</button>
        </form>
      )}
    </section>
  )
}
