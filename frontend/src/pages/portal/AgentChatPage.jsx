import { useEffect, useState } from 'react'
import { messagingApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../hooks/useChat'
import ChatWindow from '../../components/ChatWindow'
import Icon from '../../components/Icon'

export default function AgentChatPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState({ admin: null, other_agents: [], last_team_preview: '' })
  const { current, messages, sending, selectContact, send } = useChat()

  useEffect(() => {
    messagingApi.agentContacts().then(({ data }) => setContacts(data))
  }, [])

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[480px] border border-border rounded-card overflow-hidden bg-bg-card">
      <div className="w-[280px] border-r border-border overflow-y-auto flex-shrink-0 bg-bg-alt">
        <button
          onClick={() => selectContact({ id: 0, role: 'broadcast', name: 'Team (Everyone)' })}
          className="w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5"
        >
          <div className="w-10 h-10 rounded-xl bg-bg-deep text-white flex items-center justify-center text-lg flex-shrink-0"><Icon name="users" /></div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-text-1">{'📢'} Team</div>
            <div className="text-xs text-text-3 truncate">{contacts.last_team_preview || 'Message everyone'}</div>
          </div>
        </button>

        {contacts.admin && (
          <button
            onClick={() => selectContact({ id: contacts.admin.id, role: 'admin', name: 'Muddo Agro Admin' })}
            className="w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5"
          >
            <div className="w-10 h-10 rounded-xl bg-bg-deep text-white flex items-center justify-center font-bold flex-shrink-0">A</div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-text-1">Muddo Agro Admin</div>
              <div className="text-xs text-text-3 truncate">{contacts.admin.last_message_preview || 'Head Office'}</div>
            </div>
            {contacts.admin.unread_from > 0 && <span className="bg-accent-red text-white text-xs font-bold px-2 py-0.5 rounded-full">{contacts.admin.unread_from}</span>}
          </button>
        )}

        {contacts.other_agents.map((a) => (
          <button key={a.id} onClick={() => selectContact({ id: a.id, role: 'agent', name: a.name, avatar: a.avatar_url })} className="w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5">
            <div className="w-10 h-10 rounded-xl bg-accent-blue text-white flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
              {a.avatar_url ? <img src={a.avatar_url} className="w-full h-full object-cover" /> : a.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-text-1">{a.name}</div>
              <div className="text-xs text-text-3 truncate">{a.last_message_preview || a.region}</div>
            </div>
            {a.unread_from > 0 && <span className="bg-accent-red text-white text-xs font-bold px-2 py-0.5 rounded-full">{a.unread_from}</span>}
          </button>
        ))}
      </div>

      <ChatWindow myId={user?.agent?.id} myRole="agent" current={current} messages={messages} sending={sending} onSend={send} />
    </div>
  )
}
