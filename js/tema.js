/* Tema tampilan: terang, gelap, atau sistem (mengikuti pengaturan perangkat).
 * Pilihan disimpan di localStorage dan diterapkan sebagai kelas "dark" pada <html>.
 * Skrip kecil di <head> index.html menerapkan tema lebih awal supaya layar tidak berkedip. */

const KUNCI = 'sim-mutasi-tema'
export const DAFTAR_MODE = ['terang', 'gelap', 'sistem']
const WARNA_BAR = { terang: '#0f172a', gelap: '#0b1220' }

const SVG = (isi, kelas) => `<svg class="${kelas}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${isi}</svg>`
const IKON = {
  terang: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  gelap: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sistem: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
}

const $ = (id) => document.getElementById(id)
const mqGelap = window.matchMedia('(prefers-color-scheme: dark)')
let mode = 'sistem'

function bacaTersimpan() {
  try {
    const v = localStorage.getItem(KUNCI)
    return DAFTAR_MODE.includes(v) ? v : 'sistem'
  } catch { return 'sistem' }
}

export function ambilMode() { return mode }
export function sedangGelap() { return mode === 'gelap' || (mode === 'sistem' && mqGelap.matches) }

function terapkan() {
  const gelap = sedangGelap()
  const akar = document.documentElement
  akar.classList.toggle('dark', gelap)
  akar.style.colorScheme = gelap ? 'dark' : 'light'
  akar.dataset.tema = mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', gelap ? WARNA_BAR.gelap : WARNA_BAR.terang)
  window.dispatchEvent(new CustomEvent('tema-berubah', { detail: { mode, gelap } }))
}

/* Animasi pergantian terang/gelap.
 * Utama: View Transitions API, lingkaran melebar dari titik klik.
 * Cadangan (browser lama): kelas "tema-ganti" memberi transisi warna 350 ms. */
let pewaktuGanti = 0
function animasiGanti(ubah, titik) {
  const akar = document.documentElement
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { ubah(); return }

  if (typeof document.startViewTransition === 'function') {
    const x = titik ? titik.x : window.innerWidth
    const y = titik ? titik.y : 0
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const peralihan = document.startViewTransition(ubah)
    peralihan.ready.then(() => {
      akar.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    }).catch(() => { /* peralihan dibatalkan: tema tetap berlaku */ })
    return
  }

  clearTimeout(pewaktuGanti)
  akar.classList.add('tema-ganti')
  ubah()
  pewaktuGanti = setTimeout(() => akar.classList.remove('tema-ganti'), 450)
}

/* titik: { x, y } pusat lingkaran animasi (opsional). */
export function aturMode(baru, titik) {
  if (!DAFTAR_MODE.includes(baru)) return
  const sebelumGelap = sedangGelap()
  mode = baru
  try { localStorage.setItem(KUNCI, baru) } catch { /* penyimpanan diblokir: tema tetap berlaku untuk sesi ini */ }
  // Warna layar sama (mis. Gelap ke Sistem di perangkat gelap): tidak perlu animasi halaman.
  if (sedangGelap() === sebelumGelap) terapkan()
  else animasiGanti(terapkan, titik)
}

/* Panggil sekali, paling awal. */
export function mulaiTema() {
  mode = bacaTersimpan()
  terapkan()
  // Mode "sistem": ikuti perubahan tema perangkat secara langsung.
  mqGelap.addEventListener('change', () => { if (mode === 'sistem') terapkan() })
  // Sinkron antar tab.
  window.addEventListener('storage', (e) => {
    if (e.key !== KUNCI) return
    mode = bacaTersimpan()
    terapkan()
  })
}

/* ---------- Pemilih di header (di samping tombol akun) ----------
 * Tiga tombol berjejer (Terang / Gelap / Sistem). Langsung dipilih, tanpa membuka menu. */
let grup = null
let opsi = []

function titikDari(el) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function sinkronUi() {
  if (!grup) return
  grup.style.setProperty('--i', String(Math.max(0, DAFTAR_MODE.indexOf(mode))))
  opsi.forEach((o) => {
    const aktif = o.dataset.tema === mode
    o.setAttribute('aria-checked', String(aktif))
    o.tabIndex = aktif ? 0 : -1
  })
}

export function pasangPemilihTema() {
  grup = $('tema')
  if (!grup) return
  opsi = [...grup.querySelectorAll('[data-tema]')]
  opsi.forEach((o) => { o.querySelector('[data-ikon]').innerHTML = SVG(IKON[o.dataset.tema], 'h-4 w-4') })

  grup.addEventListener('click', (e) => {
    const o = e.target.closest('[data-tema]')
    if (o) aturMode(o.dataset.tema, titikDari(o))
  })
  // Panah kiri/kanan (radiogroup): pindah sekaligus memilih.
  grup.addEventListener('keydown', (e) => {
    const maju = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    const mundur = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
    if (!maju && !mundur) return
    e.preventDefault()
    const i = opsi.indexOf(document.activeElement)
    const baru = opsi[(i + (maju ? 1 : -1) + opsi.length) % opsi.length]
    aturMode(baru.dataset.tema, titikDari(baru))
    baru.focus()
  })
  window.addEventListener('tema-berubah', sinkronUi)
  sinkronUi()
  // Indikator geser baru boleh beranimasi setelah posisi awal tergambar (hindari geseran saat muat).
  requestAnimationFrame(() => requestAnimationFrame(() => grup.classList.add('siap')))
}
