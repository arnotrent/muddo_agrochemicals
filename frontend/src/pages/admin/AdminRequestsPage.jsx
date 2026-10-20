import { useEffect, useMemo, useState } from 'react'
import { enquiriesApi } from '../../api/enquiries'
import { agentsApi } from '../../api/services'
import EnquiryPanel from '../../components/EnquiryPanel'
import Icon from '../../components/Icon'

const FILTERS = [['', 'All'], ['new', 'New'], ['pending', 'In progress'], ['resolved', 'Resolved']]
const BADGE = { new: 'bg-bg-alt text-accent-blue', pending: 'bg-accent-blue/15 text-accent-blue', resolved: 'bg-accent-green/15 text-accent-green' }

export default function AdminRequestsPage() {
  const [rows, setRows] = useState([])
  const [agents, setAgents] = useState([])
  const [filter, setFilter] = useState('')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [agentId, setAgentId] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState(null)

  const load = () => enquiriesApi.adminList().then(({ data }) => setRows(data.results || data)).catch(() => setMsg({ ok: false, text: 'Could not load enquiries.' }))
  useEffect(() => { load(); agentsApi.adminList().then(({ data }) => setAgents((data.results || data).filter((a) => a.status === 'active'))).catch(() => {}) }, [])

  const filtered = useMemo(() => rows.filter((r) => (!filter || r.status === filter) &&
    (!q.trim() || [r.name, r.email, r.subject, r.ref_number, r.message].some((x) => (x || '').toLowerCase().includes(q.trim().toLowerCase())))), [rows, filter, q])
  const open = rows.find((r) => r.id === openId)
  const patch = (updated) => setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))

  const reply = async (text, resolve) => { const { data } = await enquiriesApi.adminReply(openId, { message: text, resolve }); patch(data.enquiry); return data }
  const assign = async (e) => {
    e.preventDefault()
    if (!agentId) return setMsg({ ok: false, text: 'Choose an agent first.' })
    try { const { data } = await enquiriesApi.adminAssign(openId, { agent_id: agentId, note }); patch(data.enquiry); setNote(''); setAgentId(''); setMsg({ ok: true, text: `Forwarded to ${data.enquiry.assigned_agent_name}. They were notified in chat${''} and can now answer the customer.` }) }
    catch (err) { setMsg({ ok: false, text: err.response?.data?.detail || 'Could not forward.' }) }
  }
  const takeBack = async () => { const { data } = await enquiriesApi.adminAssign(openId, { agent_id: null }); patch(data.enquiry); setMsg({ ok: true, text: 'Enquiry taken back.' }) }
  const setStatus = async (status) => { await enquiriesApi.adminSetStatus(openId, status); load() }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="envelope" />Customer Enquiries</h1>
      {msg && <div role="status" className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between gap-3 ${msg.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>{msg.text}<button onClick={() => setMsg(null)} aria-label="Dismiss"><Icon name="times" /></button></div>}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {FILTERS.map(([s, l]) => <button key={s} onClick={() => setFilter(s)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${filter === s ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}{s === '' ? ` (${rows.length})` : ` (${rows.filter((r) => r.status === s).length})`}</button>)}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ref, subject…" aria-label="Search enquiries" className="ml-auto w-full sm:w-64 px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_520px] gap-5 items-start">
        <div className="bg-bg-card border border-border rounded-card overflow-hidden">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => { setOpenId(r.id); setMsg(null) }} className={`w-full text-left p-4 border-b border-border last:border-0 hover:bg-bg-alt flex gap-3 items-start ${openId === r.id ? 'bg-accent-blue/5' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap"><strong className="text-text-1 text-sm">{r.name}</strong><span className="font-mono text-[0.68rem] text-accent-blue font-bold">{r.ref_number}</span></div>
                <div className="text-sm text-text-2 truncate">{r.subject} — {r.message}</div>
                <div className="text-xs text-text-3 mt-0.5">{new Date(r.created_at).toLocaleString()}{r.assigned_agent_name && <> · <span className="text-accent-blue font-semibold">→ {r.assigned_agent_name}</span></>}{r.replies.some((x) => x.kind === 'reply') && ' · replied'}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${BADGE[r.status]}`}>{r.status}</span>
            </button>
          ))}
          {!filtered.length && <div className="p-10 text-center text-text-3">No enquiries here.</div>}
        </div>

        <aside className="bg-bg-card border border-border rounded-card p-5 xl:sticky xl:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto" aria-live="polite">
          {!open ? <div className="text-center text-text-3 py-14"><Icon name="envelope" size="2.2rem" className="block mx-auto mb-3 opacity-40" />Select an enquiry to read it, reply to the customer, or forward it to an agent.</div> : (
            <EnquiryPanel enquiry={open} onReply={reply}>
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-bold uppercase tracking-wide text-text-3">Forward to an agent</div>
                  <div className="flex gap-1.5">{['new', 'pending', 'resolved'].filter((s) => s !== open.status).map((s) => <button key={s} onClick={() => setStatus(s)} className="px-2.5 py-1 rounded-md bg-bg-alt text-text-2 text-xs font-bold">Mark {s === 'pending' ? 'in progress' : s}</button>)}</div>
                </div>
                {open.assigned_agent_name && (
                  <div className="text-sm flex items-center justify-between gap-2 flex-wrap bg-accent-blue/5 rounded-lg p-2.5">
                    <span>Currently with <strong>{open.assigned_agent_name}</strong>{open.assigned_agent_phone ? ` · ${open.assigned_agent_phone}` : ''}</span>
                    <button onClick={takeBack} className="text-xs font-bold text-accent-red">Take back</button>
                  </div>
                )}
                <form onSubmit={assign} className="space-y-2.5">
                  <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agent" className="w-full px-3 py-2.5 rounded-input border border-border bg-bg-input text-text-1 text-sm">
                    <option value="">Choose an agent…</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.region}{a.district ? `, ${a.district}` : ''}</option>)}
                  </select>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="Instructions for the agent (optional) — e.g. “Call her today, she is in Mbale.”" className="w-full px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm resize-y" />
                  <button className="px-4 py-2 rounded-btn bg-bg-deep text-white font-bold text-sm flex items-center gap-2"><Icon name="reply" />{open.assigned_agent_name ? 'Forward to another agent' : 'Forward to agent'}</button>
                </form>
              </div>
            </EnquiryPanel>
          )}
        </aside>
      </div>
    </div>
  )
}
