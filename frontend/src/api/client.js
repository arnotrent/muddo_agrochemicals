import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

// Loud, not silent: a deployed build still pointing at localhost means VITE_API_BASE_URL was not
// set at BUILD time (Vite bakes it in when `npm run build` runs).
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

// ── Cold-start resilience ─────────────────────────────────────────
// Free hosting puts the API to sleep after ~15 idle minutes; the first request then fails with a
// network error / 502 / 503 / 504 while it wakes up (up to a minute). Idempotent GETs are retried
// with backoff, and the UI is told (window event) so it can show "waking up the server…".
const RETRY_DELAYS = [1500, 3500, 7000, 12000]
const isWakeError = (error) => !error.response || [502, 503, 504].includes(error.response.status)
const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Single-flight token refresh: if several requests 401 at once, only one refresh call is made.
let refreshPromise = null

api.interceptors.response.use(
  (res) => { if (res.config.__retries) emit('api:recovered'); return res },
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

    if (error.response?.status === 401 && !original._retry && tokenStore.getRefresh()) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE}/auth/refresh/`, { refresh: tokenStore.getRefresh() })
            .then((r) => { tokenStore.set(r.data.access, r.data.refresh || null); return r.data.access })
            .finally(() => { refreshPromise = null })
        }
        const newAccess = await refreshPromise
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (refreshErr) {
        tokenStore.clear()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      }
    }
    return Promise.reject(error)
  }
)

export default api
