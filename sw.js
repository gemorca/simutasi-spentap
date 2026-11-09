// Service worker SIM Mutasi Siswa.
// Naikkan VERSI setiap rilis besar agar cache lama dibuang.
const VERSI = 'sim-mutasi-v2'
const INTI = [
  './',
  'index.html',
  'manifest.webmanifest',
  'config.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'assets/favicon.svg',
]
// Host luar yang aman di-cache (pustaka dan font). API Apps Script TIDAK pernah di-cache.
const HOST_LUAR = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net']
const BATAS_JARINGAN_MS = 4000

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSI)
      .then((c) => Promise.all(INTI.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(nama.filter((n) => n !== VERSI).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

function simpan(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const salinan = res.clone()
    caches.open(VERSI).then((c) => c.put(req, salinan)).catch(() => {})
  }
  return res
}

// File aplikasi sendiri: jaringan dulu (selalu versi terbaru), cache bila offline atau lambat.
function jaringanDulu(req) {
  return new Promise((selesai) => {
    let sudah = false
    const pakaiCache = () => caches.match(req).then((c) => c || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
    const timer = setTimeout(() => {
      pakaiCache().then((c) => { if (c && !sudah) { sudah = true; selesai(c) } })
    }, BATAS_JARINGAN_MS)
    fetch(req).then((res) => {
      clearTimeout(timer)
      if (sudah) { simpan(req, res); return }
      sudah = true
      selesai(simpan(req, res))
    }).catch(() => {
      clearTimeout(timer)
      if (sudah) return
      pakaiCache().then((c) => { sudah = true; selesai(c || Response.error()) })
    })
  })
}

// Pustaka dan font luar: pakai cache, perbarui di belakang.
function cacheDulu(req) {
  return caches.match(req).then((c) => {
    const ambil = fetch(req).then((res) => simpan(req, res)).catch(() => c)
    return c || ambil
  })
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return
    e.respondWith(jaringanDulu(req))
  } else if (HOST_LUAR.includes(url.hostname)) {
    e.respondWith(cacheDulu(req))
  }
  // Selain itu (script.google.com, googleusercontent.com, dll.) langsung ke jaringan.
})
