import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import site from '../data/siteConfig'

const navLinkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm transition-colors ${
    isActive ? 'text-accent-blue font-bold' : 'text-text-2 hover:text-accent-blue hover:bg-bg-alt'
  }`

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
  }, [menuOpen])

  // Scroll progress bar + back-to-top visibility — restores the original
  // site's .scroll-progress and #backToTop behavior from static/js/main.js.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll to top and replay the page-in fade whenever the route changes —
  // matches the original's per-page-load `animation: pageIn` on <body>.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-2">
      <div
        className="fixed top-0 left-0 h-[3px] z-[10001] bg-accent-blue pointer-events-none transition-[width] duration-100"
        style={{ width: `${scrollPct}%` }}
      />
      <nav className="sticky top-0 z-50 bg-bg-card border-b border-border">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-8 h-[68px] flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/logo_icon.png" alt="MACL" className="h-10 w-auto max-w-[170px] object-contain" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-sm text-text-1">MUDDO AGRO</span>
              <span className="text-[0.6rem] text-text-3 font-semibold tracking-wider uppercase mt-0.5">
                Chemicals LTD &middot; MAAIF Registered
              </span>
            </div>
          </Link>

          <ul className="hidden lg:flex items-center gap-0.5">
            <li><NavLink to="/" end className={navLinkClass}>Home</NavLink></li>
            <li className="relative group">
              <button className="px-3 py-1.5 rounded-lg text-sm text-text-2 hover:text-accent-blue hover:bg-bg-alt flex items-center gap-1">
                Products <Icon name="chevron-down" size="0.6rem" />
              </button>
              <ul className="absolute top-full left-0 mt-2 bg-bg-card border border-border rounded-2xl min-w-[260px] p-2 shadow-lg opacity-0 invisible -translate-y-1.5 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all z-50">
                <li><Link to="/products/pesticides" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-bg-alt hover:text-accent-blue"><Icon name="bug" className="text-accent-blue" />Pesticides</Link></li>
                <li><Link to="/products/herbicides" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-bg-alt hover:text-accent-blue"><Icon name="seedling" className="text-accent-blue" />Herbicides</Link></li>
                <li><Link to="/products/fungicides" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-bg-alt hover:text-accent-blue"><Icon name="microscope" className="text-accent-blue" />Fungicides</Link></li>
                <li><Link to="/products/other" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-bg-alt hover:text-accent-blue"><Icon name="boxes" className="text-accent-blue" />Others & Equipment</Link></li>
                <li className="border-t border-border mt-1.5 pt-1.5"><Link to="/compare" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-bg-alt hover:text-accent-blue"><Icon name="balance-scale" className="text-accent-blue" />Compare Products</Link></li>
              </ul>
            </li>
            <li><NavLink to="/distributors" className={navLinkClass}>Find a Store</NavLink></li>
            <li><NavLink to="/about" className={navLinkClass}>About</NavLink></li>
            <li><NavLink to="/contact" className={navLinkClass}>Contact</NavLink></li>
            {user && (
              <li>
                <NavLink to={user.role === 'admin' ? '/admin' : '/portal'} className="px-3 py-1.5 rounded-lg text-sm text-accent-blue flex items-center gap-1.5">
                  <Icon name={user.role === 'admin' ? 'cog' : 'user'} />
                  {user.role === 'admin' ? 'Admin' : 'Portal'}
                </NavLink>
              </li>
            )}
          </ul>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="border border-border rounded-lg w-9 h-9 flex items-center justify-center text-text-3 hover:border-accent-blue hover:text-accent-blue transition-colors"
              aria-label="Toggle dark mode"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button
              className="lg:hidden flex flex-col gap-1.5 p-2"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-text-1 rounded" />
              <span className="block w-5 h-0.5 bg-text-1 rounded" />
              <span className="block w-5 h-0.5 bg-text-1 rounded" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[999] lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 h-full w-[82vw] max-w-[320px] bg-bg-card border-l border-border overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-border">
              <span className="font-bold text-text-1">Menu</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="times" /></button>
            </div>
            {[
              ['/', 'Home', 'home'],
              ['/products/pesticides', 'Pesticides', 'bug'],
              ['/products/herbicides', 'Herbicides', 'seedling'],
              ['/products/fungicides', 'Fungicides', 'microscope'],
              ['/products/other', 'Others & Equipment', 'boxes'],
              ['/compare', 'Compare Products', 'balance-scale'],
              ['/distributors', 'Find a Store', 'store'],
              ['/about', 'About Us & FAQ', 'info-circle'],
              ['/contact', 'Contact Us', 'envelope'],
              ['/track', 'Track Enquiry', 'search'],
            ].map(([to, label, icon]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 text-text-1 text-sm border-b border-border hover:bg-bg-alt"
              >
                <Icon name={icon} className="text-accent-blue w-5 text-center" />
                {label}
              </Link>
            ))}
            <div className="p-4">
              {user ? (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    navigate(user.role === 'admin' ? '/admin' : '/portal')
                  }}
                  className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm"
                >
                  Go to {user.role === 'admin' ? 'Admin Panel' : 'Agent Portal'}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-btn border border-border text-text-3 text-sm"
                >
                  <Icon name="lock" /> Staff Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 animate-pageIn" key={location.pathname}>
        <Outlet />
      </main>

      <footer className="bg-bg-deep text-white/70 pt-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-8 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            <div>
              <img src="/logo_icon.png" alt="MACL" className="h-12 mb-3.5 bg-white rounded-lg p-1" />
              <p className="text-sm leading-relaxed text-white/65 max-w-[30ch] mb-3.5">
                Uganda's trusted MAAIF-registered distributor of high-quality agrochemicals since{' '}
                {site.year_founded || '2020'}.
              </p>
              <div className="flex gap-2.5 mt-4">
                {site.facebook_url && (
                  <a href={site.facebook_url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-accent-blue hover:text-bg-deep">
                    <Icon name="facebook-f" />
                  </a>
                )}
                <a href={`https://wa.me/${site.whatsapp_number || ''}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-accent-blue hover:text-bg-deep">
                  <Icon name="whatsapp" />
                </a>
                <a href={`mailto:${site.company_email || ''}`} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-accent-blue hover:text-bg-deep">
                  <Icon name="envelope" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white text-sm font-bold uppercase tracking-wide mb-3.5">Products</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/products/pesticides" className="hover:text-accent-blue">Pesticides</Link></li>
                <li><Link to="/products/herbicides" className="hover:text-accent-blue">Herbicides</Link></li>
                <li><Link to="/products/fungicides" className="hover:text-accent-blue">Fungicides</Link></li>
                <li><Link to="/products/other" className="hover:text-accent-blue">Others & Equipment</Link></li>
                <li><Link to="/compare" className="hover:text-accent-blue">Compare</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-bold uppercase tracking-wide mb-3.5">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-accent-blue">About Us & FAQ</Link></li>
                <li><Link to="/distributors" className="hover:text-accent-blue">Find a Store</Link></li>
                <li><Link to="/contact" className="hover:text-accent-blue">Contact Us</Link></li>
                <li><Link to="/track" className="hover:text-accent-blue">Track Enquiry</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-bold uppercase tracking-wide mb-3.5">Contact & Staff</h4>
              <ul className="space-y-2 text-sm text-white/68">
                <li className="flex gap-2"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{site.company_address}</li>
                <li className="flex gap-2"><Icon name="phone" className="text-accent-blue mt-0.5" /><a href={`tel:${site.company_phone}`}>{site.company_phone}</a></li>
                <li className="flex gap-2"><Icon name="envelope" className="text-accent-blue mt-0.5" /><a href={`mailto:${site.company_email}`}>{site.company_email}</a></li>
              </ul>
              {!user && (
                <Link to="/login" className="flex items-center gap-1.5 text-sm mt-3 hover:text-accent-blue">
                  <Icon name="lock" />Staff Login
                </Link>
              )}
            </div>
          </div>
          <div className="border-t border-white/10 py-4 flex justify-between flex-wrap gap-2 text-xs text-white/40">
            <p>&copy; {new Date().getFullYear()} Muddo Agro Chemicals LTD. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${site.whatsapp_number || ''}?text=Hello%20Muddo%20Agro%2C%20I%20need%20help`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-4 z-[800] w-[52px] h-[52px] rounded-full bg-accent-green text-bg-deep flex items-center justify-center text-2xl shadow-glow-green hover:scale-110 transition-transform"
        aria-label="Chat on WhatsApp"
      >
        <Icon name="whatsapp" size="1.4rem" />
      </a>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-[84px] right-4 z-[800] w-10 h-10 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-glow-blue transition-all ${
          showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <Icon name="arrow-up" size="0.9rem" />
      </button>
    </div>
  )
}
