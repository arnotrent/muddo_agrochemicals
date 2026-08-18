import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/Icon'

const SLIDES = [
  { icon: 'bug', tag: 'Pesticides', img: '/images/hero_pesticides.jpg', title: 'Protection that actually holds up in the field.', desc: 'Broad-spectrum insecticides trusted by farmers across all four regions of Uganda.' },
  { icon: 'seedling', tag: 'Herbicides', img: '/images/hero_herbicides.jpg', title: 'Clear the weeds, keep the crop.', desc: 'Selective and non-selective control for even the most stubborn Couch and Kikuyu grass.' },
  { icon: 'microscope', tag: 'Fungicides', img: '/images/hero_fungicides.jpg', title: "Built for Uganda's humidity.", desc: 'Protective and curative fungicides that hold up against blight and mildew season after season.' },
  { icon: 'boxes', tag: 'Others & Equipment', img: '/images/hero_fertilizers.jpg', title: 'Everything else the farm needs.', desc: 'From basal fertilizer to a dependable knapsack sprayer — genuine, in stock, MAAIF-registered.' },
]

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slide, setSlide] = useState(0)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500)
    return () => clearInterval(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username.trim(), password)
      const dest = location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/portal')
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-bg">
      <div className="hidden lg:block relative overflow-hidden bg-bg-deep">
        {SLIDES.map((s, i) => (
          <div
            key={s.tag}
            className={`absolute inset-0 flex items-end p-14 bg-cover bg-center transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,.25) 0%, rgba(15,23,42,.9) 100%), url('${s.img}')` }}
          >
            <div className="relative z-10 text-white">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent-blue/15 border border-accent-blue/35 text-accent-blue text-xs font-bold uppercase tracking-wide mb-3.5">
                <Icon name={s.icon} />{s.tag}
              </div>
              <h2 className="text-4xl font-bold mb-2.5 leading-tight">{s.title}</h2>
              <p className="text-white/78 max-w-[40ch] leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
        <div className="absolute top-9 left-14 z-10 flex items-center gap-2.5">
          <img src="/logo_icon.png" alt="MACL" className="h-10 rounded-lg bg-white p-0.5" />
          <span className="font-bold text-white">MUDDO AGRO</span>
        </div>
        <div className="absolute bottom-6.5 right-14 z-20 flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.tag}
              onClick={() => setSlide(i)}
              aria-label={`Show ${s.tag} slide`}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5.5 bg-accent-blue' : 'w-1.5 bg-white/35'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden text-center mb-6">
            <img src="/logo_icon.png" alt="MACL" className="h-14 mx-auto rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-text-1 mb-1.5">Staff Portal</h1>
          <p className="text-sm text-text-3 mb-7">Authorised personnel only — administrators and field agents.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-accent-red/[0.08] border border-accent-red text-accent-red text-sm flex items-center gap-2">
              <Icon name="exclamation-circle" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Username</label>
              <div className="relative">
                <Icon name="user" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-3 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue focus:shadow-glow-blue"
                  placeholder="Enter username"
                />
              </div>
            </div>
            <div className="mb-5.5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Password</label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue focus:shadow-glow-blue"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-3">
                  <Icon name={showPw ? 'eye-slash' : 'eye'} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue hover:bg-accent-blue-hover disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Icon name="sign-in-alt" />{loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-5 pt-4 border-t border-border">
            <Link to="/" className="text-sm text-text-3 flex items-center justify-center gap-1.5">
              <Icon name="arrow-left" />Back to Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
