import { useEffect, useRef, useState } from 'react'
import { EMOJI_GROUPS } from './emojiData'

const KEY = 'muddo-recent-emoji'
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]').slice(0, 16) } catch { return [] } }

/** Popover emoji picker: category tabs + recently used. Closes on Escape / outside click. */
export default function EmojiPicker({ onPick, onClose }) {
  const [recent, setRecent] = useState(loadRecent)
  const [tab, setTab] = useState(recent.length ? 'recent' : EMOJI_GROUPS[0].id)
  const ref = useRef(null)

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('[data-emoji-toggle]')) onClose() }
    const key = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', away); document.addEventListener('touchstart', away); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('touchstart', away); document.removeEventListener('keydown', key) }
  }, [onClose])

  const pick = (emoji) => {
    onPick(emoji)
    const next = [emoji, ...recent.filter((x) => x !== emoji)].slice(0, 16)
    setRecent(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }
  const items = tab === 'recent' ? recent : EMOJI_GROUPS.find((g) => g.id === tab)?.items || []

  return (
    <div ref={ref} role="dialog" aria-label="Emoji picker"
      className="absolute bottom-full left-3 mb-2 w-[min(320px,calc(100%-1.5rem))] bg-bg-card border border-border rounded-2xl shadow-xl z-30 overflow-hidden animate-viewerIn">
      <div className="flex border-b border-border overflow-x-auto" role="tablist">
        {recent.length > 0 && <button role="tab" aria-selected={tab === 'recent'} aria-label="Recently used" onClick={() => setTab('recent')} className={`px-3 py-2 text-lg flex-shrink-0 ${tab === 'recent' ? 'bg-bg-alt' : ''}`}>🕘</button>}
        {EMOJI_GROUPS.map((g) => (
          <button key={g.id} role="tab" aria-selected={tab === g.id} aria-label={g.label} title={g.label} onClick={() => setTab(g.id)} className={`px-3 py-2 text-lg flex-shrink-0 ${tab === g.id ? 'bg-bg-alt' : ''}`}>{g.icon}</button>
        ))}
      </div>
      <div className="h-[210px] overflow-y-auto p-2 grid grid-cols-8 gap-0.5 content-start">
        {items.map((e) => (
          <button key={e} type="button" onClick={() => pick(e)} aria-label={`Insert ${e}`} className="h-9 rounded-lg text-xl hover:bg-bg-alt flex items-center justify-center">{e}</button>
        ))}
        {!items.length && <div className="col-span-8 text-center text-sm text-text-3 py-8">Nothing here yet.</div>}
      </div>
      <div className="px-3 py-1.5 border-t border-border text-[0.68rem] text-text-3">Tip: your device's own emoji keyboard works in the box too.</div>
    </div>
  )
}
