import { useEffect, useRef, useState } from 'react'
import { testimonialsApi, productsApi } from '../api/services'
import { Stars, StarPicker } from './StarRating'
import Icon from './Icon'
import Reveal from './Reveal'

const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

function Avatar({ t, size = 'w-12 h-12' }) {
  return (
    <div className={`${size} rounded-full bg-accent-blue text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {t.photo_url ? <img src={t.photo_url} alt={`Photo of ${t.name}`} loading="lazy" className="w-full h-full object-cover" /> : <span aria-hidden="true">{initials(t.name)}</span>}
    </div>
  )
}

function ShareForm({ onClose }) {
  const [f, setF] = useState({ name: '', role: '', message: '', rating: 0, product: '', website: '' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [products, setProducts] = useState([])
  const [state, setState] = useState(null)
  const fileRef = useRef(null)
  useEffect(() => { productsApi.list({ page_size: 100 }).then(({ data }) => setProducts(data.results || data)).catch(() => {}) }, [])
  useEffect(() => { if (!photo) return setPreview(null); const u = URL.createObjectURL(photo); setPreview(u); return () => URL.revokeObjectURL(u) }, [photo])
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const pick = (file) => {
    if (!file) return
    if (!/^image\//.test(file.type)) return setState({ ok: false, msg: 'Please choose an image file (JPG, PNG, WEBP).' })
    if (file.size > 5 * 1024 * 1024) return setState({ ok: false, msg: 'That photo is over 5 MB.' })
    setState(null); setPhoto(file)
  }
  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    const fd = new FormData()
    fd.append('name', f.name); fd.append('role', f.role); fd.append('message', f.message); fd.append('website', f.website)
    if (f.rating) fd.append('rating', f.rating)
    if (f.product) fd.append('product', f.product)
    if (photo) fd.append('photo', photo)
    try {
      const { data } = await testimonialsApi.submit(fd)
      setState({ ok: true, msg: data.detail })
    } catch (err) {
      const errs = err.response?.data?.errors
      const first = errs && Object.values(errs).flat()[0]
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many submissions from your connection — please try again later.' : (first || err.response?.data?.detail || 'Could not send your testimonial.') })
    }
  }
  const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'
  const done = state?.ok

  return (
    <div className="fixed inset-0 z-[4500] bg-black/60 flex items-center justify-center p-4 animate-viewerIn" role="dialog" aria-modal="true" aria-label="Share your experience" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto p-6 sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4"><div><h3 className="text-xl font-bold text-text-1">Share your experience</h3><p className="text-sm text-text-3 mt-1">Tell other farmers how MACL products worked for you.</p></div>
          <button onClick={onClose} aria-label="Close" className="text-text-3"><Icon name="times" size="1.2rem" /></button></div>
        {done ? (
          <div className="text-center py-8"><div className="w-14 h-14 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center mx-auto mb-3"><Icon name="check-circle" size="1.8rem" /></div>
            <p className="text-text-1 font-semibold mb-5">{state.msg}</p><button onClick={onClose} className="px-6 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm">Close</button></div>
        ) : (
          <form onSubmit={submit}>
            {state?.msg && <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm flex gap-2"><Icon name="exclamation-circle" className="mt-0.5" />{state.msg}</div>}
            <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
              <div><label htmlFor="t-name" className="text-sm font-semibold text-text-2 block mb-1.5">Your name *</label><input id="t-name" required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={cls} /></div>
              <div><label htmlFor="t-role" className="text-sm font-semibold text-text-2 block mb-1.5">Crop / location</label><input id="t-role" maxLength={120} value={f.role} placeholder="e.g. Tomato farmer, Mbale" onChange={(e) => setF({ ...f, role: e.target.value })} className={cls} /></div>
            </div>
            <div className="mb-3.5"><label htmlFor="t-prod" className="text-sm font-semibold text-text-2 block mb-1.5">Product you used</label>
              <select id="t-prod" value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} className={cls}><option value="">— Not about one product —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="mb-3.5"><span className="text-sm font-semibold text-text-2 block mb-1.5">Rating</span><StarPicker value={f.rating} onChange={(rating) => setF({ ...f, rating })} /></div>
            <div className="mb-3.5"><label htmlFor="t-msg" className="text-sm font-semibold text-text-2 block mb-1.5">Your testimonial * <span className="font-normal text-text-3">(15–1000 characters)</span></label>
              <textarea id="t-msg" required minLength={15} maxLength={1000} rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className={`${cls} resize-y`} /></div>
            <div className="mb-4">
              <span className="text-sm font-semibold text-text-2 block mb-1.5">Your photo <span className="font-normal text-text-3">(optional)</span></span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-bg-alt text-text-3 flex items-center justify-center overflow-hidden flex-shrink-0">{preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <Icon name="user" size="1.4rem" />}</div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} className="px-3.5 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-bold">{photo ? 'Change photo' : 'Add a photo'}</button>
                {photo && <button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = '' }} className="text-sm text-accent-red font-semibold">Remove</button>}
              </div>
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label></div>
            <button disabled={state === 'sending'} className="w-full py-3 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"><Icon name="paper-plane" />{state === 'sending' ? 'Sending…' : 'Submit testimonial'}</button>
            <p className="text-xs text-text-3 mt-2.5">Testimonials are reviewed by our team before they are published.</p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function TestimonialsSection() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { testimonialsApi.list().then(({ data }) => setItems(data.results || data)).catch(() => {}).finally(() => setLoaded(true)) }, [])
  if (!loaded) return null
  return (
    <section className="py-16" aria-label="Customer testimonials">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-alt text-accent-blue text-xs font-bold uppercase tracking-wide mb-3"><Icon name="comments" />Testimonials</div>
          <h2 className="text-3xl font-bold text-text-1">What Farmers Say</h2>
          <p className="text-text-3 max-w-[56ch] mx-auto mt-2.5">Real experiences from the people who grow with MACL products.</p>
        </div>
        {items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i, 5) * 60}>
                <figure className="bg-bg-card border border-border rounded-card p-6 h-full flex flex-col hover:border-accent-blue transition-colors">
                  {t.rating ? <Stars value={t.rating} size={16} /> : null}
                  <blockquote className="text-text-2 leading-relaxed mt-3 flex-1 break-words">“{t.message}”</blockquote>
                  <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                    <Avatar t={t} />
                    <div className="min-w-0"><div className="font-bold text-text-1 text-sm truncate">{t.name}</div>
                      <div className="text-xs text-text-3 truncate">{[t.role, t.product_name].filter(Boolean).join(' · ')}</div></div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
        <div className="text-center mt-9">
          {!items.length && <p className="text-text-3 mb-4">Be the first to share how MACL products worked for you.</p>}
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm shadow-glow-blue hover:bg-accent-blue-hover"><Icon name="plus-circle" />Share your experience</button>
        </div>
      </div>
      {open && <ShareForm onClose={() => setOpen(false)} />}
    </section>
  )
}
