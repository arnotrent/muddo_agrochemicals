export function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={i <= Math.round(value) ? 'text-accent-blue' : 'text-border'}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
        </svg>
      ))}
    </span>
  )
}

export function StarPicker({ value, onChange }) {
  return (
    <div className="inline-flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => onChange(i)}
          className="p-0.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue">
          <svg width="30" height="30" viewBox="0 0 24 24" className={i <= value ? 'text-accent-blue' : 'text-border hover:text-accent-blue/50'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
          </svg>
        </button>
      ))}
    </div>
  )
}
