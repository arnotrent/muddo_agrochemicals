/** @type {import('tailwindcss').Config} */

// Tailwind's default scale only defines .5/1.5/2.5/3.5 as fractional steps — every other half-value
// (4.5, 6.5, 8.5, 11.5, 27.5, …) used across this codebase would otherwise silently generate NO CSS.
// Generating the full half-integer scale here fixes every one of those classes at once.
function halfStepSpacing(maxUnits) {
  const scale = {}
  for (let i = 0; i <= maxUnits * 2; i++) {
    const key = (i / 2).toString()
    scale[key] = `${(i / 2) * 0.25}rem`
  }
  return scale
}

// Same class of bug as the half-step spacing: Tailwind's default opacity scale only has 0,5,10,20,25,30,40,50,
// 60,70,75,80,90,95,100, so classes such as text-white/88, bg-accent-green/15, border-accent-blue/35, bg-black/55
// silently produced NO CSS (black text on dark heroes, status badges with no background). Every integer % works now.
const opacityScale = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)]))

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      spacing: halfStepSpacing(48),
      opacity: opacityScale,
      fontFamily: { sans: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-alt': 'var(--bg-alt)',
        'bg-input': 'var(--bg-input)',
        border: 'var(--border)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'text-4': 'var(--text-4)',
        'accent-blue': '#38BDF8',
        'accent-blue-hover': '#0EA5E9',
        'accent-blue-press': '#0284C7',
        'accent-red': '#EF4444',
        'accent-red-hover': '#DC2626',
        'accent-green': '#4ADE80',
        'accent-green-hover': '#22C55E',
        'bg-deep': 'var(--bg-deep)',
      },
      borderRadius: { btn: '10px', input: '10px', card: '16px' },
      boxShadow: {
        'glow-blue': '0 0 0 1px rgba(56,189,248,.35), 0 4px 16px rgba(56,189,248,.35)',
        'glow-red': '0 0 0 1px rgba(239,68,68,.35), 0 4px 16px rgba(239,68,68,.35)',
        'glow-green': '0 0 0 1px rgba(74,222,128,.35), 0 4px 16px rgba(74,222,128,.35)',
      },
      keyframes: {
        pageIn: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        revealUp: { from: { opacity: 0, transform: 'translateY(22px)' }, to: { opacity: 1, transform: 'none' } },
        msgIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        viewerIn: { from: { opacity: 0, transform: 'scale(.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        drawerIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        paneIn: { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
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
        msgIn: 'msgIn 250ms ease-out both',
        viewerIn: 'viewerIn 200ms ease-out both',
        drawerIn: 'drawerIn 250ms cubic-bezier(.22,1,.36,1) both',
        paneIn: 'paneIn 220ms cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.4s infinite linear',
        dotPulse: 'dotPulse 2s infinite',
      },
    },
  },
  plugins: [],
}
