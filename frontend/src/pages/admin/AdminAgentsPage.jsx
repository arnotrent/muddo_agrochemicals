import { useEffect, useState } from 'react'
import { agentsApi } from '../../api/services'
import Icon from '../../components/Icon'

const EMPTY = { name: '', username: '', email: '', phone: '', region: 'Central', district: '', password: '' }

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => agentsApi.adminList().then(({ data }) => setAgents(data.results || data))
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await agentsApi.adminCreate(form)
      setForm(EMPTY)
      setFlash({ ok: true, msg: `Agent ${form.name} added!` })
      load()
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.errors?.username?.[0] || err.response?.data?.detail || 'Could not add agent.' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id) => { await agentsApi.adminToggle(id); load() }
  const handleDelete = async (a) => {
    if (!confirm(`Delete "${a.name}"? This can't be undone.`)) return
    await agentsApi.adminDelete(a.id)
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="users" />Field Agents</h1>

      {flash && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <div className="bg-bg-card border border-border rounded-card self-start">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="user-plus" className="text-accent-blue" />Add New Agent</div>
          <form onSubmit={handleAdd} className="p-5">
            {[
              ['name', 'Full Name *', 'text', true],
              ['username', 'Username *', 'text', true],
              ['email', 'Email', 'email', false],
              ['phone', 'Phone', 'text', false],
              ['district', 'District', 'text', false],
            ].map(([key, label, type, required]) => (
              <div key={key} className="mb-3.5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}</label>
                <input type={type} required={required} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1" />
              </div>
            ))}
            <div className="mb-3.5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Region</label>
              <select value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                {['Central', 'Eastern', 'Northern', 'Western'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Password *</label>
              <input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1" />
            </div>
            <button disabled={saving} className="w-full py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"><Icon name="user-plus" />{saving ? 'Adding…' : 'Add Agent'}</button>
          </form>
        </div>

        <div className="bg-bg-card border border-border rounded-card self-start">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />All Agents ({agents.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Agent</th><th className="p-3 text-left">Region</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-accent-blue text-white flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
                          {a.avatar_url ? <img src={a.avatar_url} className="w-full h-full object-cover" /> : a.name?.[0]?.toUpperCase()}
                        </div>
                        <div><strong>{a.name}</strong><div className="text-xs text-text-3">@{a.username}</div></div>
                      </div>
                    </td>
                    <td className="p-3 text-text-3">{a.region}<div className="text-xs">{a.district}</div></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.status === 'active' ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-alt text-text-3'}`}>{a.status}</span></td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleToggle(a.id)} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name={a.status === 'active' ? 'pause' : 'play'} /></button>
                        <button onClick={() => handleDelete(a)} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!agents.length && <tr><td colSpan={4} className="text-center text-text-3 p-8">No agents yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
