import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { notificationsApi } from '../api/services'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)
const SOUND_KEY = 'muddo-notif-sound'
const BASE_TITLE = typeof document !== 'undefined' ? document.title : 'Muddo Agro Chemicals LTD'
const EMPTY = { messages: 0, enquiries: 0, supply: 0, reviews: 0, testimonials: 0 }

function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    const o = ac.createOscillator(); const g = ac.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(880, ac.currentTime); o.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.12)
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.32)
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.34)
    setTimeout(() => ac.close(), 600)
  } catch { /* autoplay policies — ignore */ }
}

/**
 * Near-instant notifications by short polling (no WebSockets by design).
 * Polls every 4s while the tab is visible, every 20s while hidden, immediately when the tab regains focus.
 * New items → toast (+ optional sound) and, when the tab is hidden, a desktop notification.
 * Unread/pending counts feed the sidebar badges and the tab title "(3) …".
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [counts, setCounts] = useState(EMPTY)
  const [toasts, setToasts] = useState([])
  const [recent, setRecent] = useState([])
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const cursors = useRef(null)
  const active = useRef(null) // currently open chat {id, role}
  const soundRef = useRef(sound)
  const failures = useRef(0)
  soundRef.current = sound

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.toastId !== id)), [])
  const setActiveChat = useCallback((c) => { active.current = c }, [])
  const toggleSound = useCallback(() => setSound((s) => { localStorage.setItem(SOUND_KEY, s ? 'off' : 'on'); return !s }), [])
  const askPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    setPerm(await Notification.requestPermission())
  }, [])

  useEffect(() => {
    if (!user) return undefined
    let stop = false, timer
    cursors.current = null

    const tick = async () => {
      try {
        const c = cursors.current
        const params = c ? { after_msg: c.msg, after_enq: c.enq, after_sup: c.sup, after_rev: c.rev, after_tes: c.tes } : {}
        const { data } = await notificationsApi.summary(params)
        failures.current = 0
        cursors.current = { ...(c || {}), ...data.cursors }
        setCounts({ ...EMPTY, ...data.counts })

        const fresh = (data.events || []).filter((e) => {
          if (e.type !== 'message') return true
          const a = active.current
          const open = a && !document.hidden && ((e.broadcast && a.role === 'broadcast') || (!e.broadcast && a.role === e.sender_role && a.id === e.sender_id))
          return !open // don't toast for the conversation you're looking at
        })
        if (c && fresh.length) {
          const stamped = fresh.map((e) => ({ ...e, toastId: `${e.id}-${Date.now()}` }))
          setToasts((t) => [...t, ...stamped].slice(-4))
          setRecent((r) => [...stamped.map((e) => ({ ...e, at: Date.now() })), ...r].slice(0, 15))
          if (soundRef.current) beep()
          if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const e = stamped[stamped.length - 1]
            try { const n = new Notification(e.title, { body: e.body, icon: '/logo_icon.png', tag: e.id }); n.onclick = () => { window.focus(); window.location.assign(e.link) } } catch { /* ignore */ }
          }
          stamped.forEach((e) => setTimeout(() => dismiss(e.toastId), 8000))
        }
      } catch { failures.current = Math.min(failures.current + 1, 5) }
      if (!stop) timer = setTimeout(tick, document.hidden ? 20000 : 4000 * (1 + failures.current))
    }
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick() } }
    document.addEventListener('visibilitychange', onVis)
    tick()
    return () => { stop = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [user, dismiss])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  useEffect(() => { document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE; return () => { document.title = BASE_TITLE } }, [total])

  const value = useMemo(() => ({ counts, total, toasts, recent, sound, perm, dismiss, setActiveChat, toggleSound, askPermission }),
    [counts, total, toasts, recent, sound, perm, dismiss, setActiveChat, toggleSound, askPermission])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  return useContext(Ctx) || { counts: EMPTY, total: 0, toasts: [], recent: [], sound: false, perm: 'unsupported', dismiss() {}, setActiveChat() {}, toggleSound() {}, askPermission() {} }
}
