import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/auth/AuthShell'
import Icon from '../../components/Icon'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await login(username.trim(), password)
      const dest = location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/portal')
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.response?.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
        : err.response?.data?.detail || 'Could not sign in — check your connection and try again.')
    } finally { setLoading(false) }
  }

  return (
    <AuthShell title="Staff Portal" subtitle="Authorised personnel only — administrators and field agents.">
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/[0.08] border border-accent-red text-accent-red text-sm flex items-center gap-2">
          <Icon name="exclamation-circle" />{error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="lg-user" className="text-sm font-semibold text-text-2 block mb-1.5">Username</label>
          <div className="relative">
            <Icon name="user" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
            <input id="lg-user" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" placeholder="Enter username"
              className="w-full pl-10 pr-3 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue focus:shadow-glow-blue" />
          </div>
        </div>
        <div className="mb-2">
          <label htmlFor="lg-pw" className="text-sm font-semibold text-text-2 block mb-1.5">Password</label>
          <div className="relative">
            <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
            <input id="lg-pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter password"
              className="w-full pl-10 pr-10 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue focus:shadow-glow-blue" />
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-3">
              <Icon name={showPw ? 'eye-slash' : 'eye'} />
            </button>
          </div>
        </div>
        <div className="text-right mb-5.5">
          <Link to="/forgot-password" className="text-sm font-semibold text-accent-blue hover:underline">Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue hover:bg-accent-blue-hover disabled:opacity-60 flex items-center justify-center gap-2">
          <Icon name="sign-in-alt" />{loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  )
}
