let tunda = null

const mandiri = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const iOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const diLogin = () => {
  const layar = document.getElementById('layar')
  if (!layar || layar.classList.contains('hidden')) return false
  if (!document.getElementById('login-username')) return false
  if (layar.classList.contains('login-sukses')) return false
  return !layar.querySelector('.login-kirim-ok, .login-sambut')
}
const bisaTampil = () => diLogin() && !mandiri() && (tunda !== null || iOS())

const KUNCI_KECIL = 'pwa-tombol-kecil'
function bacaKecil() {
  try { return localStorage.getItem(KUNCI_KECIL) === '1' } catch (e) { return false }
}

function tombolLayang() {
  let el = document.getElementById('pwa-pasang')
  if (el) return el
  el = document.createElement('div')
  el.id = 'pwa-pasang'
  el.hidden = true
  if (bacaKecil()) el.classList.add('pwa-kecil')
  el.innerHTML = '<button type="button" data-pwa-install class="pwa-tombol">'
    + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
    + '<span class="pwa-label">Install Aplikasi</span></button>'
    + '<button type="button" data-pwa-tutup class="pwa-tutup" aria-label="Kecilkan tombol install">&times;</button>'
  document.body.appendChild(el)
  return el
}

function segarkan() {
  const buatan = document.querySelectorAll('[data-pwa-install]:not(.pwa-tombol)')
  const tampil = bisaTampil()
  buatan.forEach((b) => { b.hidden = !tampil })
  const layang = document.getElementById('pwa-pasang')
  if (buatan.length) { if (layang) layang.hidden = true; return }
  if (tampil) tombolLayang().hidden = false
  else if (layang) layang.hidden = true
}

const UA = navigator.userAgent
const dalamAplikasi = () => /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Telegram|WhatsApp|TikTok|Twitter|GSA\/|FxiOS|; wv\)/i.test(UA)
const iPad = () => /ipad/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const chromeIOS = () => /CriOS|EdgiOS/i.test(UA)

const IK = {
  bagikan: 'M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1',
  mundur: 'M15 5l-7 7 7 7',
  maju: 'M9 5l7 7-7 7',
  buku: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13',
  tab: 'M3 3h12v12H3zM9 9h12v12H9z',
  tambah: 'M4 4h16v16H4zM12 8v8M8 12h8',
  titik: 'M5 12h.01M12 12h.01M19 12h.01',
}
const svg = (d, ukuran = 22) => `<svg viewBox="0 0 24 24" width="${ukuran}" height="${ukuran}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`

function bilahTiruan(tablet) {
  const ikon = (d, sorot) => `<span class="pwa-ik${sorot ? ' pwa-sorot' : ''}">${svg(d)}${sorot ? `<i class="pwa-panah ${tablet ? 'pwa-panah-bawah' : 'pwa-panah-atas'}" aria-hidden="true">${tablet ? '&#9650;' : '&#9660;'}</i>` : ''}</span>`
  return `<div class="pwa-bilah ${tablet ? 'pwa-bilah-atas' : ''}" aria-hidden="true">
    ${ikon(IK.mundur)}${ikon(IK.maju)}${ikon(IK.bagikan, true)}${ikon(IK.buku)}${ikon(IK.tab)}</div>`
}

const kerangkaDialog = (isi) => {
  const d = document.createElement('dialog')
  d.className = 'dlg rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm shadow-2xl'
  d.innerHTML = `<div class="p-6">${isi}</div>`
  document.body.appendChild(d)
  d.addEventListener('close', () => d.remove(), { once: true })
  return d
}

const TOMBOL_TUTUP = '<button type="button" data-tutup class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Mengerti</button>'

async function salinTautan(tombol) {
  const url = location.href.split('#')[0]
  try {
    await navigator.clipboard.writeText(url)
  } catch (e) {
    const t = document.createElement('textarea')
    t.value = url
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    try { document.execCommand('copy') } catch (err) {  }
    t.remove()
  }
  tombol.textContent = 'Tautan disalin. Tempel di Safari'
}

function panduanBukaSafari() {
  const d = kerangkaDialog(`<h2 class="text-xl font-bold tracking-tight text-slate-900">Buka lewat Safari</h2>
    <p class="mt-2 text-sm leading-relaxed text-slate-600">Browser ini tidak bisa memasang aplikasi. Salin tautan, buka <strong>Safari</strong>, tempel di kolom alamat, lalu pasang dari sana.</p>
    <button type="button" data-salin class="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Salin tautan</button>
    <div class="dlg-aksi mt-6 flex flex-wrap justify-end gap-3">${TOMBOL_TUTUP}</div>`)
  d.addEventListener('click', (e) => {
    if (e.target.closest('[data-tutup]')) d.close()
    const s = e.target.closest('[data-salin]')
    if (s) salinTautan(s)
  })
  d.showModal()
}

function panduanIOS() {
  if (dalamAplikasi()) return panduanBukaSafari()
  const tablet = iPad()
  let langkah
  if (chromeIOS()) {
    langkah = `<li>Ketuk menu <strong>${svg(IK.titik, 16)}</strong> atau ikon <strong>Bagikan</strong> di browser.</li>
      <li>Pilih <strong>Bagikan</strong>, lalu <strong>Tambah ke Layar Utama</strong> ${svg(IK.tambah, 16)}.</li>
      <li>Ketuk <strong>Tambah</strong>.</li>`
  } else {
    langkah = `<li>Ketuk tombol <strong>Bagikan</strong> ${svg(IK.bagikan, 16)} ${tablet ? 'di pojok kanan atas' : 'di bagian bawah layar'}.</li>
      <li>Gulir, lalu pilih <strong>Tambah ke Layar Utama</strong> ${svg(IK.tambah, 16)}.</li>
      <li>Ketuk <strong>Tambah</strong>.</li>`
  }
  const d = kerangkaDialog(`<h2 class="text-xl font-bold tracking-tight text-slate-900">Install di ${tablet ? 'iPad' : 'iPhone'}</h2>
    <p class="mt-2 text-sm text-slate-600">Ikuti tiga langkah ini. Aplikasi akan muncul di layar utama.</p>
    ${chromeIOS() ? '' : bilahTiruan(tablet)}
    <ol class="mt-4 grid gap-2.5 pl-5 text-sm text-slate-700" style="list-style:decimal">${langkah}</ol>
    <div class="dlg-aksi mt-6 flex flex-wrap justify-end gap-3">${TOMBOL_TUTUP}</div>`)
  d.addEventListener('click', (e) => { if (e.target.closest('[data-tutup]')) d.close() })
  d.showModal()
}

function panduanOtomatis() {
  if (!iOS() || mandiri()) return
  const kunci = 'pwa-panduan-dilihat'
  try { if (localStorage.getItem(kunci)) return } catch (e) {  }
  let menunggu = 0
  const cek = setInterval(() => {
    const app = document.getElementById('aplikasi')
    if (++menunggu > 600) { clearInterval(cek); return }
    if (!app || app.classList.contains('hidden')) return
    clearInterval(cek)
    try { localStorage.setItem(kunci, '1') } catch (e) {  }
    setTimeout(() => { if (!document.querySelector('dialog[open]')) panduanIOS() }, 1200)
  }, 1000)
}

async function pasang() {
  if (tunda) {
    const t = tunda
    tunda = null
    segarkan()
    t.prompt()
    try { await t.userChoice } catch (e) {  }
  } else if (iOS()) {
    panduanIOS()
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  tunda = e
  segarkan()
})
window.addEventListener('appinstalled', () => { tunda = null; segarkan() })

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-pwa-install]')) pasang()
  else if (e.target.closest('[data-pwa-tutup]')) {
    try { localStorage.setItem(KUNCI_KECIL, '1') } catch (err) {  }
    const l = document.getElementById('pwa-pasang')
    if (l) l.classList.add('pwa-kecil')
  }
})

window.matchMedia('(display-mode: standalone)').addEventListener('change', segarkan)

function pantauLogin() {
  const opsi = { childList: true, attributes: true, attributeFilter: ['class'] }
  const pengamat = new MutationObserver(segarkan)
  const layar = document.getElementById('layar')
  const app = document.getElementById('aplikasi')
  if (layar) pengamat.observe(layar, { ...opsi, subtree: true })
  if (app) pengamat.observe(app, { attributes: true, attributeFilter: ['class'] })
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {  })
  })
}

pantauLogin()
segarkan()
panduanOtomatis()
