import { useInView } from '../hooks/useInView'

// Ratings are GOLD (the colour people expect), empty stars stay neutral grey.
const GOLD = '#F5B301'
const POLY = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'
export const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

/** `animate` makes the stars pop in one after another the moment they scroll into view. */
export function Stars({ value = 0, size = 16, animate = false }) {
  const [ref, seen] = useInView()
  return (
    <span ref={ref} className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(value)
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
            className={animate ? (seen ? 'animate-starPop' : 'opacity-0') : ''}
            style={animate && seen ? { animationDelay: `${i * 90}ms` } : undefined}>
            <polygon points={POLY} fill={on ? GOLD : 'none'} stroke={on ? GOLD : 'currentColor'} strokeWidth="1.2" className={on ? '' : 'text-border'} />
          </svg>
        )
      })}
    </span>
  )
}

export function StarPicker({ value, onChange, size = 32 }) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''} — ${LABELS[i]}`} title={LABELS[i]} onClick={() => onChange(i)}
          className="p-0.5 rounded transition-transform duration-200 hover:scale-125 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <polygon points={POLY} fill={i <= value ? GOLD : 'none'} stroke={i <= value ? GOLD : 'currentColor'} strokeWidth="1.4" className={`transition-all duration-200 ${i <= value ? '' : 'text-border'}`} />
          </svg>
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm font-bold animate-viewerIn" style={{ color: GOLD }}>{LABELS[value]}</span>}
    </div>
  )
}
