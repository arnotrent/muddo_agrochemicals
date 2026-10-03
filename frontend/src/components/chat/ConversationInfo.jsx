import { useEffect, useState } from 'react'
import { messagingApi } from '../../api/services'
import ChatIcon from './ChatIcon'
import { formatDate, listTime } from './fileUtils'
import site from '../../data/siteConfig'

export default function ConversationInfo({ current, onClose, onOpenFile, onViewAll, onSearch, onClear, onCloseConversation, drawer }) {
  const [media, setMedia] = useState([])
  const [recent, setRecent] = useState([])
  const scope = current.role === 'broadcast' ? { id: 0, role: 'broadcast' } : { id: current.id, role: current.role }

  useEffect(() => {
    let live = true
    messagingApi.files({ with_id: scope.id, with_role: scope.role, sort: 'date_desc' }).then(({ data }) => {
      if (!live) return
      setMedia(data.files.filter((f) => f.category === 'image' || f.category === 'video').slice(0, 6))
      setRecent(data.files.filter((f) => f.category !== 'image' && f.category !== 'video').slice(0, 4))
    }).catch(() => {})
    return () => { live = false }
  }, [scope.id, scope.role, current])

  const body = (
    <div className="p-4 overflow-y-auto h-full">
      <div className="text-center mb-5">
        <div className="w-20 h-20 rounded-full bg-accent-blue text-white flex items-center justify-center text-3xl font-bold mx-auto overflow-hidden mb-2.5">
          {current.avatar_url ? <img src={current.avatar_url} alt="" className="w-full h-full object-cover" /> : (current.role === 'broadcast' ? <ChatIcon name="users" size="2rem" /> : current.name?.[0]?.toUpperCase())}
        </div>
        <div className="font-bold text-text-1">{current.name}</div>
        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-bg-alt text-accent-blue text-xs font-bold capitalize">{current.role === 'broadcast' ? 'Team channel' : current.role}</span>
      </div>

      <h4 className="text-[0.7rem] font-extrabold uppercase tracking-wide text-text-3 mb-2">Conversation details</h4>
      <dl className="text-sm mb-5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-text-3">Name</dt><dd className="text-text-1 font-semibold break-words">{current.name}</dd>
        <dt className="text-text-3">Role</dt><dd className="text-text-1 capitalize">{current.role === 'broadcast' ? 'Everyone' : current.role}</dd>
        {current.username && <><dt className="text-text-3">Username</dt><dd className="text-text-1">@{current.username}</dd></>}
        {current.email && <><dt className="text-text-3">Email</dt><dd className="text-text-1 break-all">{current.email}</dd></>}
        {current.phone && <><dt className="text-text-3">Phone</dt><dd className="text-text-1">{current.phone}</dd></>}
        {current.region && <><dt className="text-text-3">Region</dt><dd className="text-text-1">{current.region}{current.district ? ` · ${current.district}` : ''}</dd></>}
        {current.joined && <><dt className="text-text-3">Account created</dt><dd className="text-text-1">{formatDate(current.joined)}</dd></>}
        {current.firstAt && <><dt className="text-text-3">Conversation started</dt><dd className="text-text-1">{formatDate(current.firstAt)}</dd></>}
        {current.role !== 'broadcast' && <><dt className="text-text-3">Last active</dt><dd className="text-text-1">{current.is_online ? 'Online now' : current.last_seen ? `${formatDate(current.last_seen)}, ${listTime(current.last_seen)}` : 'Not available'}</dd></>}
      </dl>

      <h4 className="text-[0.7rem] font-extrabold uppercase tracking-wide text-text-3 mb-2">Media</h4>
      {media.length ? (
        <div className="grid grid-cols-3 gap-1.5 mb-5">
          {media.map((m) => <button key={m.id} onClick={() => onOpenFile(m, media)} aria-label={`Open ${m.name}`} className="aspect-square rounded-lg overflow-hidden bg-bg-alt">{m.category === 'image' ? <img src={m.url} alt={m.name} loading="lazy" className="w-full h-full object-cover" /> : <ChatIcon name="film" className="text-accent-blue mx-auto" size="1.5rem" />}</button>)}
        </div>
      ) : <p className="text-sm text-text-3 mb-5">No images or videos yet.</p>}

      <h4 className="text-[0.7rem] font-extrabold uppercase tracking-wide text-text-3 mb-2">Shared files</h4>
      {recent.length ? <ul className="mb-5 flex flex-col gap-1">{recent.map((f) => <li key={f.id}><button onClick={() => onOpenFile(f, recent)} className="w-full text-left text-sm text-text-1 hover:text-accent-blue truncate flex items-center gap-2"><ChatIcon name="file" className="text-text-3" />{f.name}</button></li>)}</ul>
        : <p className="text-sm text-text-3 mb-5">No shared files — files shared in this conversation will appear here.</p>}

      <h4 className="text-[0.7rem] font-extrabold uppercase tracking-wide text-text-3 mb-2">Actions</h4>
      <div className="flex flex-col gap-1.5">
        {[['search', 'Search messages', onSearch], ['file', 'View all attachments', onViewAll], ['x', 'Clear conversation view', onClear]].map(([i, l, fn]) => (
          <button key={l} onClick={fn} className="px-3 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-semibold flex items-center gap-2 hover:text-accent-blue text-left"><ChatIcon name={i} />{l}</button>
        ))}
        <a href={`mailto:${site.company_email}?subject=${encodeURIComponent(`Chat issue — ${current.name}`)}`} className="px-3 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-semibold flex items-center gap-2 hover:text-accent-blue"><ChatIcon name="alert" />Report issue</a>
        <button onClick={onCloseConversation} className="px-3 py-2 rounded-lg border border-accent-red text-accent-red text-sm font-semibold flex items-center gap-2 text-left"><ChatIcon name="x" />Close conversation</button>
      </div>
    </div>
  )

  if (!drawer) return <aside className="w-[300px] border-l border-border bg-bg-card flex-shrink-0 hidden xl:block" aria-label="Conversation information">{body}</aside>
  return (
    <div className="fixed inset-0 z-[3000] bg-black/50 xl:hidden" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-[88vw] max-w-[340px] bg-bg-card animate-drawerIn" onClick={(e) => e.stopPropagation()} aria-label="Conversation information">
        <button onClick={onClose} aria-label="Close panel" className="absolute top-3 right-3 text-text-3 z-10"><ChatIcon name="x" size="1.2rem" /></button>
        {body}
      </aside>
    </div>
  )
}
