import { useCallback } from 'react'
import { messagingApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import ChatWorkspace from '../../components/chat/ChatWorkspace'
import Icon from '../../components/Icon'

export default function AgentChatPage() {
  const { user } = useAuth()
  const loadContacts = useCallback(async () => {
    const { data } = await messagingApi.agentContacts()
    const items = [
      ...(data.admin ? [{ ...data.admin, role: 'admin', name: 'Muddo Agro Admin', sub: 'Head Office', is_online: true }] : []),
      ...data.other_agents.map((a) => ({ ...a, role: 'agent', sub: a.region })),
    ]
    return { items, teamPreview: data.last_team_preview, teamTime: data.last_team_time }
  }, [])
  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-4 flex items-center gap-2"><Icon name="comments" />Messages</h1>
      <ChatWorkspace myId={user?.agent?.id} myRole="agent" loadContacts={loadContacts} searchPlaceholder="Search conversations…" />
    </div>
  )
}
