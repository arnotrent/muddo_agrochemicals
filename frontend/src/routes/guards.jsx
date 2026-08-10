import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

/** Requires ANY authenticated user (admin or agent). */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

/** Requires a specific role. Redirects to the correct portal if logged in as the other role. */
export function RequireRole({ role }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />
  }
  return <Outlet />
}
