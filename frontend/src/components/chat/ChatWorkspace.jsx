import { useEffect, useMemo, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import ChatWindow from '../ChatWindow'
import ChatIcon from './ChatIcon'
import AttachmentViewer from './AttachmentViewer'
import SharedFilesPanel from './SharedFilesPanel'
import ConversationInfo from './ConversationInfo'
import { listTime } from './fileUtils'

/**
 * Three-pane chat shared by Admin and Agent.
 *   desktop (xl): conversations | chat | info      tablet (md): conversations | chat, info = drawer
 *   mobile: one pane at a time with slide transitions
 * `loadContacts` returns { items, teamPreview, teamTime } already normalised by the page.
 */
export default function ChatWorkspace({ myId, myRole, loadContacts, searchPlaceholder = 'Search conversations…' }) {
  const chat = useChat()
  const { current } = chat
  const [data, setData] = useState({ items: [], teamPreview: '', teamTime: null })
  const [search, setSearch] = useState('')
  const [msgSearch, setMsgSearch] = useState('')
  const [msgSearchOpen, setMsgSearchOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [viewer, setViewer] = useState(null) // { items, index }
  const [cleared, setCleared] = useState({})
  const key = current ? `${current.role}:${current.id}` : ''

  useEffect(() => {
    let live = true
    const load = () => !document.hidden && loadContacts().then((d) => live && setData(d)).catch(() => {})
    load()
    const t = setInterval(load, 8000)
    return () => { live = false; clearInterval(t) }
  }, [loadContacts])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.items.filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [data.items, search])

  const select = (c) => { setMsgSearch(''); setMsgSearchOpen(false); setInfoOpen(false); chat.selectContact(c) }
  const open = (att, list) => {
    const arr = (list || [att]).filter((x) => x.url || !x.pending)
    setViewer({ items: arr, index: Math.max(0, arr.findIndex((x) => x.id === att.id)) })
  }
  const enriched = current && { ...current, ...(data.items.find((c) => c.id === current.id && c.role === current.role) || {}), firstAt: chat.messages[0]?.created_at }
  const scope = current && (current.role === 'broadcast' ? { id: 0, role: 'broadcast' } : { id: current.id, role: current.role })

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[520px] border border-border rounded-card overflow-hidden bg-bg-card relative">
      {/* conversation list */}
      <div className={`${current ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] border-r border-border flex-col flex-shrink-0 bg-bg-alt min-h-0`}>
        <div className="p-2.5 border-b border-border bg-bg-card flex gap-2">
          <div className="relative flex-1">
            <ChatIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search conversations" placeholder={searchPlaceholder} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-bg-input text-sm text-text-1 outline-none focus:border-accent-blue" />
          </div>
          <button onClick={() => setFilesOpen('all')} aria-label="Search all shared files" title="Search all shared files" className="w-9 h-9 rounded-lg border border-border bg-bg-input text-text-2 hover:text-accent-blue flex items-center justify-center"><ChatIcon name="paperclip" /></button>
        </div>
        <div className="flex-1 overflow-y-auto" role="list">
          <button role="listitem" onClick={() => select({ id: 0, role: 'broadcast', name: 'Team (Everyone)' })} className={`w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5 ${key === 'broadcast:0' ? 'bg-accent-blue/10' : ''}`}>
            <div className="w-11 h-11 rounded-full bg-bg-deep text-white flex items-center justify-center flex-shrink-0"><ChatIcon name="users" size="1.2rem" /></div>
            <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="font-extrabold text-sm text-text-1">Team (Everyone)</span><span className="text-[0.66rem] text-text-3">{listTime(data.teamTime)}</span></div>
              <div className="text-xs text-text-3 truncate">{data.teamPreview || 'Message everyone at once'}</div></div>
          </button>
          {items.map((c) => (
            <button role="listitem" key={`${c.role}:${c.id}`} onClick={() => select(c)} className={`w-full flex items-center gap-2.5 p-3.5 text-left border-b border-border hover:bg-accent-blue/5 transition-colors ${key === `${c.role}:${c.id}` ? 'bg-accent-blue/10' : c.unread_from > 0 ? 'bg-accent-blue/[0.04]' : ''}`}>
              <div className="w-11 h-11 rounded-full bg-accent-blue text-white flex items-center justify-center font-bold flex-shrink-0 overflow-hidden relative">
                {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.name?.[0]?.toUpperCase()}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-alt ${c.is_online ? 'bg-accent-green' : 'bg-text-4'}`} aria-label={c.is_online ? 'Online' : 'Offline'} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 items-baseline"><span className={`text-sm text-text-1 truncate ${c.unread_from > 0 ? 'font-extrabold' : 'font-bold'}`}>{c.name}</span><span className="text-[0.66rem] text-text-3 flex-shrink-0">{listTime(c.last_message_time)}</span></div>
                <div className="flex justify-between gap-2 items-center"><span className={`text-xs truncate ${c.unread_from > 0 ? 'text-text-1 font-semibold' : 'text-text-3'}`}>{c.last_message_mine && c.last_message_preview ? 'You: ' : ''}{c.last_message_preview || c.sub || ''}</span>
                  {c.unread_from > 0 && <span className="bg-accent-blue text-white text-[0.66rem] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0">{c.unread_from}</span>}</div>
              </div>
            </button>
          ))}
          {!items.length && (
            <div className="p-8 text-center text-text-3 text-sm"><ChatIcon name="users" size="2rem" className="block mx-auto mb-2.5 opacity-40" /><div className="font-bold text-text-2">No conversations yet</div>Start a conversation with an administrator or agent.</div>
          )}
        </div>
      </div>

      {/* active conversation */}
      <div className={`${current ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 min-h-0`}>
        <ChatWindow
          myId={myId} myRole={myRole} current={enriched} messages={chat.messages} pending={chat.pending}
          onSend={chat.send} onRetry={chat.retry} onDiscard={chat.discard}
          onBack={chat.closeConversation} onOpenInfo={() => setInfoOpen(true)} onOpenFiles={() => setFilesOpen('conversation')}
          onOpenAttachment={open} clearedBefore={cleared[key]} search={msgSearch} setSearch={setMsgSearch}
          searchOpen={msgSearchOpen} setSearchOpen={setMsgSearchOpen}
        />
        {current && infoOpen && window.innerWidth >= 1280 && (
          <ConversationInfo current={enriched} onClose={() => setInfoOpen(false)} onOpenFile={open}
            onViewAll={() => setFilesOpen('conversation')} onSearch={() => setMsgSearchOpen(true)}
            onClear={() => setCleared((c) => ({ ...c, [key]: chat.messages.at(-1)?.id || 0 }))}
            onCloseConversation={() => { setInfoOpen(false); chat.closeConversation() }} />
        )}
      </div>
      {current && infoOpen && window.innerWidth < 1280 && (
        <ConversationInfo drawer current={enriched} onClose={() => setInfoOpen(false)} onOpenFile={(a, l) => { setInfoOpen(false); open(a, l) }}
          onViewAll={() => { setInfoOpen(false); setFilesOpen('conversation') }} onSearch={() => { setInfoOpen(false); setMsgSearchOpen(true) }}
          onClear={() => { setCleared((c) => ({ ...c, [key]: chat.messages.at(-1)?.id || 0 })); setInfoOpen(false) }}
          onCloseConversation={() => { setInfoOpen(false); chat.closeConversation() }} />
      )}

      {filesOpen && <SharedFilesPanel scope={filesOpen === 'conversation' ? scope : null} title={filesOpen === 'conversation' ? `Shared files — ${current?.name}` : 'All shared files'} onClose={() => setFilesOpen(false)} onOpen={(a, l) => open(a, l)} />}
      {viewer && <AttachmentViewer items={viewer.items} index={viewer.index} onIndex={(i) => setViewer((v) => ({ ...v, index: i }))} onClose={() => setViewer(null)} />}
    </div>
  )
}
