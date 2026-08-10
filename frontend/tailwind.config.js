/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
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
    },
  },
  plugins: [],
}
