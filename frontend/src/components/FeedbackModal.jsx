import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { testimonialsApi, productsApi, reviewsApi } from '../api/services'
import { StarPicker, LABELS } from './StarRating'
import Icon from './Icon'

const cls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'
const PROMPTS = ['I used it on my ', 'What I noticed afterwards: ', 'I would recommend it because ']

/**
 * Feedback POP-UP (opened from a "Give feedback" button). Rendered through a portal so it is always centred on screen,
 * whatever page section the button is in. Three short steps: 1 rating · 2 your experience · 3 about you (+ consent).
 *  mode "site"    -> a testimonial about Muddo Agro (optional product, optional photo)
 *  mode "product" -> a review of one product (pass `product={{id, name}}`)
 * The visitor is only thanked; whether a review is published is decided by the admin and never shown to the visitor.
 */
export default function FeedbackModal(props) {
  if (!props.open) return null
  return createPortal(<Modal {...props} />, document.body)
}

function Modal({ onClose, mode = 'site', product }) {
  const isProduct = mode === 'product' && product
  const [step, setStep] = useState(1)
  const [f, setF] = useState({ rating: 0, productId: '', message: '', first: '', last: '', role: '', agree: false, website: '' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [products, setProducts] = useState([])
  const [errors, setErrors] = useState({})
  const [state, setState] = useState(null)
  const fileRef = useRef(null)
  const msgRef = useRef(null)
  const minMsg = isProduct ? 10 : 15
  const maxMsg = isProduct ? 1500 : 1000

  useEffect(() => { if (!isProduct) productsApi.list({ page_size: 200 }).then(({ data }) => setProducts(data.results || data)).catch(() => {}) }, [isProduct])
  useEffect(() => { if (!photo) return setPreview(null); const u = URL.createObjectURL(photo); setPreview(u); return () => URL.revokeObjectURL(u) }, [photo])
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [onClose])

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }
  const Err = ({ k }) => (errors[k] ? <p role="alert" className="text-xs text-accent-red mt-1">{errors[k]}</p> : null)

  const check = (s) => {
    const e = {}
    if (s === 1 && !f.rating) e.rating = 'Please tap a star to rate.'
    if (s === 2 && f.message.trim().length < minMsg) e.message = `Please tell us a little more — ${minMsg - f.message.trim().length} more character(s).`
    if (s === 3) {
      if (!f.first.trim()) e.first = 'Please enter your first name.'
      else if (`${f.first} ${f.last}`.trim().length < 2) e.first = 'Please enter your name.'
      if (!f.agree) e.agree = 'Please tick the box to give your consent.'
    }
    setErrors(e); return !Object.keys(e).length
  }
  const next = () => { if (check(step)) setStep((s) => s + 1) }
  const pick = (file) => {
    if (!file) return
    if (!/^image\//.test(file.type)) return setErrors((e) => ({ ...e, photo: 'Please choose an image (JPG, PNG or WEBP).' }))
    if (file.size > 5 * 1024 * 1024) return setErrors((e) => ({ ...e, photo: 'That photo is over 5 MB.' }))
    setErrors((e) => ({ ...e, photo: undefined })); setPhoto(file)
  }
  const addPrompt = (p) => { set('message', (f.message ? `${f.message.trimEnd()} ` : '') + p); setTimeout(() => msgRef.current?.focus(), 0) }

  const submit = async (ev) => {
    ev.preventDefault()
    if (step < 3) return next()
    if (!check(3)) return
    setState('sending')
    const name = `${f.first.trim()} ${f.last.trim()}`.trim()
    try {
      if (isProduct) {
        await reviewsApi.submit(product.id, { name, rating: f.rating, comment: f.message.trim(), website: f.website })
      } else {
        const fd = new FormData()
        fd.append('name', name); fd.append('role', f.role.trim()); fd.append('message', f.message.trim()); fd.append('rating', f.rating); fd.append('website', f.website)
        if (f.productId) fd.append('product', f.productId)
        if (photo) fd.append('photo', photo)
        await testimonialsApi.submit(fd)
      }
      setState({ ok: true })
    } catch (err) {
      const errs = err.response?.data?.errors; const first = errs && Object.values(errs).flat()[0]
      setState({ ok: false, msg: err.response?.status === 429 ? 'Too many submissions from your connection — please try again later.' : first || err.response?.data?.detail || 'Could not send your feedback. Please try again.' })
    }
  }

  const titles = ['', 'How was your experience?', 'Tell us more', 'Almost done — about you']
  return (
    <div className="fixed inset-0 z-[9000] bg-black/60 flex items-center justify-center p-3 sm:p-6 animate-viewerIn" role="dialog" aria-modal="true" aria-labelledby="fb-title" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl w-full max-w-[560px] max-h-[94vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-border">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-accent-blue mb-1">{isProduct ? product.name : 'Muddo Agro Chemicals'}</div>
            <h2 id="fb-title" className="text-xl font-bold text-text-1">{state?.ok ? 'Thank you!' : titles[step]}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-bg-alt text-text-3 flex items-center justify-center flex-shrink-0"><Icon name="times" size="1.15rem" /></button>
        </div>

        {state?.ok ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center mx-auto mb-4"><Icon name="check-circle" size="2rem" /></div>
            <p className="text-text-1 font-semibold mb-1.5">Thank you for your feedback!</p>
            <p className="text-sm text-text-3 mb-6">Our team reads every message — it genuinely helps us and other farmers.</p>
            <button onClick={onClose} className="px-7 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-accent-blue' : 'bg-bg-alt'}`} />)}
              <span className="text-xs text-text-3 ml-1 whitespace-nowrap">Step {step} of 3</span>
            </div>
            {state?.msg && <div role="alert" className="mb-4 p-3 rounded-lg bg-accent-red/10 text-accent-red text-sm flex gap-2"><Icon name="exclamation-circle" className="mt-0.5" />{state.msg}</div>}

            {step === 1 && (
              <div className="text-center py-2">
                <StarPicker value={f.rating} onChange={(r) => set('rating', r)} size={44} />
                <div className="h-6 mt-2 text-sm font-bold" style={{ color: '#F5B301' }}>{LABELS[f.rating]}</div>
                <div className="flex justify-center"><Err k="rating" /></div>
                {!isProduct && (
                  <div className="text-left mt-5">
                    <label htmlFor="fb-prod" className="text-sm font-semibold text-text-2 block mb-1.5">What is it about? <span className="font-normal text-text-3">(optional)</span></label>
                    <select id="fb-prod" value={f.productId} onChange={(e) => set('productId', e.target.value)} className={cls}><option value="">General — Muddo Agro as a whole</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <label htmlFor="fb-msg" className="text-sm font-semibold text-text-2 block mb-1.5">Your experience <span className="font-normal text-text-3">({f.message.length}/{maxMsg})</span></label>
                <textarea id="fb-msg" ref={msgRef} autoFocus maxLength={maxMsg} rows={6} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="Which crop or problem, what you used, and what you saw afterwards…" className={`${cls} resize-y`} />
                <Err k="message" />
                <div className="flex flex-wrap gap-2 mt-3"><span className="text-xs text-text-3 self-center">Need a start?</span>
                  {PROMPTS.map((p) => <button key={p} type="button" onClick={() => addPrompt(p)} className="px-2.5 py-1 rounded-full bg-bg-alt text-text-2 text-xs font-semibold hover:text-accent-blue">{p.trim()}…</button>)}</div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div><label htmlFor="fb-first" className="text-sm font-semibold text-text-2 block mb-1.5">First name *</label><input id="fb-first" autoFocus maxLength={40} autoComplete="given-name" value={f.first} onChange={(e) => set('first', e.target.value)} className={cls} /><Err k="first" /></div>
                  <div><label htmlFor="fb-last" className="text-sm font-semibold text-text-2 block mb-1.5">Second name <span className="font-normal text-text-3">(optional)</span></label><input id="fb-last" maxLength={40} autoComplete="family-name" value={f.last} onChange={(e) => set('last', e.target.value)} className={cls} /></div>
                </div>
                {!isProduct && (
                  <>
                    <div><label htmlFor="fb-role" className="text-sm font-semibold text-text-2 block mb-1.5">Crop &amp; place <span className="font-normal text-text-3">(optional)</span></label><input id="fb-role" maxLength={120} value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Tomato farmer, Mbale" className={cls} /></div>
                    <div>
                      <span className="text-sm font-semibold text-text-2 block mb-1.5">Your photo <span className="font-normal text-text-3">(optional)</span></span>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-12 h-12 rounded-full bg-bg-alt text-text-3 flex items-center justify-center overflow-hidden flex-shrink-0">{preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <Icon name="user" size="1.3rem" />}</div>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                        <button type="button" onClick={() => fileRef.current?.click()} className="px-3.5 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-bold">{photo ? 'Change' : 'Choose a photo'}</button>
                        {photo && <button type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = '' }} className="text-sm text-accent-red font-semibold">Remove</button>}
                      </div>
                      <Err k="photo" />
                    </div>
                  </>
                )}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label></div>
                <div>
                  <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer"><input type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} className="w-4 h-4 mt-0.5" />I consent to Muddo Agro Chemicals storing this feedback and, if the team chooses, showing my name{!isProduct && ', photo'} and review on its website.</label>
                  <Err k="agree" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-6">
              {step > 1 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="px-4 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm flex items-center gap-2"><Icon name="arrow-left" />Back</button> : <span />}
              {step < 3
                ? <button type="submit" className="px-6 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2">Next<Icon name="arrow-right" /></button>
                : <button type="submit" disabled={state === 'sending'} className="px-6 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="paper-plane" />{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
