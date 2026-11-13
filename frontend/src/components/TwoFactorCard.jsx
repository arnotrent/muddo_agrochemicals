import { useState } from 'react'
import { securityApi, secError } from '../api/security'
import Icon from './Icon'

const input = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'
const btn = 'px-5 py-2.5 rounded-btn font-bold text-sm flex items-center gap-2 disabled:opacity-60'

function Codes({ codes }) {
  const download = () => {
    const blob = new Blob([`Muddo Agro Chemicals - admin backup codes\nEach code works once.\n\n${codes.join('\n')}\n`], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'muddo-backup-codes.txt'
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  return (
    <div className="p-4 rounded-card border border-accent-blue/50 bg-accent-blue/5 mb-4">
      <div className="font-bold text-text-1 mb-1 flex items-center gap-2"><Icon name="key" className="text-accent-blue" />Backup codes - shown only now</div>
      <p className="text-sm text-text-2 mb-3">Keep these somewhere safe (not on the same phone). Each one works once if you lose your authenticator app.</p>
      <div className="grid grid-cols-2 gap-2 font-mono text-sm text-text-1 mb-3">{codes.map((c) => <div key={c} className="px-3 py-1.5 rounded-lg bg-bg-alt border border-border">{c}</div>)}</div>
      <button type="button" onClick={download} className={`${btn} bg-accent-blue text-white`}><Icon name="save" />Download codes</button>
    </div>
  )
}

/** Admin -> Settings: switch on / manage two-factor authentication (authenticator app). */
export default function TwoFactorCard({ status, onChanged }) {
  const [phase, setPhase] = useState('idle') // idle | password | scan
  const [pw, setPw] = useState('')
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState(null)
  const [mg, setMg] = useState({ password: '', otp: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const fail = (err, fb) => setMsg({ ok: false, text: secError(err, fb) })

  const start = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    try { const { data } = await securityApi.setup(pw); setSetup(data); setPhase('scan'); setPw('') } catch (err) { fail(err, 'Could not start the setup.') } finally { setBusy(false) }
  }
  const enable = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    try { const { data } = await securityApi.enable(code); setCodes(data.backup_codes); setPhase('idle'); setSetup(null); setCode(''); setMsg({ ok: true, text: 'Two-factor authentication is ON.' }); onChanged() } catch (err) { fail(err, 'Could not verify the code.') } finally { setBusy(false) }
  }
  const act = (fn, done) => async () => {
    setBusy(true); setMsg(null)
    try { const { data } = await fn(mg.password, mg.otp); setMg({ password: '', otp: '' }); done(data); onChanged() } catch (err) { fail(err, 'That did not work.') } finally { setBusy(false) }
  }

  return (
    <div className="bg-bg-card border border-border rounded-card mb-6">
      <div className="p-4 border-b border-border font-bold text-text-1 flex items-center justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-2"><Icon name="shield-alt" className="text-accent-blue" />Two-factor authentication (2FA)</span>
        {status && <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${status.enabled ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>{status.enabled ? 'ON' : 'OFF'}</span>}
      </div>
      <div className="p-5">
        {msg && <div role="status" className={`mb-4 p-3 rounded-lg text-sm ${msg.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>{msg.text}</div>}
        {codes && <Codes codes={codes} />}

        {!status && <p className="text-sm text-text-3">Loading…</p>}

        {status && !status.enabled && phase === 'idle' && (
          <>
            <p className="text-sm text-text-2 mb-4">Changing the admin password, resetting an agent's password and changing the recovery e-mail need a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…). Even someone who learns the password cannot do these things without your phone.</p>
            <button onClick={() => { setMsg(null); setCodes(null); setPhase('password') }} className={`${btn} bg-accent-blue text-white`}><Icon name="lock" />Set up 2FA</button>
          </>
        )}
        {status && !status.enabled && phase === 'password' && (
          <form onSubmit={start}>
            <label htmlFor="tf-pw" className="text-sm font-semibold text-text-2 block mb-1.5">Confirm your current password</label>
            <input id="tf-pw" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${input} mb-4`} />
            <div className="flex gap-2.5"><button disabled={busy} className={`${btn} bg-accent-blue text-white`}>{busy ? 'Please wait…' : 'Continue'}</button><button type="button" onClick={() => setPhase('idle')} className={`${btn} bg-bg-alt text-text-2`}>Cancel</button></div>
          </form>
        )}
        {status && !status.enabled && phase === 'scan' && setup && (
          <form onSubmit={enable}>
            <ol className="text-sm text-text-2 space-y-1.5 list-decimal pl-5 mb-4"><li>Open your authenticator app and add an account.</li><li>Scan this QR code - or type the key below.</li><li>Enter the 6-digit code the app shows.</li></ol>
            <div className="flex gap-5 flex-wrap items-center mb-4">
              {setup.qr ? <img src={setup.qr} alt="2FA QR code" width="176" height="176" className="rounded-lg bg-white p-2 border border-border" /> : <p className="text-sm text-text-3">QR code unavailable - use the key.</p>}
              <div><div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1">Key (type it manually)</div><div className="font-mono text-sm text-text-1 break-all select-all">{setup.secret}</div></div>
            </div>
            <label htmlFor="tf-code" className="text-sm font-semibold text-text-2 block mb-1.5">6-digit code</label>
            <input id="tf-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className={`${input} mb-4 max-w-[200px] font-mono tracking-widest`} />
            <div className="flex gap-2.5"><button disabled={busy || code.length !== 6} className={`${btn} bg-accent-green text-bg-deep`}>{busy ? 'Checking…' : 'Turn on 2FA'}</button><button type="button" onClick={() => { setPhase('idle'); setSetup(null) }} className={`${btn} bg-bg-alt text-text-2`}>Cancel</button></div>
          </form>
        )}

        {status?.enabled && (
          <>
            <p className="text-sm text-text-2 mb-1">2FA is on. Backup codes left: <strong>{status.backup_codes_left}</strong>.</p>
            <p className="text-xs text-text-3 mb-4">To change these settings enter your password and a current code (or a backup code).</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <input type="password" aria-label="Current password" placeholder="Current password" autoComplete="current-password" value={mg.password} onChange={(e) => setMg({ ...mg, password: e.target.value })} className={input} />
              <input aria-label="2FA code" placeholder="6-digit or backup code" autoComplete="one-time-code" value={mg.otp} onChange={(e) => setMg({ ...mg, otp: e.target.value })} className={`${input} font-mono`} />
            </div>
            <div className="flex gap-2.5 flex-wrap">
              <button type="button" disabled={busy || !mg.password || !mg.otp} onClick={act(securityApi.backupCodes, (d) => { setCodes(d.backup_codes); setMsg({ ok: true, text: 'New backup codes created - the old ones no longer work.' }) })} className={`${btn} bg-bg-alt text-text-2`}><Icon name="key" />New backup codes</button>
              <button type="button" disabled={busy || !mg.password || !mg.otp} onClick={() => confirm('Turn off two-factor authentication? The admin password cannot be changed until you turn it on again.') && act(securityApi.disable, () => { setCodes(null); setMsg({ ok: true, text: 'Two-factor authentication is now off.' }) })()} className={`${btn} border border-accent-red text-accent-red`}>Turn off 2FA</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
