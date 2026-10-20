import { useState } from 'react'
import { EmailLink } from './ContactDetails'
import Icon from './Icon'
import site from '../data/siteConfig'

const STATUS_CLS = { new: 'bg-bg-alt text-accent-blue', pending: 'bg-accent-blue/15 text-accent-blue', resolved: 'bg-accent-green/15 text-accent-green' }
const KIND = { reply: ['Reply sent to customer', 'envelope'], forward: ['Forwarded', 'reply'], note: ['Note', 'edit'] }
const waLink = (e) => `https://wa.me/${(e.phone || '').replace(/\D/g, '').replace(/^0/, '256')}?text=${encodeURIComponent(`Hello ${e.name.split(' ')[0]}, this is Muddo Agro Chemicals about your enquiry ${e.ref_number}.`)}`
const fmt = (iso) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** One enquiry: customer details, their message, full history and a REPLY box (e-mails the customer). Used by admin and agent. */
export default function EnquiryPanel({ enquiry: e, onReply, children }) {
  const [text, setText] = useState('')
  const [resolve, setResolve] = useState(false)
  const [state, setState] = useState(null)
  const send = async (ev) => {
    ev.preventDefault()
    if (text.trim().length < 2) return setState({ ok: false, msg: 'Write your reply first.' })
    setState('sending')
    try {
      const r = await onReply(text.trim(), resolve)
      setState({ ok: r.emailed, msg: r.detail }); if (r.emailed) { setText(''); setResolve(false) }
    } catch (err) { setState({ ok: false, msg: err.response?.data?.detail || 'Could not send the reply.' }) }
  }
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><div className="font-mono text-xs font-bold text-accent-blue">{e.ref_number}</div><h3 className="font-bold text-text-1 text-lg">{e.subject}</h3><div className="text-xs text-text-3">{fmt(e.created_at)}</div></div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CLS[e.status]}`}>{e.status}</span>
      </div>

      <div className="rounded-xl border border-border p-4 text-sm space-y-2">
        <div className="font-bold text-text-1 text-base">{e.name}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-text-2">
          <span className="flex items-center gap-1.5"><Icon name="envelope" className="text-accent-blue" /><EmailLink email={e.email} subject={`Re: ${e.subject} [${e.ref_number}]`} /></span>
          {e.phone && <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 hover:text-accent-blue"><Icon name="phone" className="text-accent-blue" />{e.phone}</a>}
        </div>
        {e.phone && <a href={waLink(e)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green text-bg-deep text-xs font-bold"><Icon name="whatsapp" />WhatsApp {e.name.split(' ')[0]}</a>}
      </div>

      <div><div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1.5">Customer's message</div>
        <p className="text-sm text-text-1 whitespace-pre-wrap break-words bg-bg-alt rounded-xl p-4">{e.message}</p></div>

      {children}

      {e.replies.length > 0 && (
        <div><div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-2">History</div>
          <ol className="space-y-2.5 border-l-2 border-border pl-4">
            {e.replies.map((r) => (
              <li key={r.id} className="text-sm">
                <div className="flex items-center gap-2 flex-wrap text-xs text-text-3"><Icon name={KIND[r.kind]?.[1] || 'envelope'} className="text-accent-blue" /><strong className="text-text-1">{r.author_name}</strong> · {KIND[r.kind]?.[0]} · {fmt(r.created_at)}
                  {r.kind === 'reply' && <span className={r.emailed ? 'text-accent-green font-bold' : 'text-accent-red font-bold'}>{r.emailed ? '✓ e-mailed' : '⚠ e-mail NOT sent'}</span>}</div>
                <p className="text-text-2 whitespace-pre-wrap break-words mt-0.5">{r.message}</p>
              </li>
            ))}
          </ol></div>
      )}

      <form onSubmit={send} className="rounded-xl border border-accent-blue/40 p-4">
        <label htmlFor={`rep-${e.id}`} className="text-sm font-bold text-text-1 block mb-1.5">Reply to {e.name.split(' ')[0]} <span className="font-normal text-text-3">— sent to their e-mail</span></label>
        {state && state !== 'sending' && <div role="status" className={`mb-2.5 p-2.5 rounded-lg text-sm ${state.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>{state.msg}</div>}
        <textarea id={`rep-${e.id}`} rows={5} maxLength={5000} value={text} onChange={(ev) => setText(ev.target.value)} placeholder="Write your answer — price, availability, advice on dosage…" className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y mb-2.5" />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer"><input type="checkbox" checked={resolve} onChange={(ev) => setResolve(ev.target.checked)} className="w-4 h-4" />Mark as resolved</label>
          <button disabled={state === 'sending'} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="paper-plane" />{state === 'sending' ? 'Sending…' : 'Send reply'}</button>
        </div>
        <p className="text-xs text-text-3 mt-2">The customer receives it from {site.company_email}; their answer comes back to your e-mail.</p>
      </form>
    </div>
  )
}
