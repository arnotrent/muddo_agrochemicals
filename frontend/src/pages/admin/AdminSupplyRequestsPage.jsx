import { useEffect, useState } from 'react'
import { supplyRequestsApi } from '../../api/services'
import Icon from '../../components/Icon'

export default function AdminSupplyRequestsPage() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState(null) // { id, product_name, agent_name }
  const [status, setStatus] = useState('approved')
  const [response, setResponse] = useState('')

  const load = () => supplyRequestsApi.adminList().then(({ data }) => setRequests(data.results || data))
  useEffect(() => { load() }, [])

  const filtered = requests.filter((r) => !filter || r.status === filter)

  const handleRespond = async (e) => {
    e.preventDefault()
    await supplyRequestsApi.adminRespond(modal.id, { status, response })
    setModal(null)
    setResponse('')
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="truck" />Supply Requests</h1>
      <div className="flex gap-2 mb-4.5 flex-wrap">
        {['', 'pending', 'approved', 'denied'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${filter === s ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>
            {s ? s[0].toUpperCase() + s.slice(1) : `All (${requests.length})`}
          </button>
        ))}
      </div>
      <div className="bg-bg-card border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Agent</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Qty</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Respond</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="p-3"><strong>{r.agent_name}</strong><div className="text-xs text-text-3">{r.agent_region}</div></td>
                <td className="p-3"><strong>{r.product_name}</strong></td>
                <td className="p-3 text-text-3">{r.quantity}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'approved' ? 'bg-accent-green/15 text-accent-green' : r.status === 'denied' ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-alt text-accent-blue'}`}>{r.status}</span></td>
                <td className="p-3">
                  {r.status === 'pending' && (
                    <button onClick={() => { setModal(r); setStatus('approved'); setResponse('') }} className="px-3 py-1.5 rounded-btn bg-accent-blue text-white text-xs font-bold flex items-center gap-1.5"><Icon name="reply" />Respond</button>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No supply requests yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/55 z-[2000] flex items-center justify-center p-5" onClick={() => setModal(null)}>
          <div className="bg-bg-card rounded-2xl p-7.5 max-w-[480px] w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-text-1 mb-1.5">Respond to Supply Request</h3>
            <p className="text-sm text-text-3 mb-5">{modal.agent_name} — {modal.product_name}</p>
            <form onSubmit={handleRespond}>
              <div className="mb-3.5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Decision</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                  <option value="approved">Approve</option>
                  <option value="denied">Deny</option>
                </select>
              </div>
              <div className="mb-5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Response Message</label>
                <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Details on delivery, availability, or reason for denial…" className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y" />
              </div>
              <div className="flex gap-2.5">
                <button className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="paper-plane" />Send Response</button>
                <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm flex items-center gap-2"><Icon name="times" />Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
