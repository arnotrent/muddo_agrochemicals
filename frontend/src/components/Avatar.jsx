import { useState } from 'react'

const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

/** Profile picture that can never show a broken-image icon: if the file fails to load it shows initials instead. */
export default function Avatar({ src, name, className = 'w-12 h-12', textClass = 'text-base', alt }) {
  const [failed, setFailed] = useState(false)
  const show = src && !failed
  return (
    <div className={`${className} rounded-full bg-accent-blue text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0 ${textClass}`}>
      {show ? <img src={src} alt={alt ?? `Photo of ${name}`} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" /> : <span aria-hidden="true">{initials(name)}</span>}
    </div>
  )
}
