import { useEffect, useRef, useState } from 'react'
import site from '../data/siteConfig'
import Icon from './Icon'

// Each phone number / e-mail address is shown ONCE, however many lists the site config holds (case- and format-insensitive).
export const uniquePhones = () => {
  const seen = new Set()
  return (site.phones || []).filter((p) => { const k = p.tel.replace(/\D/g, '').replace(/^0/, '256'); if (seen.has(k)) return false; seen.add(k); return true })
}
export const uniqueEmails = () => {
  const seen = new Set()
  return (site.emails || []).filter((e) => { const k = e.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

/** Every phone number as its own tap-to-call link. */
export function PhoneLinks({ className = '', inline = false }) {
  return (
    <span className={`${inline ? 'inline-flex flex-wrap gap-x-3' : 'flex flex-col'} ${className}`}>
      {uniquePhones().map((p) => <a key={p.tel} href={`tel:${p.tel}`} className="hover:text-accent-blue transition-colors">{p.label}</a>)}
    </span>
  )
}

/**
 * The e-mail address itself is the link. Clicking it opens the visitor's mail app AND quietly copies the address,
 * so it still works on computers that have no mail app set up (a short "Address copied" note confirms it).
 * (The separate Gmail / Copy buttons were removed — they looked unprofessional.)
 */
export function EmailLink({ email, subject, className = '' }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onClick = async () => {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 2200)
    } catch { /* clipboard blocked — the mailto link still works */ }
  }
  const href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
  return (
    <span className={`inline-flex items-center flex-wrap gap-x-2 gap-y-0.5 ${className}`}>
      <a href={href} onClick={onClick} title="Click to write an e-mail — the address is also copied" className="hover:text-accent-blue break-all underline-offset-2 hover:underline transition-colors">{email}</a>
      {copied && <span role="status" className="text-[0.68rem] font-bold text-accent-green animate-viewerIn">Address copied</span>}
    </span>
  )
}

/** Every company e-mail address, once each. */
export function EmailLinks({ className = '', inline = false, subject }) {
  return (
    <span className={`${inline ? 'inline-flex flex-wrap gap-x-4 gap-y-1' : 'flex flex-col gap-1'} ${className}`}>
      {uniqueEmails().map((e) => <EmailLink key={e} email={e} subject={subject} />)}
    </span>
  )
}

export { Icon }
