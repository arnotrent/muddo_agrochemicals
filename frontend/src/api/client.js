import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
if (!isLocalHost && API_BASE.includes('127.0.0.1')) {
  // eslint-disable-next-line no-console
  console.error('[Muddo Agro] VITE_API_BASE_URL was not set at build time — this deployed site is still pointing at ' +
    'http://127.0.0.1:8000. Set it in your host\'s BUILD-time environment variables and REBUILD.')
}

const ACCESS_KEY = 'muddo_access'
const REFRESH_KEY = 'muddo_refresh'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

const api = axios.create({ baseURL: API_BASE, timeout: 45000 })

api.interceptors.request.use((config) => {
  const access = tokenStore.getAccess()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

const RETRY_DELAYS = [1500, 3500, 7000, 12000]
const isWakeError = (error) => !error.response || [502, 503, 504].includes(error.response.status)
const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isMutation = (cfg) => cfg?.method && cfg.method.toLowerCase() !== 'get' && !/\/auth\//.test(cfg.url || '')

// ── Session keeping ──────────────────────────────────────────────
// Why people were being signed out after a few minutes: ANY failed token refresh (a brief network blip, the free server
// waking up, a 502 …) was treated as "session over". Now only a DEFINITIVE answer from the server (400/401 = the refresh
// token itself is rejected) ends the session; transient failures are retried and never log anyone out. Refreshing is
// serialised across requests AND browser tabs (Web Locks), because rotating refresh tokens can only be used once.
const expOf = (jwt) => { try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000 } catch { return 0 } }
const isDefinitive = (err) => !!err.response && [400, 401].includes(err.response.status)

let inflight = null
export function refreshAccess(stale) {
  const run = async () => {
    const current = tokenStore.getAccess()
    if (stale && current && current !== stale) return current // another tab/request already refreshed
    for (let i = 0; ; i++) {
      const refresh = tokenStore.getRefresh()
      if (!refresh) { const e = new Error('No refresh token'); e.definitive = true; throw e }
      try {
        const r = await axios.post(`${API_BASE}/auth/refresh/`, { refresh }, { timeout: 30000 })
        tokenStore.set(r.data.access, r.data.refresh || refresh)
        return r.data.access
      } catch (err) {
        if (isDefinitive(err)) {
          const latest = tokenStore.getRefresh()
          if (latest && latest !== refresh) continue // another tab rotated it while we were waiting — use the new one
          err.definitive = true
          throw err
        }
        if (i >= 3) throw err // still unreachable: give up on THIS request, keep the session
        await sleep([1500, 4000, 9000][i])
      }
    }
  }
  if (!inflight) {
    inflight = (navigator.locks ? navigator.locks.request('muddo-token-refresh', run) : run()).finally(() => { inflight = null })
  }
  return inflight
}

/** Renews the access token quietly shortly BEFORE it expires, so nobody ever hits an expired token mid-task. */
export function startTokenKeeper() {
  const check = async () => {
    const access = tokenStore.getAccess()
    if (!access || !tokenStore.getRefresh() || document.hidden) return
    if (expOf(access) - Date.now() < 3 * 60 * 1000) {
      try { await refreshAccess(access) } catch (e) { if (e.definitive) { tokenStore.clear(); emit('auth:expired') } }
    }
  }
  const t = setInterval(check, 30000)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('online', check)
  check()
  return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); window.removeEventListener('online', check) }
}

api.interceptors.response.use(
  (res) => {
    if (res.config.__retries) emit('api:recovered')
    if (isMutation(res.config)) emit('notifications:refresh')
    return res
  },
  async (error) => {
    const original = error.config
    if (!original) return Promise.reject(error)

    if (original.method === 'get' && isWakeError(error) && (original.__retries || 0) < RETRY_DELAYS.length) {
      original.__retries = (original.__retries || 0) + 1
      emit('api:retrying', { attempt: original.__retries, of: RETRY_DELAYS.length })
      await sleep(RETRY_DELAYS[original.__retries - 1])
      return api(original)
    }
    if (original.__retries) emit('api:failed')

    if (error.response?.status === 401 && !original._retry && tokenStore.getRefresh() && !/\/auth\/(login|refresh)\//.test(original.url || '')) {
      original._retry = true
      const stale = (original.headers?.Authorization || '').replace('Bearer ', '')
      try {
        const newAccess = await refreshAccess(stale)
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (refreshErr) {
        if (refreshErr.definitive) { tokenStore.clear(); emit('auth:expired') }
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default api
