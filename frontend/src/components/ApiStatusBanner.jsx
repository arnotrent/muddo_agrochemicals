import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../api/client'
import Icon from './Icon'

/**
 * Pings the backend's /health/ endpoint once on app load. If it fails,
 * shows a persistent, impossible-to-miss banner explaining exactly why
 * instead of leaving the person staring at a page that "does nothing" —
 * that silent-failure experience is what prompted this component.
 */
export default function ApiStatusBanner() {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'unreachable' | 'cors'

  useEffect(() => {
    const healthUrl = API_BASE.replace(/\/api\/v1\/?$/, '/health/')
    axios
      .get(healthUrl, { timeout: 8000 })
      .then(() => setStatus('ok'))
      .catch((err) => {
        // A CORS block and a network failure look identical to axios
        // (both come back with no `response`), so this can't perfectly
        // distinguish them — but either way the actionable advice for
        // the deployer is the same list of things to check.
        setStatus(err.response ? 'ok' : 'unreachable')
      })
  }, [])

  if (status !== 'unreachable') return null

  return (
    <div className="bg-accent-red text-white text-sm px-4 py-3 flex items-start gap-2.5 sticky top-0 z-[10002]">
      <Icon name="exclamation-triangle" className="mt-0.5 flex-shrink-0" />
      <div>
        <strong>Can't reach the backend API</strong> at <code className="bg-black/20 px-1.5 py-0.5 rounded">{API_BASE}</code>.
        {' '}This usually means one of: the backend isn't deployed/running, <code className="bg-black/20 px-1.5 py-0.5 rounded">VITE_API_BASE_URL</code> wasn't
        set at build time on this hosting platform (it must be set before running <code className="bg-black/20 px-1.5 py-0.5 rounded">npm run build</code>, then rebuilt),
        or the backend's <code className="bg-black/20 px-1.5 py-0.5 rounded">CORS_ALLOWED_ORIGINS</code> doesn't include this site's exact URL.
      </div>
    </div>
  )
}
