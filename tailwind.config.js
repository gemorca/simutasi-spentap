module.exports = {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        acc: { DEFAULT: '#2563eb', h: '#1d4ed8', light: '#eff6ff' },
        side: '#0f172a',
        'side-ink': '#94a3b8',
        garis: '#e2e8f0',
        lat: '#f8fafc',
        ink: '#0f172a',
        redup: '#64748b',
        bad: '#ef4444',
      },
    },
  },
}
