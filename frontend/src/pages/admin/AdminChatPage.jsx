import { useCallback, useEffect, useState } from 'react'
import { messagingApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import ChatWorkspace from '../../components/chat/ChatWorkspace'
import Icon from '../../components/Icon'

/** Shows a red panel (with the exact fix) when the server can't save chat messages — instead of a mystery failure. */
function ChatHealth() {
  const [problems, setProblems] = useState([])
  const [warns, setWarns] = useState([])
  useEffect(() => {
    messagingApi.diagnostics().then(({ data }) => {
      setProblems(data.checks.filter((c) => !c.ok && c.level !== 'warn'))
      setWarns(data.checks.filter((c) => !c.ok && c.level === 'warn'))
    }).catch(() => {})
  }, [])
  if (!problems.length && !warns.length) return null
  return (
    <div className="mb-4 space-y-2">
      {problems.map((c) => (
        <div key={c.name} role="alert" className="p-3.5 rounded-lg bg-accent-red/10 border border-accent-red text-sm text-text-1">
          <div className="font-bold text-accent-red flex items-center gap-2"><Icon name="exclamation-triangle" />Chat problem — {c.name}</div>
          <div className="mt-1">{c.detail}</div>{c.fix && <div className="mt-1 text-text-2"><strong>Fix:</strong> {c.fix}</div>}
        </div>
      ))}
      {warns.map((c) => (
        <div key={c.name} className="p-3 rounded-lg bg-bg-alt border border-border text-sm text-text-2"><strong className="text-text-1">{c.name}:</strong> {c.detail} {c.fix && <span className="text-text-3">{c.fix}</span>}</div>
      ))}
    </div>
  )
}

export default function AdminChatPage() {
  const { user } = useAuth()
  const loadContacts = useCallback(async () => {
    const { data } = await messagingApi.adminContacts()
    return {
      items: data.contacts.map((c) => ({ ...c, role: 'agent', sub: c.region })),
      teamPreview: data.last_team_preview, teamTime: data.last_team_time,
    }
  }, [])
  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-4 flex items-center gap-2"><Icon name="comments" />Messages</h1>
      <ChatHealth />
      <ChatWorkspace myId={user?.id} myRole="admin" loadContacts={loadContacts} searchPlaceholder="Search agents…" />
    </div>
  )
}
