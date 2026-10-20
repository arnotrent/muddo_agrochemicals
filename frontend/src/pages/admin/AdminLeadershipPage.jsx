import { useEffect, useState } from 'react'
import { leadershipApi } from '../../api/services'
import Icon from '../../components/Icon'

const EMPTY = { name: '', title: '', bio: '', order: 0, active: true }

export default function AdminLeadershipPage() {
  const [leaders, setLeaders] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null)
  const [editing, setEditing] = useState(null)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => leadershipApi.list().then(({ data }) => setLeaders(data.results || data))
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setFlash(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (photo) fd.append('photo', photo)
    try {
      if (editing) await leadershipApi.update(editing, fd); else await leadershipApi.create(fd)
      setFlash({ ok: true, msg: editing ? 'Leader updated.' : 'Leader added.' })
      setForm(EMPTY); setPhoto(null); setEditing(null); e.target.reset(); load()
    } catch (err) {
      const errs = err.response?.data?.errors
      setFlash({ ok: false, msg: (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Could not save.' })
    } finally { setSaving(false) }
  }
  const inputCls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1'
  const toggle = (l) => { const fd = new FormData(); fd.append('active', !l.active); leadershipApi.update(l.id, fd).then(load) }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="users" />Company Leadership</h1>
      {flash && <div role="status" className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}</div>}
      <div className="grid lg:grid-cols-[380px_1fr] gap-5">
        <form onSubmit={submit} className="bg-bg-card border border-border rounded-card p-5 self-start">
          <div className="font-bold text-text-1 mb-4">{editing ? 'Edit leader' : 'Add leader'}</div>
          {[['name', 'Full name *', true], ['title', 'Title / position *', true]].map(([k, l, r]) => (
            <div key={k} className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">{l}</label><input required={r} maxLength={120} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={inputCls} /></div>
          ))}
          <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Short bio</label><textarea rows={4} maxLength={800} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className={`${inputCls} resize-y`} /></div>
          <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Photo</label><input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full text-sm" /></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Display order</label><input type="number" min="0" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} className={inputCls} /></div>
            <label className="flex items-end gap-2 text-sm font-semibold text-text-2 pb-2.5"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />Visible</label>
          </div>
          <div className="flex gap-2.5">
            <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add leader'}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); setPhoto(null) }} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button>}
          </div>
        </form>
        <div className="bg-bg-card border border-border rounded-card self-start overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Order</th><th className="p-3 text-left">Visible</th><th className="p-3 text-left">Actions</th></tr></thead>
            <tbody>
              {leaders.map((l) => (
                <tr key={l.id} className="border-b border-border">
                  <td className="p-3"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-accent-blue text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">{l.photo_url ? <img src={l.photo_url} alt="" className="w-full h-full object-cover" /> : l.name[0]?.toUpperCase()}</div><strong>{l.name}</strong></div></td>
                  <td className="p-3 text-text-3">{l.title}</td><td className="p-3">{l.order}</td>
                  <td className="p-3"><button onClick={() => toggle(l)} className={`px-2 py-0.5 rounded-full text-xs font-bold ${l.active ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-alt text-text-3'}`}>{l.active ? 'Visible' : 'Hidden'}</button></td>
                  <td className="p-3"><div className="flex gap-1.5">
                    <button aria-label={`Edit ${l.name}`} onClick={() => { setEditing(l.id); setForm({ name: l.name, title: l.title, bio: l.bio || '', order: l.order, active: l.active }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="edit" /></button>
                    <button aria-label={`Delete ${l.name}`} onClick={() => confirm(`Delete "${l.name}"?`) && leadershipApi.remove(l.id).then(load)} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button></div></td>
                </tr>
              ))}
              {!leaders.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No leaders yet — the About page section stays hidden until you add one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
