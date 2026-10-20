import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { messagingApi } from '../api/services'
import { categoryOf, extOf } from '../components/chat/fileUtils'

const POLL_MS = 2500
const byId = (a, b) => a.id - b.id
const merge = (prev, incoming) => {
  const map = new Map(prev.map((m) => [m.id, m]))
  incoming.forEach((m) => map.set(m.id, { ...(map.get(m.id) || {}), ...m }))
  return [...map.values()].sort(byId)
}

/**
 * Polling chat (no WebSockets). One request per tick (new messages + tick status of my sent ones).
 *  - optimistic "sending" bubbles with real upload progress; failed sends stay with Retry / Remove
 *  - first load fetches the newest 100; later polls fetch only what is new
 *  - "mark as read" is sent only when something new arrived (not every poll)
 *  - never skips a message: the cursor moves only with what the server actually returned
 *  - preview URLs for pending images are created once per draft and freed afterwards (no memory leak)
 * `myId` / `myRole` identify my own messages so their tick status can be tracked.
 */
export function useChat(myId, myRole) {
  const [current, setCurrent] = useState(null)
  const [messages, setMessages] = useState([])
  const [pending, setPending] = useState([])
  const [sending, setSending] = useState(false)
  const lastIdRef = useRef(0)
  const pollRef = useRef(null)
  const busyRef = useRef(false)
  const targetRef = useRef(null)
  const messagesRef = useRef([])
  const urlsRef = useRef(new Map())
  messagesRef.current = messages

  const markRead = useCallback((target) => {
    if (document.hidden) return
    messagingApi.markRead(target.role === 'broadcast' ? { from_role: 'broadcast' } : { from_id: target.id, from_role: target.role }).catch(() => {})
  }, [])

  const loadMessages = useCallback(async (target) => {
    if (!target || busyRef.current) return
    busyRef.current = true
    try {
      const initial = lastIdRef.current === 0
      const params = target.role === 'broadcast'
        ? { with_role: 'broadcast', after: lastIdRef.current }
        : { with_id: target.id, with_role: target.role, after: lastIdRef.current }
      if (target.role !== 'broadcast') {
        const track = messagesRef.current.filter((m) => m.sender_role === myRole && m.sender_id === myId && m.status !== 'read').slice(-50).map((m) => m.id)
        if (track.length) params.track = track.join(',')
      }
      const { data } = await messagingApi.list(params)
      if (targetRef.current !== target) return // user switched conversation mid-flight
      const incoming = data.messages || []
      const statuses = data.statuses || {}
      const have = new Set(messagesRef.current.map((m) => m.id))
      const brandNew = incoming.filter((m) => !have.has(m.id))
      if (incoming.length) lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id))
      if (incoming.length || Object.keys(statuses).length) {
        setMessages((prev) => {
          let next = incoming.length ? merge(prev, incoming) : prev
          if (Object.keys(statuses).length) next = next.map((m) => (statuses[m.id] ? { ...m, ...statuses[m.id] } : m))
          return next
        })
      }
      if (initial || brandNew.length) markRead(target)
    } catch { /* transient — next tick retries */ } finally { busyRef.current = false }
  }, [markRead, myId, myRole])

  const startPolling = useCallback((target) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { if (!document.hidden) loadMessages(target) }, POLL_MS)
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

  // catch up the instant the tab becomes visible again / the network returns
  useEffect(() => {
    const now = () => { if (!document.hidden && targetRef.current) loadMessages(targetRef.current) }
    document.addEventListener('visibilitychange', now); window.addEventListener('online', now); window.addEventListener('focus', now)
    return () => { document.removeEventListener('visibilitychange', now); window.removeEventListener('online', now); window.removeEventListener('focus', now) }
  }, [loadMessages])

  useEffect(() => () => {
    clearInterval(pollRef.current)
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); urlsRef.current.clear()
  }, [])

  const transmit = useCallback(async (draft, target) => {
    const upd = (patch) => setPending((p) => p.map((d) => (d.localId === draft.localId ? { ...d, ...patch } : d)))
    upd({ state: 'sending', progress: 0, error: undefined })
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
      // NOTE: the poll cursor is deliberately NOT moved here — a message from the other side that arrived
      // just before mine would otherwise be skipped forever. The next poll de-duplicates by id.
      if (targetRef.current === target) setMessages((prev) => merge(prev, [data.message]))
      setTimeout(() => setPending((p) => p.filter((d) => d.localId !== draft.localId)), 600)
    } catch (err) {
      const d = err.response?.data
      const first = (v) => (Array.isArray(v) ? v[0] : v)
      upd({ state: 'failed', error: first(d?.errors?.detail) || first(d?.detail) || (err.code === 'ERR_NETWORK' ? 'No connection to the server.' : 'Failed to send') })
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

  // free preview URLs of drafts that are gone
  useEffect(() => {
    const live = new Set(pending.map((d) => d.localId))
    urlsRef.current.forEach((url, key) => { if (!live.has(key.split('|')[0])) { URL.revokeObjectURL(url); urlsRef.current.delete(key) } })
  }, [pending])

  const pendingView = useMemo(() => pending.map((d) => ({
    ...d,
    attachments: d.files.map((f, i) => {
      const image = categoryOf(f.name) === 'image'
      const key = `${d.localId}|${i}`
      if (image && !urlsRef.current.has(key)) urlsRef.current.set(key, URL.createObjectURL(f))
      return { id: `${d.localId}-${i}`, name: f.name, extension: extOf(f.name), category: categoryOf(f.name), size: f.size, url: image ? urlsRef.current.get(key) : null, pending: true }
    }),
  })), [pending])

  return { current, messages, pending: pendingView, sending, selectContact, closeConversation, send, retry, discard }
}
