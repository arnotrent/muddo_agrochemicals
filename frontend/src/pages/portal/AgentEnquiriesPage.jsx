import { useEffect, useState } from 'react'
import { enquiriesApi } from '../../api/enquiries'
import EnquiryPanel from '../../components/EnquiryPanel'
import Icon from '../../components/Icon'

const BADGE = { new: 'bg-bg-alt text-accent-blue', pending: 'bg-accent-blue/15 text-accent-blue', resolved: 'bg-accent-green/15 text-accent-green' }

export default function AgentEnquiriesPage() {
  const [rows, setRows] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [show, setShow] = useState('open')
  const load = () => enquiriesApi.agentList().then(({ data }) => setRows(data.results || data)).catch(() => setRows([]))
  useEffect(() => { load() }, [])
  const list = (rows || []).filter((r) => (show === 'open' ? r.status !== 'resolved' : r.status === 'resolved'))
  const open = (rows || []).find((r) => r.id === openId)
  const reply = async (text, resolve) => { const { data } = await enquiriesApi.agentReply(openId, { message: text, resolve }); setRows((rs) => rs.map((r) => (r.id === openId ? data.enquiry : r))); return data }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-1 flex items-center gap-2"><Icon name="envelope" />Customer Enquiries</h1>
      <p className="text-sm text-text-3 mb-5">Enquiries the administrator forwarded to you. Read the customer's request, call or WhatsApp them, and send your answer by e-mail from here.</p>
      <div className="flex gap-2 mb-4">{[['open', 'To answer'], ['done', 'Resolved']].map(([k, l]) => <button key={k} onClick={() => setShow(k)} className={`px-3.5 py-1.5 rounded-btn text-sm font-bold ${show === k ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}</button>)}</div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_520px] gap-5 items-start">
        <div className="bg-bg-card border border-border rounded-card overflow-hidden">
          {rows === null && <div className="p-10 text-center text-text-3">Loading…</div>}
          {list.map((r) => (
            <button key={r.id} onClick={() => setOpenId(r.id)} className={`w-full text-left p-4 border-b border-border last:border-0 hover:bg-bg-alt flex gap-3 items-start ${openId === r.id ? 'bg-accent-blue/5' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap"><strong className="text-text-1 text-sm">{r.name}</strong><span className="font-mono text-[0.68rem] text-accent-blue font-bold">{r.ref_number}</span></div>
                <div className="text-sm text-text-2 truncate">{r.subject} — {r.message}</div>
                {r.assigned_note && <div className="text-xs text-accent-blue mt-0.5 truncate">Admin note: {r.assigned_note}</div>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${BADGE[r.status]}`}>{r.status}</span>
            </button>
          ))}
          {rows && !list.length && <div className="p-10 text-center text-text-3">{show === 'open' ? 'Nothing waiting for you — enquiries forwarded by the admin will appear here.' : 'No resolved enquiries yet.'}</div>}
        </div>
        <aside className="bg-bg-card border border-border rounded-card p-5 xl:sticky xl:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          {!open ? <div className="text-center text-text-3 py-14"><Icon name="envelope" size="2.2rem" className="block mx-auto mb-3 opacity-40" />Select an enquiry to answer it.</div> : (
            <EnquiryPanel enquiry={open} onReply={reply}>
              {open.assigned_note && <div className="rounded-xl bg-accent-blue/5 border border-accent-blue/30 p-3.5 text-sm text-text-2"><strong className="text-text-1">Note from the admin:</strong> {open.assigned_note}</div>}
            </EnquiryPanel>
          )}
        </aside>
      </div>
    </div>
  )
}
