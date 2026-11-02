import { useState } from 'react'
import api from '../api/client'
import Icon from './Icon'

/** Admin → Settings: runs the backend self-test (routes, picture storage, real upload round-trip) and shows PASS/FAIL. */
export default function SelfTestCard() {
  const [state, setState] = useState(null) // null | 'running' | { ok, checks } | { error }
  const run = async () => {
    setState('running')
    try {
      const { data } = await api.get('/admin/diagnostics/selftest/', { timeout: 60000 })
      setState(data)
    } catch (err) {
      const s = err.response?.status
      setState({ error: s === 404
        ? 'The backend has no self-test route yet (404). Run  python scripts/verify_setup.py --fix  , commit and redeploy the backend.'
        : `The self-test could not run (${s || 'no connection'}): ${err.response?.data?.detail || err.message}` })
    }
  }
  return (
    <div className="bg-bg-card border border-border rounded-card mb-6">
      <div className="p-4 border-b border-border font-bold text-text-1 flex items-center justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-2"><Icon name="shield-alt" className="text-accent-blue" />Self-test (uploads &amp; reviews)</span>
        <button onClick={run} disabled={state === 'running'} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{state === 'running' ? 'Testing…' : 'Run self-test'}</button>
      </div>
      <div className="p-5">
        {!state && <p className="text-sm text-text-3">Checks the review pages' API, picture storage and a real photo upload end-to-end, and tells you exactly what is wrong.</p>}
        {state?.error && <div role="alert" className="p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm">{state.error}</div>}
        {state?.checks && (
          <>
            <div className={`mb-3 p-3 rounded-lg text-sm font-bold ${state.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>{state.ok ? 'Everything passed.' : 'Some checks failed — details below.'}</div>
            <ul className="space-y-2">
              {state.checks.map((c) => (
                <li key={c.name} className="text-sm border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2"><span className={`font-bold flex-shrink-0 ${c.ok ? 'text-accent-green' : 'text-accent-red'}`}>{c.ok ? 'PASS' : 'FAIL'}</span>
                    <div className="min-w-0"><div className="font-semibold text-text-1">{c.name}</div><div className="text-text-3 break-words">{c.detail}</div>
                      {!c.ok && c.fix && <div className="text-text-2 mt-1"><strong>Fix:</strong> {c.fix}</div>}</div></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
