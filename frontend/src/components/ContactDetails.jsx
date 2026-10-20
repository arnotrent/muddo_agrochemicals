import { useState } from 'react'
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
      {uniquePhones().map((p) => <a key={p.tel} href={`tel:${p.tel}`} className="hover:text-accent-blue">{p.label}</a>)}
    </span>
  )
}

const gmail = (to, subject = '') => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}${subject ? `&su=${encodeURIComponent(subject)}` : ''}`

/**
 * One e-mail address that ALWAYS works: the main link opens the visitor's mail app (mailto:); because many computers have
 * no mail app set up (the link then seems to "do nothing"), a Gmail button opens a ready-to-send message in the browser
 * and a copy button puts the address on the clipboard.
 */
export function EmailLink({ email, subject, className = '', compact = false }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { window.prompt('Copy this e-mail address:', email) } }
  const href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
  return (
    <span className={`inline-flex items-center flex-wrap gap-x-2 gap-y-1 ${className}`}>
      <a href={href} className="hover:text-accent-blue break-all">{email}</a>
      {!compact && (
        <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold">
          <a href={gmail(email, subject)} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-bg-alt text-text-2 hover:text-accent-blue" title="Write it in Gmail (opens in your browser)">Gmail</a>
          <button type="button" onClick={copy} className="px-1.5 py-0.5 rounded bg-bg-alt text-text-2 hover:text-accent-blue" title="Copy the address">{copied ? 'Copied ✓' : 'Copy'}</button>
        </span>
      )}
    </span>
  )
}

/** Every company e-mail address, once each, each with working fallbacks. */
export function EmailLinks({ className = '', inline = false, subject, compact = false }) {
  return (
    <span className={`${inline ? 'inline-flex flex-wrap gap-x-4 gap-y-1' : 'flex flex-col gap-1'} ${className}`}>
      {uniqueEmails().map((e) => <EmailLink key={e} email={e} subject={subject} compact={compact} />)}
    </span>
  )
}

export { Icon }
