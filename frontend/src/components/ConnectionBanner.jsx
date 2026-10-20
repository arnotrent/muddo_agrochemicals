import { useEffect, useState } from 'react'

/** Friendly status while a sleeping free-tier API wakes up (driven by api/client.js events). */
export default function ConnectionBanner() {
  const [state, setState] = useState(null) // null | {attempt} | 'failed'
  useEffect(() => {
    const retry = (e) => setState({ attempt: e.detail.attempt })
    const ok = () => setState(null)
    const fail = () => setState('failed')
    window.addEventListener('api:retrying', retry); window.addEventListener('api:recovered', ok); window.addEventListener('api:failed', fail)
    return () => { window.removeEventListener('api:retrying', retry); window.removeEventListener('api:recovered', ok); window.removeEventListener('api:failed', fail) }
  }, [])
  if (!state) return null
  const failed = state === 'failed'
  return (
    <div role="status" aria-live="polite" className={`fixed top-0 inset-x-0 z-[10000] px-4 py-2.5 text-sm text-center font-semibold ${failed ? 'bg-accent-red text-white' : 'bg-accent-blue text-white'}`}>
      {failed
        ? <>We couldn't reach the server. Please check your connection and <button className="underline font-bold" onClick={() => window.location.reload()}>reload the page</button>.</>
        : <><span className="inline-block w-3 h-3 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin align-[-2px]" />Connecting to the server… it may take up to a minute to wake up after being idle.</>}
    </div>
  )
}
