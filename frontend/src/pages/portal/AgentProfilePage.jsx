import { useEffect, useState } from 'react'
import { agentsApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/Icon'

export default function AgentProfilePage() {
  const { refreshMe } = useAuth()
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    agentsApi.me().then(({ data }) => {
      setProfile(data)
      setDisplayName(data.display_name || '')
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFlash(null)
    try {
      const formData = new FormData()
      formData.append('display_name', displayName)
      if (avatarFile) formData.append('avatar', avatarFile)
      const { data } = await agentsApi.updateMe(formData)
      setProfile(data)
      setFlash({ ok: true, msg: 'Profile updated!' })
      refreshMe()
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.detail || 'Could not save changes.' })
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="user" />My Profile</h1>
      {flash && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <div className="bg-bg-card border border-border rounded-card p-7.5 text-center self-start">
          <div className="w-27.5 h-27.5 rounded-full mx-auto mb-4 overflow-hidden bg-accent-blue flex items-center justify-center text-white text-4xl font-bold">
            {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile.name?.[0]?.toUpperCase()}
          </div>
          <div className="font-extrabold text-text-1">{profile.name}</div>
          {profile.display_name && <div className="text-xs text-text-3 mt-1">originally <strong>{profile.original_name}</strong></div>}
          <div className="text-sm text-text-3 mt-1.5">Field Agent {profile.region && `· ${profile.region}`}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-card self-start">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="edit" className="text-accent-blue" />Edit Display Name & Photo</div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="mb-4">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Display Name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={profile.original_name} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
              <div className="text-xs text-text-3 mt-1.5">This is what admin and other agents see across chat and the portal.</div>
            </div>
            <div className="mb-5">
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Profile Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            </div>
            <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
              <Icon name="save" />{saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
