import { useEffect, useState } from 'react'
import api, { leadershipApi } from '../../api/services'
import Modal from '../../components/Modal'
import ImageDropzone from '../../components/ImageDropzone'
import Icon from '../../components/Icon'
import { errText } from '../../utils/apiError'

const EMPTY = { name: '', title: '', bio: '', greeting: '', order: 0, active: true }
const inputCls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

export default function AdminLeadershipPage() {
  const [leaders, setLeaders] = useState([])
  const [modal, setModal] = useState(null) // null | { id: number | null }
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null)
  const [existing, setExisting] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  // ?all=1 → the admin sees hidden leaders too; the PUBLIC site never sends it, so hidden leaders stay hidden there.
  const load = () => api.get('/leadership/', { params: { all: 1 } }).then(({ data }) => setLeaders(data.results || data)).catch(() => setFlash({ ok: false, msg: 'Could not load the leadership list.' }))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const close = () => { setModal(null); setForm(EMPTY); setPhoto(null); setExisting(null); setRemovePhoto(false) }
  const openAdd = () => { setFlash(null); setForm(EMPTY); setPhoto(null); setExisting(null); setRemovePhoto(false); setModal({ id: null }) }
  const openEdit = (l) => {
    setFlash(null)
    setForm({ name: l.name, title: l.title, bio: l.bio || '', greeting: l.greeting || '', order: l.order, active: l.active })
    setPhoto(null); setExisting(l.photo_url || null); setRemovePhoto(false); setModal({ id: l.id })
  }

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setFlash(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    if (photo) fd.append('photo', photo)
    if (removePhoto && !photo) fd.append('remove_photo', 'true')
    try {
      if (modal.id) await leadershipApi.update(modal.id, fd); else await leadershipApi.create(fd)
      setFlash({ ok: true, msg: modal.id ? 'Leader updated.' : 'Leader added.' })
      close(); load()
    } catch (err) {
      setFlash({ ok: false, msg: errText(err, 'Could not save the leader.') })
    } finally { setSaving(false) }
  }

  const toggle = async (l) => {
    const fd = new FormData(); fd.append('active', String(!l.active))
    try { await leadershipApi.update(l.id, fd); load() } catch { setFlash({ ok: false, msg: 'Could not change visibility.' }) }
  }
  const remove = async (l) => { if (confirm(`Delete "${l.name}" permanently?`)) { await leadershipApi.remove(l.id); load() } }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-xl font-bold text-text-1 flex items-center gap-2"><Icon name="users" />Company Leadership</h1>
        <button onClick={openAdd} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 transition-transform hover:-translate-y-0.5"><Icon name="plus-circle" />Add leader</button>
      </div>
      {flash && <div role="status" className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}</div>}
      <p className="text-sm text-text-3 mb-4">Leaders marked <strong>Hidden</strong> are kept here but do not appear anywhere on the public website.</p>

      <div className="bg-bg-card border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Order</th><th className="p-3 text-left">On website</th><th className="p-3 text-left">Actions</th></tr></thead>
          <tbody>
            {leaders.map((l) => (
              <tr key={l.id} className={`border-b border-border transition-opacity ${l.active ? '' : 'opacity-60'}`}>
                <td className="p-3"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-accent-blue text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">{l.photo_url ? <img src={l.photo_url} alt="" className="w-full h-full object-cover" /> : l.name[0]?.toUpperCase()}</div><strong>{l.name}</strong></div></td>
                <td className="p-3 text-text-3">{l.title}</td><td className="p-3">{l.order}</td>
                <td className="p-3"><button onClick={() => toggle(l)} title="Click to show / hide" className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${l.active ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-alt text-text-3'}`}>{l.active ? 'Visible' : 'Hidden'}</button></td>
                <td className="p-3"><div className="flex gap-1.5">
                  <button aria-label={`Edit ${l.name}`} onClick={() => openEdit(l)} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="edit" /></button>
                  <button aria-label={`Delete ${l.name}`} onClick={() => remove(l)} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button></div></td>
              </tr>
            ))}
            {!leaders.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No leaders yet — the About page section stays hidden until you add one.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={close} wide title={modal?.id ? 'Edit leader' : 'Add a leader'} icon={modal?.id ? 'edit' : 'plus-circle'}>
        <form onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
            <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Full name *</label><input required maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
            <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Title / position *</label><input required maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Short bio</label><textarea rows={3} maxLength={800} value={form.bio} onChange={(e) => set('bio', e.target.value)} className={`${inputCls} resize-y`} /></div>
          <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Greeting / welcome message</label><textarea rows={4} maxLength={1500} value={form.greeting} onChange={(e) => set('greeting', e.target.value)} placeholder="Shown on the About page as a personal word from this leader." className={`${inputCls} resize-y`} /></div>
          <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Photo</label>
            <ImageDropzone shape="round" file={photo} onFile={(f) => { setPhoto(f); if (f) setRemovePhoto(false) }} existingUrl={removePhoto ? null : existing} onRemoveExisting={() => setRemovePhoto(true)} label="Add a photo" /></div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Display order</label><input type="number" min="0" value={form.order} onChange={(e) => set('order', e.target.value)} className={inputCls} /></div>
            <label className="flex items-end gap-2 text-sm font-semibold text-text-2 pb-2.5 cursor-pointer"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4" />Show on the website</label>
          </div>
          <div className="flex gap-2.5">
            <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{saving ? 'Saving…' : modal?.id ? 'Save changes' : 'Add leader'}</button>
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
