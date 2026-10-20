import { useEffect, useRef, useState } from 'react'
import { testimonialsApi, productsApi } from '../../api/services'
import { Stars, StarPicker } from '../../components/StarRating'
import Icon from '../../components/Icon'

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]
const EMPTY = { name: '', role: '', message: '', rating: 0, product: '', status: 'approved', order: 0 }
const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function AdminTestimonialsPage() {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [products, setProducts] = useState([])
  const [editor, setEditor] = useState(null) // null | {id?, ...form, photo_url}
  const [photo, setPhoto] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [busy, setBusy] = useState(null)
  const [flash, setFlash] = useState(null)
  const fileRef = useRef(null)

  const load = () => {
    testimonialsApi.adminList({ status: tab || undefined, page_size: 200 }).then(({ data }) => setRows(data.results || data)).catch(() => setFlash({ ok: false, msg: 'Could not load testimonials.' }))
    testimonialsApi.adminList({ page_size: 500 }).then(({ data }) => { const c = {}; (data.results || data).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 }); setCounts(c) }).catch(() => {})
  }
  useEffect(() => { load() }, [tab]) // eslint-disable-line
  useEffect(() => { productsApi.list({ page_size: 200 }).then(({ data }) => setProducts(data.results || data)).catch(() => {}) }, [])

  const setStatus = async (r, status) => { setBusy(r.id); try { const fd = new FormData(); fd.append('status', status); await testimonialsApi.adminUpdate(r.id, fd); load() } catch { setFlash({ ok: false, msg: 'Action failed.' }) } finally { setBusy(null) } }
  const open = (r) => { setPhoto(null); setRemovePhoto(false); setEditor(r ? { ...r, product: r.product || '', rating: r.rating || 0 } : { ...EMPTY }) }
  const save = async (e) => {
    e.preventDefault(); setBusy('save')
    const fd = new FormData()
    ;['name', 'role', 'message', 'status', 'order'].forEach((k) => fd.append(k, editor[k] ?? ''))
    fd.append('product', editor.product || '')
    if (editor.rating) fd.append('rating', editor.rating); else if (editor.id) fd.append('rating', '')
    if (photo) fd.append('photo', photo)
    if (removePhoto) fd.append('remove_photo', 'true')
    try {
      if (editor.id) await testimonialsApi.adminUpdate(editor.id, fd); else await testimonialsApi.adminCreate(fd)
      setFlash({ ok: true, msg: editor.id ? 'Testimonial updated.' : 'Testimonial added.' }); setEditor(null); load()
    } catch (err) {
      const errs = err.response?.data?.errors
      setFlash({ ok: false, msg: (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Could not save.' })
    } finally { setBusy(null) }
  }
  const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1'

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-xl font-bold text-text-1 flex items-center gap-2"><Icon name="award" />Testimonials</h1>
        <button onClick={() => open(null)} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="plus" />Add testimonial</button>
      </div>
      {flash && <div role="status" className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}</div>}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${tab === v ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}{v && counts[v] ? ` (${counts[v]})` : ''}</button>)}
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="bg-bg-card border border-border rounded-card p-4 flex gap-4">
            <div className="w-14 h-14 rounded-full bg-accent-blue text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">{r.photo_url ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" /> : initials(r.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                <strong className="text-text-1">{r.name}</strong>
                {r.role && <span className="text-sm text-text-3">{r.role}</span>}
                {r.rating ? <Stars value={r.rating} size={14} /> : null}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'approved' ? 'bg-accent-green/15 text-accent-green' : r.status === 'rejected' ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-alt text-accent-blue'}`}>{r.status}</span>
                <span className="text-xs text-text-4">{r.source === 'admin' ? 'added by admin' : 'public'}</span>
              </div>
              {r.product_name && <div className="text-xs text-accent-blue font-semibold mb-1">About: {r.product_name}</div>}
              <p className="text-sm text-text-2 whitespace-pre-wrap break-words mb-3">{r.message}</p>
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-text-3 mr-auto">{new Date(r.created_at).toLocaleString()}</span>
                {r.status !== 'approved' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'approved')} className="px-3 py-1.5 rounded-lg bg-accent-green text-bg-deep text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"><Icon name="check" />Approve</button>}
                {r.status !== 'rejected' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'rejected')} className="px-3 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"><Icon name="times" />Reject</button>}
                <button onClick={() => open(r)} className="px-3 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs font-bold flex items-center gap-1.5"><Icon name="edit" />Edit</button>
                <button aria-label="Delete testimonial" onClick={() => confirm('Delete this testimonial permanently?') && testimonialsApi.adminDelete(r.id).then(load)} className="px-3 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button>
              </div>
            </div>
          </article>
        ))}
        {!rows.length && <div className="bg-bg-card border border-border rounded-card p-10 text-center text-text-3">No {tab || ''} testimonials.</div>}
      </div>

      {editor && (
        <div className="fixed inset-0 z-[4000] bg-black/55 flex items-center justify-center p-4" onClick={() => setEditor(null)} role="dialog" aria-modal="true">
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-bg-card rounded-2xl p-6 w-full max-w-[560px] max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h3 className="font-extrabold text-text-1">{editor.id ? 'Edit testimonial' : 'Add testimonial'}</h3><button type="button" onClick={() => setEditor(null)} aria-label="Close"><Icon name="times" /></button></div>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Name *</label><input required maxLength={80} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className={cls} /></div>
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Crop / location</label><input maxLength={120} value={editor.role} onChange={(e) => setEditor({ ...editor, role: e.target.value })} className={cls} /></div>
            </div>
            <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Testimonial *</label><textarea required maxLength={1000} rows={5} value={editor.message} onChange={(e) => setEditor({ ...editor, message: e.target.value })} className={`${cls} resize-y`} /></div>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Product</label><select value={editor.product} onChange={(e) => setEditor({ ...editor, product: e.target.value })} className={cls}><option value="">—</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Status</label><select value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value })} className={cls}><option value="approved">Approved (visible)</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><span className="text-sm font-semibold text-text-2 block mb-1.5">Rating</span><StarPicker value={editor.rating} onChange={(rating) => setEditor({ ...editor, rating })} />{editor.rating > 0 && <button type="button" onClick={() => setEditor({ ...editor, rating: 0 })} className="ml-2 text-xs text-text-3 underline">clear</button>}</div>
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Display order</label><input type="number" min="0" value={editor.order} onChange={(e) => setEditor({ ...editor, order: e.target.value })} className={cls} /></div>
            </div>
            <div className="mb-5 flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-bg-alt overflow-hidden flex items-center justify-center text-text-3 flex-shrink-0">
                {photo ? <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" /> : (!removePhoto && editor.photo_url) ? <img src={editor.photo_url} alt="" className="w-full h-full object-cover" /> : <Icon name="user" size="1.4rem" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setPhoto(e.target.files?.[0] || null); setRemovePhoto(false) }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="px-3.5 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-bold">{photo || editor.photo_url ? 'Replace photo' : 'Add photo'}</button>
              {(photo || (editor.photo_url && !removePhoto)) && <button type="button" onClick={() => { setPhoto(null); setRemovePhoto(true); if (fileRef.current) fileRef.current.value = '' }} className="text-sm text-accent-red font-semibold">Remove</button>}
            </div>
            <div className="flex gap-2.5"><button disabled={busy === 'save'} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{busy === 'save' ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setEditor(null)} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
