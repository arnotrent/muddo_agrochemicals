import { useCallback, useEffect, useRef, useState } from 'react'
import { messagingApi } from '../api/services'

/**
 * Polling-based chat (deliberately NOT WebSockets, per the original
 * project's "keep what works" instruction). Mirrors static/js/chat.js:
 * 3s poll while a conversation is open, single-flight send guard.
 */
export function useChat() {
  const [current, setCurrent] = useState(null) // { id, role, name }
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const lastIdRef = useRef(0)
  const pollRef = useRef(null)

  const loadMessages = useCallback(async (target, scroll = false) => {
    if (!target) return
    const params = target.role === 'broadcast'
      ? { with_role: 'broadcast', after: lastIdRef.current }
      : { with_id: target.id, with_role: target.role, after: lastIdRef.current }
    const { data } = await messagingApi.list(params)
    if (data.messages?.length) {
      setMessages((prev) => {
        const merged = [...prev, ...data.messages.filter((m) => m.id > lastIdRef.current)]
        return merged
      })
      lastIdRef.current = Math.max(lastIdRef.current, ...data.messages.map((m) => m.id))
    }
    messagingApi.markRead(
      target.role === 'broadcast' ? { from_role: 'broadcast' } : { from_id: target.id, from_role: target.role }
    ).catch(() => {})
  }, [])

  const selectContact = useCallback((target) => {
    setCurrent(target)
    setMessages([])
    lastIdRef.current = 0
    clearInterval(pollRef.current)
    loadMessages(target, true)
    pollRef.current = setInterval(() => loadMessages(target, false), 3000)
  }, [loadMessages])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const send = useCallback(async ({ content, attachment, replyTo }) => {
    if (sending || !current) return
    if (!content && !attachment) return
    setSending(true)
    try {
      let payload
      if (attachment) {
        payload = new FormData()
        payload.append('content', content || '')
        if (current.role === 'broadcast') payload.append('broadcast', 'true')
        else { payload.append('to_id', current.id); payload.append('to_role', current.role) }
        if (replyTo) payload.append('reply_to', replyTo)
        payload.append('attachment', attachment)
      } else {
        payload = current.role === 'broadcast'
          ? { broadcast: true, content, reply_to: replyTo }
          : { to_id: current.id, to_role: current.role, content, reply_to: replyTo }
      }
      const { data } = await messagingApi.send(payload)
      setMessages((prev) => [...prev, data.message])
      lastIdRef.current = Math.max(lastIdRef.current, data.message.id)
    } finally {
      setSending(false)
    }
  }, [current, sending])

  return { current, messages, sending, selectContact, send }
}
