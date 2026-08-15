/** @type {import('tailwindcss').Config} */

// Tailwind's default scale only defines .5/1.5/2.5/3.5 as fractional
// steps — every other half-value (4.5, 6.5, 8.5, 11.5, 27.5, etc.) used
// throughout this codebase would otherwise silently generate NO CSS at
// all (not an error, just a no-op class), which is what caused the
// collapsed/misaligned spacing seen after the first deploy. Generating
// the FULL half-integer scale here — using Tailwind's own 0.25rem-per-
// unit convention — fixes every one of those classes at once, instead
// of hunting down and hand-editing each occurrence across ~40 files.
function halfStepSpacing(maxUnits) {
  const scale = {}
  for (let i = 0; i <= maxUnits * 2; i++) {
    const key = (i / 2).toString()
    scale[key] = `${(i / 2) * 0.25}rem`
  }
  return scale
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      spacing: halfStepSpacing(48),
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Surfaces — driven by CSS variables set in index.css, so a
        // single `dark` class on <html> flips every one of these,
        // exactly like the original theme_vars.css [data-theme="dark"].
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-alt': 'var(--bg-alt)',
        'bg-input': 'var(--bg-input)',
        border: 'var(--border)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'text-4': 'var(--text-4)',
        // Accents — identical in both themes, per the original spec:
        // blue/red/green ONLY, no orange/brown/dark-green anywhere.
        'accent-blue': '#38BDF8',
        'accent-blue-hover': '#0EA5E9',
        'accent-blue-press': '#0284C7',
        'accent-red': '#EF4444',
        'accent-red-hover': '#DC2626',
        'accent-green': '#4ADE80',
        'accent-green-hover': '#22C55E',
        'bg-deep': 'var(--bg-deep)',
      },
      borderRadius: {
        btn: '10px',
        input: '10px',
        card: '16px',
      },
      boxShadow: {
        'glow-blue': '0 0 0 1px rgba(56,189,248,.35), 0 4px 16px rgba(56,189,248,.35)',
        'glow-red': '0 0 0 1px rgba(239,68,68,.35), 0 4px 16px rgba(239,68,68,.35)',
        'glow-green': '0 0 0 1px rgba(74,222,128,.35), 0 4px 16px rgba(74,222,128,.35)',
      },
      keyframes: {
        pageIn: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        revealUp: { from: { opacity: 0, transform: 'translateY(22px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        dotPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(74,222,128,.5)' },
          '70%': { boxShadow: '0 0 0 8px rgba(74,222,128,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(74,222,128,0)' },
        },
      },
      animation: {
        pageIn: 'pageIn 320ms cubic-bezier(.22,1,.36,1) both',
        revealUp: 'revealUp 600ms cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.4s infinite linear',
        dotPulse: 'dotPulse 2s infinite',
      },
    },
  },
  plugins: [],
}

