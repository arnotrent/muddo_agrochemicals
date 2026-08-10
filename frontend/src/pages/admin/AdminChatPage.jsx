import { useEffect, useState } from 'react'
import { messagingApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../hooks/useChat'
import ChatWindow from '../../components/ChatWindow'
import Icon from '../../components/Icon'

export default function AdminChatPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState({ contacts: [], last_team_preview: '' })
  const [search, setSearch] = useState('')
  const { current, messages, sending, selectContact, send } = useChat()

  useEffect(() => {
    messagingApi.adminContacts().then(({ data }) => setContacts(data))
  }, [])

  const filtered = contacts.contacts.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[480px] border border-border rounded-card overflow-hidden bg-bg-card">
      <div className="w-[300px] border-r border-border overflow-y-auto flex-shrink-0 bg-bg-alt">
        <div className="p-2.5 border-b border-border bg-bg-card">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents…" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-input text-sm" />
        </div>
        <button
          onClick={() => selectContact({ id: 0, role: 'broadcast', name: 'Team (Everyone)' })}
          className="w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5"
        >
          <div className="w-10 h-10 rounded-xl bg-bg-deep text-white flex items-center justify-center text-lg flex-shrink-0"><Icon name="users" /></div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-text-1">{'📢'} Team (Everyone)</div>
            <div className="text-xs text-text-3 truncate">{contacts.last_team_preview || 'Message everyone at once'}</div>
          </div>
        </button>
        <div className="px-4 pt-3 pb-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-text-3">Field Agents ({filtered.length})</div>
        {filtered.map((a) => (
          <button key={a.id} onClick={() => selectContact({ id: a.id, role: 'agent', name: a.name, avatar: a.avatar_url, is_online: a.is_online })} className="w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5">
            <div className="w-10 h-10 rounded-xl bg-accent-blue text-white flex items-center justify-center font-bold flex-shrink-0 overflow-hidden relative">
              {a.avatar_url ? <img src={a.avatar_url} className="w-full h-full object-cover" /> : a.name?.[0]?.toUpperCase()}
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-bg-alt ${a.is_online ? 'bg-accent-green' : 'bg-text-4'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-text-1">{a.name}</div>
              <div className="text-xs text-text-3 truncate">{a.last_message_preview || a.region}</div>
            </div>
            {a.unread_from > 0 && <span className="bg-accent-red text-white text-xs font-bold px-2 py-0.5 rounded-full">{a.unread_from}</span>}
          </button>
        ))}
        {!filtered.length && <div className="p-7 text-center text-text-3 text-sm"><Icon name="users" size="2rem" className="block mx-auto mb-2.5 opacity-40" />No agents yet.</div>}
      </div>

      <ChatWindow myId={user?.id} myRole="admin" current={current} messages={messages} sending={sending} onSend={send} />
    </div>
  )
}
