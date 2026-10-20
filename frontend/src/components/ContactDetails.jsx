import site from '../data/siteConfig'

/** Every phone number as its own tap-to-call link. */
export function PhoneLinks({ className = '', inline = false }) {
  return (
    <span className={`${inline ? 'inline-flex flex-wrap gap-x-3' : 'flex flex-col'} ${className}`}>
      {site.phones.map((p) => <a key={p.tel} href={`tel:${p.tel}`} className="hover:text-accent-blue">{p.label}</a>)}
    </span>
  )
}

/** Every email address as its own mailto link. */
export function EmailLinks({ className = '', inline = false }) {
  return (
    <span className={`${inline ? 'inline-flex flex-wrap gap-x-3' : 'flex flex-col'} ${className}`}>
      {site.emails.map((e) => <a key={e} href={`mailto:${e}`} className="hover:text-accent-blue break-all">{e}</a>)}
    </span>
  )
}
