import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const links = [
  { to: '/admin', end: true, icon: 'tachometer-alt', label: 'Overview' },
  { to: '/admin/products', icon: 'flask', label: 'Products' },
  { to: '/admin/inventory', icon: 'boxes', label: 'Inventory' },
  { to: '/admin/distributors', icon: 'store', label: 'Distributors' },
  { to: '/admin/requests', icon: 'envelope', label: 'Enquiries' },
  { to: '/admin/supply-requests', icon: 'truck', label: 'Supply Requests' },
  { to: '/admin/agents', icon: 'users', label: 'Field Agents' },
  { to: '/admin/chat', icon: 'comments', label: 'Messages' },
  { to: '/admin/site-content', icon: 'edit', label: 'Site Content' },
  { to: '/admin/newsletter', icon: 'paper-plane', label: 'Newsletter' },
  { to: '/admin/import', icon: 'upload', label: 'Import CSV' },
  { to: '/admin/settings', icon: 'cog', label: 'Settings' },
]

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-bg">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-[1999] md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        className={`w-[248px] flex-shrink-0 bg-bg-deep flex flex-col fixed md:sticky top-0 h-screen overflow-y-auto z-[2000] transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 flex items-center gap-2.5 border-b border-white/10">
          <img src="/logo_full.png" alt="MACL" className="h-9 rounded-lg bg-white p-0.5" />
          <div>
            <span className="font-bold text-sm text-white block leading-tight">MACL Admin</span>
            <span className="text-[0.68rem] text-white/40">Muddo Agro Chemicals</span>
          </div>
        </div>
        <nav className="py-2.5 flex-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-blue text-bg-deep font-bold shadow-glow-blue' : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon name={l.icon} className="w-5 text-center" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-2">
          <Link to="/" target="_blank" className="flex items-center gap-2.5 px-3 py-2.5 mx-1 rounded-lg text-sm text-white/65 hover:bg-white/10">
            <Icon name="globe" />View Website
          </Link>
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 mx-1 rounded-lg text-sm text-accent-red hover:bg-white/10"
          >
            <Icon name="sign-out-alt" />Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-[62px] bg-bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-[100]">
          <button className="md:hidden border border-border rounded-lg w-9 h-9 flex items-center justify-center" onClick={() => setMobileOpen(true)}>
            <Icon name="list" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-text-3 hidden sm:inline">{user?.staff?.display_name || user?.username}</span>
            <button onClick={toggleTheme} className="w-8.5 h-8.5 rounded-lg border border-border flex items-center justify-center text-text-2">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
