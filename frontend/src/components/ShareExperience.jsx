import { useEffect, useRef, useState } from 'react'
import { testimonialsApi, productsApi } from '../api/services'
import { StarPicker } from './StarRating'
import { addMine } from '../utils/myReviews'
import Icon from './Icon'

const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'
const Section = ({ n, title, children }) => (
  <fieldset className="mb-6">
    <legend className="flex items-center gap-2.5 font-bold text-text-1 mb-3"><span className="w-6 h-6 rounded-full bg-accent-blue text-white text-xs flex items-center justify-center">{n}</span>{title}</legend>
    {children}
  </fieldset>
)

/**
 * "Share your experience" — an INLINE, step-by-step form (not a pop-up): 1 about you, 2 your experience, 3 optional photo.
 * Shows live counters, clear errors and, after sending, how to edit the review later.
 */
export default function ShareExperience({ id = 'share-experience', className = '' }) {
  const [f, setF] = useState({ name: '', role: '', message: '', rating: 0, product: '', website: '', agree: false })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [products, setProducts] = useState([])
  const [state, setState] = useState(null)
  const [errors, setErrors] = useState({})
  const fileRef = useRef(null)
  useEffect(() => { productsApi.list({ page_size: 200 }).then(({ data }) => setProducts(data.results || data)).catch(() => {}) }, [])
  useEffect(() => { if (!photo) return setPreview(null); const u = URL.createObjectURL(photo); setPreview(u); return () => URL.revokeObjectURL(u) }, [photo])
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  const pick = (file) => {
    if (!file) return
    if (!/^image\//.test(file.type)) return setErrors((e) => ({ ...e, photo: 'Please choose an image file (JPG, PNG, WEBP).' }))
    if (file.size > 5 * 1024 * 1024) return setErrors((e) => ({ ...e, photo: 'That photo is over 5 MB.' }))
    setErrors((e) => ({ ...e, photo: undefined })); setPhoto(file)
  }
  const validate = () => {
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Please enter your name.'
    if (f.message.trim().length < 15) e.message = `Tell us a little more — ${15 - f.message.trim().length} more character(s) needed.`
    if (!f.rating) e.rating = 'Please choose a star rating.'
    if (!f.agree) e.agree = 'Please tick the box to confirm.'
    setErrors(e); return !Object.keys(e).length
  }
  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setState('sending')
    const fd = new FormData()
    fd.append('name', f.name.trim()); fd.append('role', f.role.trim()); fd.append('message', f.message.trim()); fd.append('website', f.website)
    fd.append('rating', f.rating); if (f.product) fd.append('product', f.product); if (photo) fd.append('photo', photo)
    try {
      const { data } = await testimonialsApi.submit(fd)
      if (data.edit_token) addMine('testimonial', data.edit_token, 'Your review of Muddo Agro')
      setState({ ok: true, msg: data.detail })
    } catch (err) {
      const errs = err.response?.data?.errors; const first = errs && Object.values(errs).flat()[0]
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many submissions from your connection — please try again later.' : first || err.response?.data?.detail || 'Could not send your review.' })
    }
  }
  const reset = () => { setF({ name: '', role: '', message: '', rating: 0, product: '', website: '', agree: false }); setPhoto(null); setState(null); setErrors({}) }
  const Err = ({ k }) => (errors[k] ? <p role="alert" className="text-xs text-accent-red mt-1">{errors[k]}</p> : null)

  return (
    <div id={id} className={`scroll-mt-24 bg-bg-card border border-border rounded-card overflow-hidden grid lg:grid-cols-[320px_1fr] ${className}`}>
      <aside className="bg-bg-deep text-white p-7 lg:p-8">
        <div className="flex gap-1 mb-4" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <svg key={i} width="22" height="22" viewBox="0 0 24 24" fill="#F5B301"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>)}</div>
        <h3 className="text-xl font-bold mb-2">Share your experience</h3>
        <p className="text-white/75 text-sm leading-relaxed mb-5">Your words help other farmers choose with confidence — and help us keep improving.</p>
        <ul className="space-y-2.5 text-sm text-white/80">
          <li className="flex gap-2"><Icon name="check" className="text-accent-green mt-0.5" />Takes about a minute</li>
          <li className="flex gap-2"><Icon name="check" className="text-accent-green mt-0.5" />Be honest and specific — crop, product, result</li>
          <li className="flex gap-2"><Icon name="check" className="text-accent-green mt-0.5" />Checked by our team before it appears</li>
          <li className="flex gap-2"><Icon name="check" className="text-accent-green mt-0.5" />You can edit or remove it later</li>
        </ul>
      </aside>

      <div className="p-6 sm:p-8">
        {state?.ok ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center mx-auto mb-3"><Icon name="check-circle" size="1.8rem" /></div>
            <p className="text-text-1 font-semibold mb-2">{state.msg}</p>
            <p className="text-sm text-text-3 mb-5">Want to change something? Use “Your reviews” on this page — it stays on this device.</p>
            <button onClick={reset} className="px-6 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm">Write another</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            {state?.msg && <div role="alert" className="mb-5 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm flex gap-2"><Icon name="exclamation-circle" className="mt-0.5" />{state.msg}</div>}
            <Section n="1" title="About you">
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div><label htmlFor="t-name" className="text-sm font-semibold text-text-2 block mb-1.5">Your name *</label><input id="t-name" maxLength={80} value={f.name} onChange={(e) => set('name', e.target.value)} className={cls} /><Err k="name" /></div>
                <div><label htmlFor="t-role" className="text-sm font-semibold text-text-2 block mb-1.5">Crop &amp; place <span className="font-normal text-text-3">(optional)</span></label><input id="t-role" maxLength={120} value={f.role} placeholder="e.g. Tomato farmer, Mbale" onChange={(e) => set('role', e.target.value)} className={cls} /></div>
              </div>
            </Section>
            <Section n="2" title="Your experience">
              <div className="mb-3.5"><label htmlFor="t-prod" className="text-sm font-semibold text-text-2 block mb-1.5">Product you used <span className="font-normal text-text-3">(optional)</span></label>
                <select id="t-prod" value={f.product} onChange={(e) => set('product', e.target.value)} className={cls}><option value="">— General, not about one product —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="mb-3.5"><span className="text-sm font-semibold text-text-2 block mb-1.5">Your rating *</span><StarPicker value={f.rating} onChange={(r) => set('rating', r)} /><Err k="rating" /></div>
              <div><label htmlFor="t-msg" className="text-sm font-semibold text-text-2 block mb-1.5">What happened? * <span className="font-normal text-text-3">({f.message.length}/1000)</span></label>
                <textarea id="t-msg" maxLength={1000} rows={5} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="Which crop or problem, what you used, and what you saw afterwards…" className={`${cls} resize-y`} /><Err k="message" /></div>
            </Section>
            <Section n="3" title="Add a photo (optional)">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-14 h-14 rounded-full bg-bg-alt text-text-3 flex items-center justify-center overflow-hidden flex-shrink-0">{preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <Icon name="user" size="1.4rem" />}</div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} className="px-3.5 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-bold">{photo ? 'Change photo' : 'Choose a photo'}</button>
                {photo && <button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = '' }} className="text-sm text-accent-red font-semibold">Remove</button>}
                <span className="text-xs text-text-3">JPG, PNG or WEBP · up to 5 MB</span>
              </div>
              <Err k="photo" />
            </Section>
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label></div>
            <label className="flex items-start gap-2.5 text-sm text-text-2 mb-1 cursor-pointer"><input type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} className="w-4 h-4 mt-0.5" />I agree that my name, review and photo may be shown on the Muddo Agro website.</label>
            <Err k="agree" />
            <button disabled={state === 'sending'} className="mt-5 w-full sm:w-auto px-8 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"><Icon name="paper-plane" />{state === 'sending' ? 'Sending…' : 'Submit my review'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
