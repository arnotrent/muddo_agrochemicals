import { useEffect, useState } from 'react'
import api from '../../api/client'
import Icon from '../../components/Icon'

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('')

  const load = () => api.get('/admin/contact-requests/').then(({ data }) => setRequests(data.results || data))
  useEffect(() => { load() }, [])

  const filtered = requests.filter((r) => !filter || r.status === filter)

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/contact-requests/${id}/`, { status })
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="envelope" />Customer Enquiries</h1>
      <div className="flex gap-2 mb-4.5 flex-wrap">
        {['', 'new', 'pending', 'resolved'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${filter === s ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>
            {s ? s[0].toUpperCase() + s.slice(1) : `All (${requests.length})`}
          </button>
        ))}
      </div>
      <div className="bg-bg-card border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Ref #</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Update</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="p-3 font-mono text-xs text-accent-blue font-bold whitespace-nowrap">{r.ref_number}</td>
                <td className="p-3"><strong>{r.name}</strong><div className="text-xs text-text-3">{r.email}</div></td>
                <td className="p-3">{r.subject}<div className="text-xs text-text-3 max-w-[200px] truncate">{r.message}</div></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'resolved' ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-alt text-accent-blue'}`}>{r.status}</span></td>
                <td className="p-3">
                  <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} className="px-2 py-1.5 rounded-lg border border-border bg-bg-input text-sm">
                    <option value="new">New</option><option value="pending">Pending</option><option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No enquiries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
