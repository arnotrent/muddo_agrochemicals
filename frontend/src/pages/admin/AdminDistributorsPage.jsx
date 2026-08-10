import { useEffect, useState } from 'react'
import { distributorsApi } from '../../api/services'
import Icon from '../../components/Icon'

const COUNTRIES = ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan', 'DR Congo', 'Other']
const EMPTY = { name: '', country: 'Uganda', region: '', district: '', address: '', phone: '', email: '', lat: '', lng: '' }

export default function AdminDistributorsPage() {
  const [distributors, setDistributors] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => distributorsApi.list({ page_size: 200 }).then(({ data }) => setDistributors(data.results || data))
  useEffect(() => { load() }, [])

  const activeForm = editing ? form : form
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFlash(null)
    const payload = { ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
    try {
      if (editing) await distributorsApi.update(editing, payload)
      else await distributorsApi.create(payload)
      setFlash({ ok: true, msg: editing ? 'Outlet updated!' : 'Outlet added!' })
      setForm(EMPTY)
      setEditing(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.errors?.lat?.[0] || err.response?.data?.errors?.non_field_errors?.[0] || err.response?.data?.detail || 'Could not save outlet.'
      setFlash({ ok: false, msg })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (d) => {
    setEditing(d.id)
    setForm({ name: d.name, country: d.country, region: d.region, district: d.district, address: d.address || '', phone: d.phone || '', email: d.email || '', lat: d.lat, lng: d.lng })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (d) => {
    if (!confirm(`Delete "${d.name}"?`)) return
    await distributorsApi.remove(d.id)
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="store" />Distributor Outlets</h1>

      {flash && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}

      <div className="grid lg:grid-cols-[420px_1fr] gap-5">
        <div className="bg-bg-card border border-border rounded-card self-start">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2">
            <Icon name={editing ? 'edit' : 'plus-circle'} className="text-accent-blue" />{editing ? 'Edit Outlet' : 'Add Outlet'}
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <F label="Outlet Name *" value={form.name} onChange={(v) => setField('name', v)} required />
            <div className="grid grid-cols-2 gap-3">
              <div className="mb-3.5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Country *</label>
                <select value={form.country} onChange={(e) => setField('country', e.target.value)} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <F label="Region / State *" value={form.region} onChange={(v) => setField('region', v)} required placeholder="e.g. Central" />
            </div>
            <F label="District / City *" value={form.district} onChange={(v) => setField('district', v)} required placeholder="e.g. Kampala" />
            <F label="Street Address" value={form.address} onChange={(v) => setField('address', v)} placeholder="e.g. Container Village Nakivubo" />
            <div className="grid grid-cols-2 gap-3">
              <F label="Latitude *" value={form.lat} onChange={(v) => setField('lat', v)} required placeholder="e.g. 0.3136" />
              <F label="Longitude *" value={form.lng} onChange={(v) => setField('lng', v)} required placeholder="e.g. 32.5811" />
            </div>
            <div className="text-xs text-text-3 mb-3.5 flex items-center gap-1.5"><Icon name="info-circle" className="text-accent-blue" />Find coordinates via Google Maps (right-click a point → copy coordinates). The server validates the pin falls inside the selected country.</div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone" value={form.phone} onChange={(v) => setField('phone', v)} />
              <F label="Email" value={form.email} onChange={(v) => setField('email', v)} />
            </div>
            <div className="flex gap-2.5 mt-2">
              <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="plus" />{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Outlet'}</button>
              {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY) }} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button>}
            </div>
          </form>
        </div>

        <div className="bg-bg-card border border-border rounded-card self-start">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />All Outlets ({distributors.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Region/District</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {distributors.map((d) => (
                  <tr key={d.id} className="border-b border-border">
                    <td className="p-3"><strong>{d.name}</strong></td>
                    <td className="p-3 text-text-3">{d.region} &middot; {d.district}</td>
                    <td className="p-3 text-accent-blue">{d.phone || '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(d)} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="edit" /></button>
                        <button onClick={() => handleDelete(d)} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!distributors.length && <tr><td colSpan={4} className="text-center text-text-3 p-8">No outlets yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function F({ label, value, onChange, required = false, placeholder = '' }) {
  return (
    <div className="mb-3.5">
      <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}</label>
      <input value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
    </div>
  )
}
