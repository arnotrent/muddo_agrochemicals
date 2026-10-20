import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '../api/services'
import { tokenStore, startTokenKeeper } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)   // { id, username, role: 'admin'|'agent', agent?, staff? }
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async (attempt = 0) => {
    if (!tokenStore.getAccess() && !tokenStore.getRefresh()) { setUser(null); setLoading(false); return }
    try {
      const { data } = await authApi.me()
      setUser(data); setLoading(false)
    } catch (err) {
      const s = err.response?.status
      if (s === 401 || s === 403) { tokenStore.clear(); setUser(null); setLoading(false) }          // the server really rejected us
      else if (typeof attempt === 'number' && attempt < 6) setTimeout(() => refreshMe(attempt + 1), 3000 * (attempt + 1)) // offline / server waking: KEEP the session and retry
      else setLoading(false)
    }
  }, [])

  useEffect(() => { refreshMe() }, [refreshMe])

  // keep the access token fresh while signed in; react to the session ending (here or in another tab)
  useEffect(() => {
    if (!user) return undefined
    const stop = startTokenKeeper()
    const expired = () => setUser(null)
    const storage = (e) => { if (e.key === 'muddo_refresh' && !e.newValue) setUser(null) }
    window.addEventListener('auth:expired', expired)
    window.addEventListener('storage', storage)
    return () => { stop(); window.removeEventListener('auth:expired', expired); window.removeEventListener('storage', storage) }
  }, [user])

  const login = async (username, password) => {
    const { data } = await authApi.login(username, password)
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await authApi.logout(tokenStore.getRefresh()) } catch { /* cleared client-side regardless */ }
    tokenStore.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
