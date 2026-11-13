import { useState } from 'react'
import { recoveryApi } from '../api/recovery'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 mb-3.5'

/** Lets the signed-in account set the REAL e-mail its password-recovery link is sent to (2FA code when 2FA is on). */
export default function AdminEmailCard({ needsOtp = false }) {
  const { user, refreshMe } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [pw, setPw] = useState('')
  const [otp, setOtp] = useState('')
  const [msg, setMsg] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    try {
      const { data } = await recoveryApi.changeEmail(email.trim(), pw, otp)
      setMsg({ ok: true, text: data.detail }); setPw(''); setOtp(''); refreshMe()
    } catch (err) { setMsg({ ok: false, text: err.response?.data?.detail || 'Could not save.' }); setOtp('') }
  }
  return (
    <div className="bg-bg-card border border-border rounded-card mb-6">
      <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="envelope" className="text-accent-blue" />Recovery e-mail</div>
      <form onSubmit={submit} className="p-5">
        <p className="text-sm text-text-3 mb-3.5">“Forgot password?” sends its reset link to this address. Seeded accounts have a placeholder — set a real one.</p>
        {msg && <div role="status" className={`mb-3.5 p-3 rounded-lg text-sm ${msg.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>{msg.text}</div>}
        <label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="ae-mail">E-mail *</label>
        <input id="ae-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={cls} />
        <label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="ae-pw">Current password *</label>
        <input id="ae-pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className={cls} />
        {needsOtp && (
          <>
            <label className="text-sm font-semibold text-text-2 block mb-1.5" htmlFor="ae-otp">2FA code *</label>
            <input id="ae-otp" required autoComplete="one-time-code" maxLength={16} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code or backup code" className={`${cls} font-mono`} />
          </>
        )}
        <button className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="save" />Save e-mail</button>
      </form>
    </div>
  )
}
