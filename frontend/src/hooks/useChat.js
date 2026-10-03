import { useCallback, useEffect, useRef, useState } from 'react'
import { messagingApi } from '../api/services'
import { categoryOf, extOf } from '../components/chat/fileUtils'

/**
 * Polling chat (deliberately not WebSockets). 3s poll while a conversation is open.
 *  - optimistic "sending" bubbles with real upload progress (axios onUploadProgress)
 *  - failed sends stay in the list with Retry / Remove
 *  - first load fetches the newest 100 messages; polls only fetch what's new
 *  - polling pauses while the tab is hidden, and a request can't overlap the next tick
 */
export function useChat() {
  const [current, setCurrent] = useState(null)
  const [messages, setMessages] = useState([])
  const [pending, setPending] = useState([]) // local, not yet confirmed by the server
  const [sending, setSending] = useState(false)
  const lastIdRef = useRef(0)
  const pollRef = useRef(null)
  const busyRef = useRef(false)
  const targetRef = useRef(null)

  const loadMessages = useCallback(async (target) => {
    if (!target || busyRef.current) return
    busyRef.current = true
    try {
      const params = target.role === 'broadcast'
        ? { with_role: 'broadcast', after: lastIdRef.current }
        : { with_id: target.id, with_role: target.role, after: lastIdRef.current }
      const { data } = await messagingApi.list(params)
      if (targetRef.current !== target) return // user switched conversation mid-flight
      const fresh = (data.messages || []).filter((m) => m.id > lastIdRef.current)
      if (fresh.length) {
        lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id))
        setMessages((prev) => {
          const have = new Set(prev.map((m) => m.id))
          return [...prev, ...fresh.filter((m) => !have.has(m.id))]
        })
      }
      // refresh read/delivered state of what we already show (ticks)
      if (lastIdRef.current) refreshStatuses(target)
      messagingApi.markRead(target.role === 'broadcast' ? { from_role: 'broadcast' } : { from_id: target.id, from_role: target.role }).catch(() => {})
    } catch { /* transient — next tick retries */ } finally { busyRef.current = false }
  }, [])

  const refreshStatuses = async (target) => {
    try {
      const params = target.role === 'broadcast' ? { with_role: 'broadcast', after: 0 } : { with_id: target.id, with_role: target.role, after: 0 }
      const { data } = await messagingApi.list(params)
      if (targetRef.current !== target) return
      const byId = new Map((data.messages || []).map((m) => [m.id, m]))
      setMessages((prev) => prev.map((m) => (byId.has(m.id) && byId.get(m.id).status !== m.status ? { ...m, status: byId.get(m.id).status, read: byId.get(m.id).read } : m)))
    } catch { /* ignore */ }
  }

  const startPolling = useCallback((target) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { if (!document.hidden) loadMessages(target) }, 3000)
  }, [loadMessages])

  const selectContact = useCallback((target) => {
    targetRef.current = target
    setCurrent(target); setMessages([]); setPending([])
    lastIdRef.current = 0; busyRef.current = false
    loadMessages(target)
    startPolling(target)
  }, [loadMessages, startPolling])

  const closeConversation = useCallback(() => {
    clearInterval(pollRef.current); targetRef.current = null
    setCurrent(null); setMessages([]); setPending([])
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const transmit = useCallback(async (draft, target) => {
    const upd = (patch) => setPending((p) => p.map((d) => (d.localId === draft.localId ? { ...d, ...patch } : d)))
    upd({ state: 'sending', progress: 0 })
    try {
      const fd = new FormData()
      fd.append('content', draft.content || '')
      if (target.role === 'broadcast') fd.append('broadcast', 'true')
      else { fd.append('to_id', target.id); fd.append('to_role', target.role) }
      if (draft.replyTo) fd.append('reply_to', draft.replyTo)
      draft.files.forEach((f) => fd.append('attachments', f))
      const { data } = await messagingApi.send(fd, (e) => {
        if (e.total) upd({ progress: Math.min(99, Math.round((e.loaded / e.total) * 100)) })
      })
      upd({ state: 'done', progress: 100 })
      lastIdRef.current = Math.max(lastIdRef.current, data.message.id)
      if (targetRef.current === target) setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]))
      setTimeout(() => setPending((p) => p.filter((d) => d.localId !== draft.localId)), 600)
    } catch (err) {
      upd({ state: 'failed', error: err.response?.data?.detail || err.response?.data?.errors?.detail?.[0] || 'Failed to send' })
    }
  }, [])

  const send = useCallback(async ({ content, files = [], replyTo }) => {
    if (!current || (!content && !files.length)) return
    const draft = { localId: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`, content, files, replyTo, state: 'sending', progress: 0, created_at: new Date().toISOString() }
    setPending((p) => [...p, draft])
    setSending(true)
    await transmit(draft, current)
    setSending(false)
  }, [current, transmit])

  const retry = useCallback((localId) => {
    const d = pending.find((x) => x.localId === localId)
    if (d && current) transmit(d, current)
  }, [pending, current, transmit])

  const discard = useCallback((localId) => setPending((p) => p.filter((d) => d.localId !== localId)), [])

  // attach metadata so a pending draft renders through the same bubble code
  const pendingView = pending.map((d) => ({
    ...d,
    attachments: d.files.map((f, i) => ({
      id: `${d.localId}-${i}`, name: f.name, extension: extOf(f.name), category: categoryOf(f.name), size: f.size,
      url: categoryOf(f.name) === 'image' ? URL.createObjectURL(f) : null, pending: true,
    })),
  }))

  return { current, messages, pending: pendingView, sending, selectContact, closeConversation, send, retry, discard }
}
