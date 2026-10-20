// Ratings are GOLD (the colour people expect), empty stars stay neutral grey.
const GOLD = '#F5B301'
const POLY = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'
export const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <polygon points={POLY} fill={i <= Math.round(value) ? GOLD : 'none'} stroke={i <= Math.round(value) ? GOLD : 'currentColor'} strokeWidth="1.2" className={i <= Math.round(value) ? '' : 'text-border'} />
        </svg>
      ))}
    </span>
  )
}

export function StarPicker({ value, onChange, size = 32 }) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''} — ${LABELS[i]}`} title={LABELS[i]} onClick={() => onChange(i)}
          className="p-0.5 rounded transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <polygon points={POLY} fill={i <= value ? GOLD : 'none'} stroke={i <= value ? GOLD : 'currentColor'} strokeWidth="1.4" className={i <= value ? '' : 'text-border'} />
          </svg>
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm font-bold" style={{ color: GOLD }}>{LABELS[value]}</span>}
    </div>
  )
}
