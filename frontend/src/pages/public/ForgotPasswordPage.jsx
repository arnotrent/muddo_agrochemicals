import { useState } from 'react'
import { Link } from 'react-router-dom'
import { recoveryApi } from '../../api/recovery'
import AuthShell from '../../components/auth/AuthShell'
import Icon from '../../components/Icon'
import site from '../../data/siteConfig'

export default function ForgotPasswordPage() {
  const [ident, setIdent] = useState('')
  const [state, setState] = useState(null) // null | 'sending' | {ok,msg}

  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      const { data } = await recoveryApi.request(ident.trim())
      setState({ ok: true, msg: data.detail })
    } catch (err) {
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many requests. Please wait a while before trying again.' : 'Could not reach the server — please try again.' })
    }
  }
  const wa = `https://wa.me/${site.whatsapp_number}?text=${encodeURIComponent('Hello Muddo Agro admin, I cannot sign in to the portal and need my password reset. My username is: ' + (ident.trim() || '____'))}`

  return (
    <AuthShell title="Recover your account" subtitle="Choose the option that fits your situation.">
      <form onSubmit={submit} className="mb-6">
        <div className="font-bold text-text-1 text-sm mb-2 flex items-center gap-2"><Icon name="envelope" className="text-accent-blue" />Option 1 — E-mail me a reset link</div>
        {state && state !== 'sending' && (
          <div role="status" className={`mb-3 p-3 rounded-lg text-sm flex gap-2 ${state.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
            <Icon name={state.ok ? 'check-circle' : 'exclamation-circle'} className="mt-0.5" /><span>{state.msg}</span>
          </div>
        )}
        <label htmlFor="fp-id" className="text-sm font-semibold text-text-2 block mb-1.5">Username or e-mail</label>
        <input id="fp-id" required minLength={3} maxLength={150} value={ident} onChange={(e) => setIdent(e.target.value)} autoFocus autoComplete="username"
          className="w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue mb-3" />
        <button disabled={state === 'sending'} className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
          <Icon name="paper-plane" />{state === 'sending' ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="text-xs text-text-3 mt-2">The link works once and expires after 1 hour. It is sent only to the e-mail saved on your account.</p>
      </form>

      <div className="border-t border-border pt-5 mb-5">
        <div className="font-bold text-text-1 text-sm mb-1.5 flex items-center gap-2"><Icon name="users" className="text-accent-blue" />Option 2 — Field agents: ask your administrator</div>
        <p className="text-sm text-text-3 mb-2.5">No e-mail on your account? The administrator can set a new password for you from Settings → Reset Agent Password.</p>
        <div className="flex gap-2 flex-wrap">
          <a href={wa} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-btn bg-accent-green text-bg-deep text-sm font-bold inline-flex items-center gap-2"><Icon name="whatsapp" />WhatsApp admin</a>
          <a href={`tel:${site.phones[0].tel}`} className="px-3.5 py-2 rounded-btn bg-bg-alt text-text-2 text-sm font-bold inline-flex items-center gap-2"><Icon name="phone" />Call</a>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="font-bold text-text-1 text-sm mb-1.5 flex items-center gap-2"><Icon name="key" className="text-accent-blue" />Option 3 — Administrator locked out</div>
        <p className="text-sm text-text-3">If the admin e-mail is unavailable, whoever manages the server can run <code className="px-1 rounded bg-bg-alt text-text-1">python manage.py changepassword admin</code> in the Render shell. Once signed in, add a real recovery e-mail under Settings.</p>
      </div>

      <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent-blue"><Icon name="arrow-left" />Back to sign in</Link>
    </AuthShell>
  )
}
