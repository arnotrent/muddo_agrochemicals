import { useEffect, useState } from 'react'
import { testimonialsApi, productsApi } from '../../api/services'
import { Stars, StarPicker } from '../../components/StarRating'
import Modal from '../../components/Modal'
import ImageDropzone from '../../components/ImageDropzone'
import Icon from '../../components/Icon'

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['hidden', 'Hidden'], ['rejected', 'Rejected'], ['', 'All']]
const BADGE = { approved: 'bg-accent-green/15 text-accent-green', rejected: 'bg-accent-red/15 text-accent-red', hidden: 'bg-bg-alt text-text-3', pending: 'bg-bg-alt text-accent-blue' }
const EMPTY = { name: '', role: '', message: '', rating: 0, product: '', status: 'approved', order: 0 }
const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

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

  const load = () => {
    testimonialsApi.adminList({ status: tab || undefined, page_size: 200 }).then(({ data }) => setRows(data.results || data)).catch(() => setFlash({ ok: false, msg: 'Could not load testimonials.' }))
    testimonialsApi.adminList({ page_size: 500 }).then(({ data }) => { const c = {}; (data.results || data).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 }); setCounts(c) }).catch(() => {})
  }
  useEffect(() => { load() }, [tab]) // eslint-disable-line
  useEffect(() => { productsApi.list({ page_size: 200 }).then(({ data }) => setProducts(data.results || data)).catch(() => {}) }, [])

  const setStatus = async (r, status) => { setBusy(r.id); try { const fd = new FormData(); fd.append('status', status); await testimonialsApi.adminUpdate(r.id, fd); load() } catch { setFlash({ ok: false, msg: 'Action failed.' }) } finally { setBusy(null) } }
  const open = (r) => { setPhoto(null); setRemovePhoto(false); setEditor(r ? { ...r, product: r.product || '', rating: r.rating || 0 } : { ...EMPTY }) }
  const close = () => { setEditor(null); setPhoto(null); setRemovePhoto(false) }
  const save = async (e) => {
    e.preventDefault(); setBusy('save')
    const fd = new FormData()
    ;['name', 'role', 'message', 'status', 'order'].forEach((k) => fd.append(k, editor[k] ?? ''))
    fd.append('product', editor.product || '')
    if (editor.rating) fd.append('rating', editor.rating); else if (editor.id) fd.append('rating', '')
    if (photo) fd.append('photo', photo)
    if (removePhoto && !photo) fd.append('remove_photo', 'true')
    try {
      if (editor.id) await testimonialsApi.adminUpdate(editor.id, fd); else await testimonialsApi.adminCreate(fd)
      setFlash({ ok: true, msg: editor.id ? 'Testimonial updated.' : 'Testimonial added.' }); close(); load()
    } catch (err) {
      const errs = err.response?.data?.errors
      setFlash({ ok: false, msg: (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Could not save.' })
    } finally { setBusy(null) }
  }
  const small = 'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-transform hover:-translate-y-0.5'

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-xl font-bold text-text-1 flex items-center gap-2"><Icon name="award" />Testimonials</h1>
        <button onClick={() => open(null)} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 transition-transform hover:-translate-y-0.5"><Icon name="plus" />Add testimonial</button>
      </div>
      {flash && <div role="status" className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}</div>}
      <div className="flex gap-2 mb-2 flex-wrap">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${tab === v ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}{v && counts[v] ? ` (${counts[v]})` : ''}</button>)}
      </div>
      <p className="text-xs text-text-3 mb-4">Only <strong>Approved</strong> testimonials appear on the website. <strong>Hidden</strong> ones are kept but not shown; you can show them again any time.</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="bg-bg-card border border-border rounded-card p-4 flex gap-4 transition-colors hover:border-accent-blue/60">
            <div className="w-14 h-14 rounded-full bg-accent-blue text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">{r.photo_url ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" /> : initials(r.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                <strong className="text-text-1">{r.name}</strong>
                {r.role && <span className="text-sm text-text-3">{r.role}</span>}
                {r.rating ? <Stars value={r.rating} size={14} /> : null}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${BADGE[r.status] || BADGE.pending}`}>{r.status}</span>
                <span className="text-xs text-text-4">{r.source === 'admin' ? 'added by admin' : 'public'}</span>
              </div>
              {r.product_name && <div className="text-xs text-accent-blue font-semibold mb-1">About: {r.product_name}</div>}
              <p className="text-sm text-text-2 whitespace-pre-wrap break-words mb-3">{r.message}</p>
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-text-3 mr-auto">{new Date(r.created_at).toLocaleString()}</span>
                {r.status !== 'approved' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'approved')} className={`${small} bg-accent-green text-bg-deep`}><Icon name="check" />{r.status === 'hidden' ? 'Show on site' : 'Approve'}</button>}
                {r.status === 'approved' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'hidden')} className={`${small} bg-bg-alt text-text-2`}><Icon name="eye-slash" />Hide</button>}
                {r.status !== 'rejected' && <button disabled={busy === r.id} onClick={() => setStatus(r, 'rejected')} className={`${small} bg-bg-alt text-text-2`}><Icon name="times" />Decline</button>}
                <button onClick={() => open(r)} className={`${small} bg-bg-alt text-text-2`}><Icon name="edit" />Edit</button>
                <button aria-label="Delete testimonial" onClick={() => confirm('Delete this testimonial permanently?') && testimonialsApi.adminDelete(r.id).then(load)} className={`${small} border border-accent-red text-accent-red`}><Icon name="trash" /></button>
              </div>
            </div>
          </article>
        ))}
        {!rows.length && <div className="bg-bg-card border border-border rounded-card p-10 text-center text-text-3">No {tab || ''} testimonials.</div>}
      </div>

      <Modal open={!!editor} onClose={close} wide title={editor?.id ? 'Edit testimonial' : 'Add a testimonial'} icon={editor?.id ? 'edit' : 'plus'}>
        {editor && (
          <form onSubmit={save}>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Name *</label><input required maxLength={80} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className={cls} /></div>
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Crop / location</label><input maxLength={120} value={editor.role} onChange={(e) => setEditor({ ...editor, role: e.target.value })} className={cls} /></div>
            </div>
            <div className="mb-3.5"><label className="text-sm font-semibold text-text-2 block mb-1.5">Testimonial *</label><textarea required minLength={15} maxLength={1000} rows={5} value={editor.message} onChange={(e) => setEditor({ ...editor, message: e.target.value })} className={`${cls} resize-y`} /></div>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Product</label><select value={editor.product} onChange={(e) => setEditor({ ...editor, product: e.target.value })} className={cls}><option value="">—</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Status</label><select value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value })} className={cls}><option value="approved">Approved (visible)</option><option value="hidden">Hidden (kept, not shown)</option><option value="pending">Pending</option><option value="rejected">Declined</option></select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><span className="text-sm font-semibold text-text-2 block mb-1.5">Rating</span><StarPicker value={editor.rating} onChange={(rating) => setEditor({ ...editor, rating })} />{editor.rating > 0 && <button type="button" onClick={() => setEditor({ ...editor, rating: 0 })} className="ml-2 text-xs text-text-3 underline">clear</button>}</div>
              <div><label className="text-sm font-semibold text-text-2 block mb-1.5">Display order</label><input type="number" min="0" value={editor.order} onChange={(e) => setEditor({ ...editor, order: e.target.value })} className={cls} /></div>
            </div>
            <div className="mb-5"><span className="text-sm font-semibold text-text-2 block mb-1.5">Photo</span>
              <ImageDropzone shape="round" file={photo} onFile={(f) => { setPhoto(f); if (f) setRemovePhoto(false) }} existingUrl={removePhoto ? null : editor.photo_url} onRemoveExisting={() => setRemovePhoto(true)} label="Add a photo" /></div>
            <div className="flex gap-2.5"><button disabled={busy === 'save'} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm disabled:opacity-60">{busy === 'save' ? 'Saving…' : 'Save'}</button><button type="button" onClick={close} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button></div>
          </form>
        )}
      </Modal>
    </div>
  )
}
