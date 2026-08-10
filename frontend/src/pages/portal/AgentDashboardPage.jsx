import { useEffect, useState } from 'react'
import { supplyRequestsApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/Icon'

export default function AgentDashboardPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState({ product_name: '', quantity: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState(null)

  const load = () => supplyRequestsApi.mine().then(({ data }) => setRequests(data.results || data))

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await supplyRequestsApi.create(form)
      setForm({ product_name: '', quantity: '', notes: '' })
      setFlash({ ok: true, msg: 'Supply request submitted!' })
      load()
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.detail || 'Could not submit request.' })
    } finally {
      setSubmitting(false)
    }
  }

  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-1">Welcome back, <span className="text-accent-blue">{user?.agent?.name}</span> 👋</h1>
      <p className="text-text-3 text-sm mb-6">{user?.agent?.region}{user?.agent?.district ? ` · ${user.agent.district}` : ''}</p>

      {flash && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['truck', requests.length, 'My Requests'],
          ['clock', pending, 'Pending'],
          ['flask', '—', 'Catalogue'],
        ].map(([icon, val, label]) => (
          <div key={label} className="bg-bg-card border border-border rounded-card p-5.5">
            <div className="w-11.5 h-11.5 rounded-xl bg-bg-alt text-accent-blue flex items-center justify-center mb-3.5"><Icon name={icon} /></div>
            <div className="text-3xl font-bold text-text-1">{val}</div>
            <div className="text-xs font-semibold text-text-3 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="plus-circle" className="text-accent-blue" />New Supply Request</div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="mb-3.5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Product Name *</label>
              <input required value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} placeholder="e.g. MUDDOSATE 480SL — 50 x 1L" className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
            </div>
            <div className="mb-3.5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Quantity Needed *</label>
              <input required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 50 bottles, 10 bags" className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
            </div>
            <div className="mb-4.5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Delivery location, urgency, crop details…" className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue resize-y" />
            </div>
            <button disabled={submitting} className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <Icon name="paper-plane" />{submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />My Recent Requests</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Product</th><th className="p-3 text-left">Qty</th><th className="p-3 text-left">Status</th></tr></thead>
              <tbody>
                {requests.slice(0, 10).map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="p-3"><strong>{r.product_name}</strong>{r.admin_response && <div className="text-xs text-text-3 mt-1">{r.admin_response}</div>}</td>
                    <td className="p-3 text-text-3">{r.quantity}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        r.status === 'approved' ? 'bg-accent-green/15 text-accent-green' : r.status === 'denied' ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-alt text-accent-blue'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!requests.length && <tr><td colSpan={3} className="text-center text-text-3 p-8">No requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
