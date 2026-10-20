import { useCallback } from 'react'
import { messagingApi } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import ChatWorkspace from '../../components/chat/ChatWorkspace'
import Icon from '../../components/Icon'

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
      <ChatWorkspace myId={user?.id} myRole="admin" loadContacts={loadContacts} searchPlaceholder="Search agents…" />
    </div>
  )
}
