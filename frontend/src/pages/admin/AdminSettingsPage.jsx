import { useEffect, useState } from 'react'
import { analyticsApi, agentsApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'

export default function AdminSettingsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [agents, setAgents] = useState([])
  const [resetForm, setResetForm] = useState({ agent_id: '', new_agent_password: '' })
  const [sysinfo, setSysinfo] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    agentsApi.adminList().then(({ data }) => setAgents(data.results || data))
    analyticsApi.sysinfo().then(({ data }) => setSysinfo(data))
  }, [])

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    try {
      await analyticsApi.changePassword(pwForm)
      setFlash({ ok: true, msg: 'Password updated. Please log in again.' })
      setTimeout(async () => { await logout(); navigate('/login') }, 1500)
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.detail || 'Could not update password.' })
    }
  }

  const handleResetAgent = async (e) => {
    e.preventDefault()
    try {
      const { data } = await analyticsApi.resetAgentPassword(resetForm)
      setFlash({ ok: true, msg: data.detail })
      setResetForm({ agent_id: '', new_agent_password: '' })
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.detail || 'Could not reset password.' })
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="cog" />Settings</h1>

      {flash && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="lock" className="text-accent-blue" />Change Admin Password</div>
          <form onSubmit={handlePasswordChange} className="p-5">
            <PwField label="Current Password *" value={pwForm.old_password} onChange={(v) => setPwForm((f) => ({ ...f, old_password: v }))} />
            <PwField label="New Password *" value={pwForm.new_password} onChange={(v) => setPwForm((f) => ({ ...f, new_password: v }))} placeholder="Minimum 8 characters" />
            <PwField label="Confirm New Password *" value={pwForm.confirm_password} onChange={(v) => setPwForm((f) => ({ ...f, confirm_password: v }))} />
            <button className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="save" />Update Password</button>
          </form>
        </div>

        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="key" className="text-accent-blue" />Reset Agent Password</div>
          <form onSubmit={handleResetAgent} className="p-5">
            <div className="mb-3.5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Select Agent *</label>
              <select required value={resetForm.agent_id} onChange={(e) => setResetForm((f) => ({ ...f, agent_id: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                <option value="">Choose agent…</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name} (@{a.username})</option>)}
              </select>
            </div>
            <PwField label="New Password *" value={resetForm.new_agent_password} onChange={(v) => setResetForm((f) => ({ ...f, new_agent_password: v }))} />
            <button className="px-5 py-2.5 rounded-btn bg-accent-green text-bg-deep font-bold text-sm flex items-center gap-2"><Icon name="key" />Reset Password</button>
          </form>
        </div>
      </div>

      {sysinfo && (
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="info-circle" className="text-accent-blue" />System Information</div>
          <div className="p-5 grid sm:grid-cols-3 gap-3.5">
            {[
              ['Total Products', sysinfo.total_products], ['Total Agents', sysinfo.total_agents],
              ['Total Enquiries', sysinfo.total_enquiries], ['Distributors', sysinfo.distributors],
              ['Logged in as', sysinfo.logged_in_as], ['Django', sysinfo.django_version],
            ].map(([label, value]) => (
              <div key={label} className="p-3.5 bg-bg-alt rounded-lg border border-border">
                <div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1">{label}</div>
                <div className="text-sm font-bold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PwField({ label, value, onChange, placeholder = '' }) {
  return (
    <div className="mb-3.5">
      <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}</label>
      <input type="password" required value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
    </div>
  )
}
