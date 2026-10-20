import { useCallback, useEffect, useState } from 'react'
import { communityApi } from '../api/community'
import { loadMine, removeMine } from '../utils/myReviews'
import { Stars, StarPicker } from './StarRating'
import Icon from './Icon'

const STATUS = { pending: ['Waiting for approval', 'bg-bg-alt text-text-2'], approved: ['Published', 'bg-accent-green/15 text-accent-green'], rejected: ['Not published', 'bg-accent-red/15 text-accent-red'] }
const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

/** "Your reviews": reviews this browser submitted — the visitor can edit (re-checked by the team) or withdraw them. */
export default function MyReviews({ kind, className = '' }) {
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null) // { token, form }
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    const mine = loadMine().filter((m) => !kind || m.kind === kind)
    const out = await Promise.all(mine.map(async (m) => {
      try { const { data } = await communityApi.editGet(m.kind, m.token); return { ...m, data } } catch (e) { if (e.response?.status === 404) { removeMine(m.token); return null } return { ...m, data: null } }
    }))
    setItems(out.filter(Boolean))
  }, [kind])
  useEffect(() => { load(); window.addEventListener('myreviews:changed', load); return () => window.removeEventListener('myreviews:changed', load) }, [load])

  if (!items || !items.length) return null

  const start = (it) => setEditing({ token: it.token, kind: it.kind, form: { name: it.data.name, rating: it.data.rating || 0, text: it.data.comment ?? it.data.message ?? '', role: it.data.role || '' } })
  const save = async (e) => {
    e.preventDefault()
    const { token, kind: k, form } = editing
    const payload = k === 'product' ? { name: form.name, rating: form.rating, comment: form.text } : { name: form.name, role: form.role, rating: form.rating || null, message: form.text }
    try { const { data } = await communityApi.editSave(k, token, payload); setMsg({ ok: true, text: data.detail }); setEditing(null); load() }
    catch (err) { const errs = err.response?.data?.errors; setMsg({ ok: false, text: (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Could not save.' }) }
  }
  const del = async (it) => {
    if (!confirm('Remove this review permanently?')) return
    try { await communityApi.editDelete(it.kind, it.token); removeMine(it.token); setMsg({ ok: true, text: 'Your review was removed.' }); load() } catch { setMsg({ ok: false, text: 'Could not remove it right now.' }) }
  }

  return (
    <section className={`bg-bg-card border border-border rounded-card p-5 ${className}`} aria-label="Your reviews">
      <h3 className="font-bold text-text-1 mb-1 flex items-center gap-2"><Icon name="edit" className="text-accent-blue" />Your reviews</h3>
      <p className="text-xs text-text-3 mb-4">Saved on this device only. Editing sends a review back to our team to be checked again.</p>
      {msg && <div role="status" className={`mb-3 p-2.5 rounded-lg text-sm ${msg.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>{msg.text}</div>}
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.token} className="border border-border rounded-xl p-3.5">
            {!it.data ? <p className="text-sm text-text-3">Could not load “{it.label}” right now.</p> : editing?.token === it.token ? (
              <form onSubmit={save} className="space-y-3">
                <input aria-label="Your name" required minLength={2} maxLength={80} value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} className={cls} />
                {it.kind === 'testimonial' && <input aria-label="Crop or location" maxLength={120} placeholder="Crop / location" value={editing.form.role} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, role: e.target.value } })} className={cls} />}
                <StarPicker value={editing.form.rating} onChange={(r) => setEditing({ ...editing, form: { ...editing.form, rating: r } })} size={26} />
                <textarea aria-label="Your review" required rows={4} minLength={it.kind === 'product' ? 10 : 15} maxLength={it.kind === 'product' ? 1500 : 1000} value={editing.form.text} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, text: e.target.value } })} className={`${cls} resize-y`} />
                <div className="flex gap-2"><button className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm">Save changes</button><button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button></div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <strong className="text-sm text-text-1">{it.data.product_name || (it.kind === 'testimonial' ? 'About Muddo Agro' : 'Product review')}</strong>
                  {it.data.rating ? <Stars value={it.data.rating} size={14} /> : null}
                  <span className={`px-2 py-0.5 rounded-full text-[0.68rem] font-bold ${STATUS[it.data.status]?.[1]}`}>{STATUS[it.data.status]?.[0]}</span>
                </div>
                <p className="text-sm text-text-2 whitespace-pre-wrap break-words mb-2.5">{it.data.comment ?? it.data.message}</p>
                <div className="flex gap-2"><button onClick={() => start(it)} className="px-3 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs font-bold flex items-center gap-1.5"><Icon name="edit" />Edit</button>
                  <button onClick={() => del(it)} className="px-3 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs font-bold flex items-center gap-1.5"><Icon name="trash" />Remove</button></div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
