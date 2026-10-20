import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '../api/services'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)   // { id, username, role: 'admin'|'agent', agent?, staff? }
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      tokenStore.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  const login = async (username, password) => {
    const { data } = await authApi.login(username, password)
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await authApi.logout(tokenStore.getRefresh())
    } catch {
      // ignore — we clear client-side regardless
    }
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
