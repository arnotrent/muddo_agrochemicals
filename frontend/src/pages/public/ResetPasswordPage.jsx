import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { recoveryApi } from '../../api/recovery'
import AuthShell from '../../components/auth/AuthShell'
import Icon from '../../components/Icon'

const rules = (p) => [
  ['At least 8 characters', p.length >= 8],
  ['Not only numbers', p.length > 0 && !/^\d+$/.test(p)],
  ['Contains a letter and a number or symbol', /[A-Za-z]/.test(p) && /[^A-Za-z]/.test(p)],
]

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''
  const [valid, setValid] = useState(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!uid || !token) return setValid(false)
    recoveryApi.validate(uid, token).then(({ data }) => setValid(!!data.valid)).catch(() => setValid(false))
  }, [uid, token])

  const submit = async (e) => {
    e.preventDefault()
    if (pw !== pw2) return setState({ ok: false, msg: 'The two passwords do not match.' })
    setState('sending')
    try {
      const { data } = await recoveryApi.confirm({ uid, token, new_password: pw, confirm_password: pw2 })
      setState({ ok: true, msg: data.detail })
    } catch (err) {
      setState({ ok: false, msg: err.response?.data?.detail || 'Could not reset the password.' })
    }
  }
  const cls = 'w-full px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you don't use anywhere else.">
      {valid === null && <p className="text-text-3 text-sm">Checking your link…</p>}
      {valid === false && (
        <div role="alert" className="p-4 rounded-lg bg-accent-red/10 text-accent-red text-sm">
          <strong className="block mb-1">This link is invalid or has expired.</strong>
          Reset links work once and last 1 hour. <Link to="/forgot-password" className="underline font-bold">Request a new one</Link>.
        </div>
      )}
      {valid && state?.ok && (
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center mx-auto mb-3"><Icon name="check-circle" size="1.8rem" /></div>
          <p className="text-text-1 font-semibold mb-5">{state.msg}</p>
          <Link to="/login" className="inline-flex px-6 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm">Go to sign in</Link>
        </div>
      )}
      {valid && !state?.ok && (
        <form onSubmit={submit}>
          {state && state !== 'sending' && <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">{state.msg}</div>}
          <label htmlFor="rp1" className="text-sm font-semibold text-text-2 block mb-1.5">New password</label>
          <div className="relative mb-3">
            <input id="rp1" type={show ? 'text' : 'password'} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className={`${cls} pr-10`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-3"><Icon name={show ? 'eye-slash' : 'eye'} /></button>
          </div>
          <ul className="mb-3 space-y-1 text-xs">
            {rules(pw).map(([t, ok]) => <li key={t} className={ok ? 'text-accent-green' : 'text-text-3'}><Icon name={ok ? 'check' : 'clock'} className="mr-1.5" />{t}</li>)}
          </ul>
          <label htmlFor="rp2" className="text-sm font-semibold text-text-2 block mb-1.5">Confirm new password</label>
          <input id="rp2" type={show ? 'text' : 'password'} required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" className={`${cls} mb-5`} />
          <button disabled={state === 'sending'} className="w-full py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            <Icon name="lock" />{state === 'sending' ? 'Saving…' : 'Save new password'}
          </button>
          <p className="text-xs text-text-3 mt-2.5">Saving signs you out on every device.</p>
        </form>
      )}
    </AuthShell>
  )
}
