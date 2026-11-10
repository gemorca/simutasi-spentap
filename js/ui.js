const PETA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function esc(teks) {
  return String(teks ?? '').replace(/[&<>"']/g, (c) => PETA[c])
}

const KONTROL = 'rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900 placeholder:text-slate-400 font-medium'
const TOMBOL = 'btn inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'

export const KELAS = {
  kontrol: KONTROL,
  input: 'w-full ' + KONTROL,
  tombol: TOMBOL + ' border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400',
  utama: TOMBOL + ' border-transparent bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700',
  bahaya: TOMBOL + ' border-transparent bg-rose-600 text-white shadow-rose-500/20 hover:bg-rose-700',
  kecil: '!px-3 !py-1.5 !text-xs !rounded-lg',
}

export const IKON = {
  ubah: 'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.4 2.6a2.1 2.1 0 0 1 3 3L12.4 14.6l-4 1 1-4Z',
  kunci: 'M2.6 17.4A2 2 0 0 0 2 18.8V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.2a2 2 0 0 0 1.4-.6l.8-.8a6.5 6.5 0 1 0-4-4ZM16.5 7.5h.01',
  hapus: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  aktif: 'M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10',
  pilih: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',
  salin: 'M9 9h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2ZM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  centang: 'M20 6 9 17l-5-5',
  tutup: 'M18 6 6 18M6 6l12 12',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v4M12 16h.01',
}

export function spinner(kelas = 'h-4 w-4') {
  return `<svg class="${esc(kelas)} shrink-0" viewBox="0 0 24 24" fill="none" role="img" aria-label="Memproses"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/></path></svg>`
}

const KEADAAN_TOMBOL = new WeakMap()
export function sibukTombol(el, sibuk, teks = 'Memproses...') {
  if (!el || !el.isConnected) return
  const k = KEADAAN_TOMBOL.get(el)
  if (sibuk) {
    if (k) return
    KEADAAN_TOMBOL.set(el, { asli: el.innerHTML, mati: el.disabled })
    const ikonSaja = el.classList.contains('aksi-ikon')
    el.innerHTML = ikonSaja ? spinner('h-[18px] w-[18px]') : spinner() + '<span>' + esc(teks) + '</span>'
    el.disabled = true
    el.setAttribute('aria-busy', 'true')
  } else {
    if (!k) return
    KEADAAN_TOMBOL.delete(el)
    el.innerHTML = k.asli
    el.disabled = k.mati
    el.removeAttribute('aria-busy')
  }
}

export async function denganSibuk(el, kerja, teks) {
  sibukTombol(el, true, teks)
  try { return await kerja() } finally { sibukTombol(el, false) }
}

export function barProgres(wadah, label = 'Menyiapkan...') {
  const el = document.createElement('div')
  el.className = 'progres mt-3'
  el.setAttribute('role', 'progressbar')
  el.setAttribute('aria-label', 'Progres unggah')
  el.setAttribute('aria-valuemin', '0')
  el.setAttribute('aria-valuemax', '100')
  el.innerHTML = `<div class="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600"><span data-label class="min-w-0 truncate"></span><span data-persen class="shrink-0 tabular-nums"></span></div><div class="progres-trek"><div class="progres-isi"></div></div>`
  wadah.appendChild(el)
  const isi = el.querySelector('.progres-isi')
  const tLabel = el.querySelector('[data-label]')
  const tPersen = el.querySelector('[data-persen]')
  let nilai = 0
  let pewaktu = 0
  const henti = () => { clearInterval(pewaktu); pewaktu = 0 }
  const tampil = (teks) => {
    isi.style.setProperty('--p', String(nilai / 100))
    tPersen.textContent = nilai + '%'
    el.setAttribute('aria-valuenow', String(nilai))
    if (teks) { tLabel.textContent = teks; el.setAttribute('aria-valuetext', teks + ', ' + nilai + ' persen') }
  }
  const naik = (p, teks) => { nilai = Math.max(nilai, Math.min(99, Math.round(p))); tampil(teks) }
  tampil(label)
  return {
    naik,
    api(p) {
      if (p.tahap === 'kirim' && p.total > 0) { if (!pewaktu) naik(5 + (p.dimuat / p.total) * 85, 'Mengunggah...') }
      else if (p.tahap === 'server') {
        naik(90, 'Menyimpan di server...')
        if (!pewaktu) pewaktu = setInterval(() => {
          if (!el.isConnected) return henti()
          naik(nilai + (99 - nilai) * 0.1)
        }, 400)
      }
    },
    selesai(teks = 'Selesai') {
      henti(); nilai = 100; el.classList.add('progres-selesai'); tampil(teks)
    },
    galat(teks = 'Gagal') {
      henti(); el.classList.add('progres-galat'); tampil(teks)
    },
    hapus() { henti(); el.remove() },
  }
}

export function ikon(d, kelas = 'h-[18px] w-[18px]') {
  return `<svg class="${esc(kelas)} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${esc(d)}"/></svg>`
}

export function tunda(fn, ms = 400) {
  let t
  return (...arg) => { clearTimeout(t); t = setTimeout(() => fn(...arg), ms) }
}

export function tandaiMemuat(el, aktif) {
  if (!el) return
  el.classList.toggle('opacity-60', aktif)
  el.classList.toggle('pointer-events-none', aktif)
  el.classList.add('transition-opacity')
  if (aktif) el.setAttribute('aria-busy', 'true')
  else el.removeAttribute('aria-busy')
}

export function namaJenisKelamin(v) {
  const k = String(v || '').trim().toUpperCase()
  return k === 'L' ? 'Laki-laki' : k === 'P' ? 'Perempuan' : (k || '-')
}

export function inisial(nama) {
  const k = String(nama || '?').trim().split(/\s+/).filter(Boolean)
  return (k.length > 1 ? k[0][0] + k[1][0] : (k[0] || '?').slice(0, 2)).toUpperCase()
}

export function memuat(teks = 'Memuat data...') {
  const baris = (lebar) => `<div class="skel h-4 ${lebar}"></div>`
  return `<div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" role="status" aria-live="polite"><span class="sr-only">${esc(teks)}</span><div class="skel h-6 w-1/3"></div>${baris('w-full')}${baris('w-11/12')}${baris('w-4/5')}${baris('w-2/3')}</div>`
}

export function judulHalaman({ judul, sub = '', subHtml = '', aksi = '', kelasAksi = '' }) {
  const keterangan = sub ? esc(sub) : subHtml
  return `<div class="judul-halaman mb-6 flex flex-wrap items-center justify-between gap-4">
    <div class="min-w-0">
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">${esc(judul)}</h2>
      ${keterangan ? `<p class="mt-1 text-sm font-medium text-slate-500">${keterangan}</p>` : ''}
    </div>
    ${aksi ? `<div class="judul-aksi flex flex-wrap items-center gap-2.5${kelasAksi ? ' ' + esc(kelasAksi) : ''}">${aksi}</div>` : ''}
  </div>`
}

export function statusKosong({ ikon: d, judul, teks = '', isi = '' }) {
  return `<div role="status" class="kosong-ui grid justify-items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
    ${d ? `<div class="kosong-ikon p-3 rounded-2xl bg-slate-100 text-slate-400 mb-1">${ikon(d, 'h-8 w-8')}</div>` : ''}
    <strong class="text-base font-bold text-slate-800">${esc(judul)}</strong>
    ${teks ? `<p class="text-sm max-w-sm text-slate-500">${esc(teks)}</p>` : ''}
    ${isi}
  </div>`
}

const JENIS_LENCANA = { Draft: 'draft', Diajukan: 'diajukan', Disetujui: 'disetujui', Ditolak: 'ditolak', Aktif: 'disetujui', Nonaktif: 'draft' }
const WARNA_LENCANA = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  diajukan: 'bg-blue-50 text-blue-700 border-blue-200/80',
  disetujui: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  ditolak: 'bg-rose-50 text-rose-700 border-rose-200/80',
}
export function lencana(status, teks) {
  const jenis = JENIS_LENCANA[status] || 'draft'
  return `<span class="inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold border ${WARNA_LENCANA[jenis]}">${esc(teks || status)}</span>`
}

export function banner(p) {
  if (!p || !p.teks || p.jenis) return ''
  return `<div role="status" class="mb-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm font-medium text-blue-900 shadow-sm">${esc(p.teks)}</div>`
}

function buatDialog(isi) {
  const d = document.createElement('dialog')
  d.className = 'dlg w-[min(92vw,28rem)] rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm shadow-2xl'
  d.innerHTML = isi
  document.body.appendChild(d)
  return d
}

const MENUNGGU = new Set()
let dialogTerbuka = 0

function bukaModal(d) {
  return new Promise((selesai) => {
    dialogTerbuka++
    MENUNGGU.forEach((el) => sibukTombol(el, false))
    d.addEventListener('close', () => {
      const v = d.returnValue
      d.remove()
      dialogTerbuka = Math.max(0, dialogTerbuka - 1)
      if (!dialogTerbuka) MENUNGGU.forEach((el) => sibukTombol(el, true))
      selesai(v)
    }, { once: true })
    d.showModal()
  })
}

const tajuk = (judul, pesan) => `<h2 class="text-xl font-bold tracking-tight text-slate-900">${esc(judul)}</h2>${pesan ? `<p class="mt-2 text-sm text-slate-600 leading-relaxed">${esc(pesan)}</p>` : ''}`

export async function dialogKonfirmasi({ judul = 'Konfirmasi', pesan = '', ya = 'Ya, lanjutkan', tidak = 'Batal', bahaya = false } = {}) {
  const d = buatDialog(`<form method="dialog" class="p-6">${tajuk(judul, pesan)}
    <div class="dlg-aksi mt-6 flex justify-end gap-3">
      <button value="tidak" ${bahaya ? 'autofocus' : ''} class="${KELAS.tombol}">${esc(tidak)}</button>
      <button value="ya" ${bahaya ? '' : 'autofocus'} class="${bahaya ? KELAS.bahaya : KELAS.utama}">${esc(ya)}</button>
    </div></form>`)
  return (await bukaModal(d)) === 'ya'
}

export async function dialogTanya({ judul = 'Isi keterangan', pesan = '', label = 'Keterangan', ya = 'Ya, lanjutkan', bahaya = false } = {}) {
  const d = buatDialog(`<form method="dialog" class="p-6" novalidate>${tajuk(judul, pesan)}
    <label class="mt-4 block text-sm font-semibold text-slate-800">${esc(label)}
      <textarea name="isi" rows="3" autofocus class="${KELAS.input} mt-1 font-normal"></textarea></label>
    <p data-galat hidden class="mt-1.5 text-xs font-semibold text-rose-600">Keterangan wajib diisi</p>
    <div class="dlg-aksi mt-6 flex justify-end gap-3">
      <button value="tidak" formnovalidate class="${KELAS.tombol}">Batal</button>
      <button value="ya" class="${bahaya ? KELAS.bahaya : KELAS.utama}">${esc(ya)}</button>
    </div></form>`)
  const area = d.querySelector('textarea')
  const galat = d.querySelector('[data-galat]')
  let hasil = null
  d.querySelector('form').addEventListener('submit', (e) => {
    if (!e.submitter || e.submitter.value !== 'ya') return
    if (!area.value.trim()) { e.preventDefault(); galat.hidden = false; area.focus(); return }
    hasil = area.value
  })
  await bukaModal(d)
  return hasil
}

export function dialogInfo({ jenis = 'galat', judul, teks, tombol = 'Tutup' }) {
  const garis = { galat: 'border-t-rose-600', peringatan: 'border-t-amber-500', sukses: 'border-t-emerald-600' }[jenis] || 'border-t-blue-600'
  const d = buatDialog(`<form method="dialog" class="border-t-4 p-6 ${garis}">${tajuk(judul, teks)}
    <div class="dlg-aksi mt-6 flex justify-end"><button value="ok" autofocus class="${KELAS.utama}">${esc(tombol)}</button></div></form>`)
  return bukaModal(d)
}

async function salinTeks(teks) {
  try {
    await navigator.clipboard.writeText(teks)
    return true
  } catch {
    const t = document.createElement('textarea')
    t.value = teks
    t.setAttribute('readonly', '')
    t.style.cssText = 'position:fixed;top:-100px;opacity:0'
    document.body.appendChild(t)
    t.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    t.remove()
    return ok
  }
}

export function dialogPasswordBaru({ username, password, judul = 'Password Baru Berhasil Dibuat' }) {
  const d = buatDialog(`<form method="dialog" class="border-t-4 border-t-emerald-600 p-6">
    <h2 class="text-xl font-bold tracking-tight text-slate-900">${esc(judul)}</h2>
    <p class="mt-2 text-sm leading-relaxed text-slate-600">Password baru untuk <strong class="text-slate-900">${esc(username)}</strong>:</p>
    <div class="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-4">
      <strong data-sandi class="min-w-0 flex-1 select-all break-all font-mono text-lg font-extrabold tracking-wide text-slate-900">${esc(password)}</strong>
      <button type="button" data-salin class="${KELAS.tombol} ${KELAS.kecil}">${ikon(IKON.salin, 'h-4 w-4')}<span>Salin</span></button>
    </div>
    <p role="status" data-info-salin class="mt-2 min-h-[1rem] text-xs font-semibold text-emerald-700"></p>
    <p class="mt-1 text-xs font-semibold text-amber-700">Catat sekarang, password tidak akan ditampilkan lagi.</p>
    <div class="dlg-aksi mt-6 flex justify-end"><button value="ok" autofocus class="${KELAS.utama}">Sudah saya catat</button></div></form>`)
  const tombol = d.querySelector('[data-salin]')
  const info = d.querySelector('[data-info-salin]')
  let timer
  tombol.addEventListener('click', async () => {
    const ok = await salinTeks(password)
    tombol.innerHTML = ok ? ikon(IKON.centang, 'h-4 w-4') + '<span>Tersalin</span>' : ikon(IKON.salin, 'h-4 w-4') + '<span>Salin</span>'
    info.className = 'mt-2 min-h-[1rem] text-xs font-semibold ' + (ok ? 'text-emerald-700' : 'text-rose-600')
    info.textContent = ok ? 'Password disalin ke papan klip.' : 'Gagal menyalin. Blok password lalu salin manual.'
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (!d.isConnected) return
      tombol.innerHTML = ikon(IKON.salin, 'h-4 w-4') + '<span>Salin</span>'
      info.textContent = ''
    }, 2500)
  })
  return bukaModal(d)
}

function tutupToast(t) {
  if (t.dataset.menutup) return
  t.dataset.menutup = '1'
  t.classList.add('toast-keluar')
  setTimeout(() => t.remove(), 180)
}

export function toast(teks, jenis = 'sukses') {
  let wadah = document.getElementById('toast-wadah')
  if (!wadah) {
    wadah = document.createElement('div')
    wadah.id = 'toast-wadah'
    wadah.setAttribute('role', 'status')
    wadah.setAttribute('aria-live', 'polite')
    wadah.className = 'fixed right-4 top-4 z-[60] flex w-[min(92vw,24rem)] flex-col gap-2.5'
    document.body.appendChild(wadah)
  }
  const galat = jenis === 'galat'
  const t = document.createElement('div')
  t.className = 'toast-item flex items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-sm shadow-xl '
    + (galat ? 'border-l-rose-600' : 'border-l-emerald-600')
  t.innerHTML = `<span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${galat ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}">${ikon(galat ? IKON.info : IKON.centang, 'h-4 w-4')}</span>
    <div class="min-w-0 flex-1"><strong class="block font-bold text-slate-900">${galat ? 'Perhatian' : 'Berhasil'}</strong><span data-teks class="block break-words font-medium text-slate-600"></span></div>
    <button type="button" aria-label="Tutup" class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${ikon(IKON.tutup, 'h-4 w-4')}</button>`
  t.querySelector('[data-teks]').textContent = teks
  let timer
  const mulai = () => { timer = setTimeout(() => tutupToast(t), 4500) }
  t.querySelector('button').addEventListener('click', () => { clearTimeout(timer); tutupToast(t) })
  t.addEventListener('mouseenter', () => clearTimeout(timer))
  t.addEventListener('mouseleave', mulai)
  wadah.appendChild(t)
  mulai()
}

const BATAS_TOAST = 80

export const notif = {
  galat: (teks, judul) => dialogInfo({ jenis: 'galat', judul: judul || 'Gagal', teks }),
  peringatan: (teks, judul) => dialogInfo({ jenis: 'peringatan', judul: judul || 'Perhatian', teks }),
  sukses(teks, { tetap = false, judul, tombol } = {}) {
    if (tetap || String(teks).length > BATAS_TOAST) {
      return dialogInfo({ jenis: 'sukses', judul: judul || 'Berhasil', teks, tombol: tombol || 'OK' })
    }
    toast(teks)
    return Promise.resolve()
  },
  kolomGalat(teks = 'Periksa kolom yang ditandai.') { toast(teks, 'galat') },
}

export function tampilPesan(p) {
  if (!p || !p.teks) return Promise.resolve()
  if (p.jenis === 'galat') return notif.galat(p.teks, p.judul)
  if (p.jenis === 'peringatan') return notif.peringatan(p.teks, p.judul)
  if (p.jenis === 'sukses') return notif.sukses(p.teks, p)
  return Promise.resolve()
}

export function medan({ label, nama, nilai = '', galat = '', catatan = '', wajib = false, penuh = false,
  tipe = 'text', placeholder = '', pilihan = null, baris = 3, nonaktif = false, atribut = {} }) {
  const id = 'medan-' + nama
  const idPesan = id + '-pesan'
  const extra = Object.entries(atribut).map(([k, v]) => `${esc(k)}="${esc(v)}"`).join(' ')
  const dasar = `id="${esc(id)}" name="${esc(nama)}" aria-describedby="${esc(idPesan)}"`
    + `${galat ? ' aria-invalid="true"' : ''}${wajib ? ' aria-required="true"' : ''}${nonaktif ? ' disabled' : ''} ${extra}`
  const kelas = KELAS.input + (galat ? ' !border-rose-500 !ring-rose-500/20' : '')
  let kontrol
  if (pilihan) {
    const opsi = pilihan.map((p) =>
      `<option value="${esc(p.nilai)}"${String(p.nilai) === String(nilai) ? ' selected' : ''}${p.nonaktif ? ' disabled' : ''}>${esc(p.label)}</option>`).join('')
    kontrol = `<select ${dasar} class="${kelas}">${placeholder ? `<option value="" disabled${String(nilai) === '' ? ' selected' : ''}>${esc(placeholder)}</option>` : ''}${opsi}</select>`
  } else if (tipe === 'textarea') {
    kontrol = `<textarea ${dasar} rows="${Number(baris) || 3}" placeholder="${esc(placeholder)}" class="${kelas}">${esc(nilai)}</textarea>`
  } else {
    kontrol = `<input ${dasar} type="${esc(tipe)}" value="${esc(nilai)}" placeholder="${esc(placeholder)}" class="${kelas}">`
  }
  return `<div data-medan="${esc(nama)}" class="grid content-start gap-1.5${penuh ? ' sm:col-span-2' : ''}">
    <label for="${esc(id)}" class="text-sm font-semibold text-slate-800">${esc(label)}${wajib ? ' <span class="text-rose-500" aria-hidden="true">*</span>' : ''}</label>
    ${kontrol}
    <p id="${esc(idPesan)}" data-galat class="text-xs font-semibold text-rose-600"${galat ? '' : ' hidden'}>${esc(galat)}</p>
    ${catatan ? `<p class="text-xs text-slate-500">${esc(catatan)}</p>` : ''}</div>`
}

export function tandaiGalat(wadah, galat = {}) {
  let pertama = ''
  wadah.querySelectorAll('[data-medan]').forEach((el) => {
    const nama = el.dataset.medan
    const pesan = galat[nama] || ''
    const p = el.querySelector('[data-galat]')
    const kontrol = el.querySelector('input, select, textarea')
    if (p) { p.textContent = pesan; p.hidden = !pesan }
    if (kontrol) {
      kontrol.classList.toggle('!border-rose-500', Boolean(pesan))
      if (pesan) kontrol.setAttribute('aria-invalid', 'true')
      else kontrol.removeAttribute('aria-invalid')
      if (pesan && !pertama) { pertama = nama; kontrol.focus() }
    }
  })
  return pertama
}

export function bersihkanGalat(wadah, nama) {
  const el = wadah.querySelector(`[data-medan="${CSS.escape(nama)}"]`)
  if (!el) return
  const p = el.querySelector('[data-galat]')
  if (p && !p.hidden) tandaiGalatSatu(el, '')
}
function tandaiGalatSatu(el, pesan) {
  const p = el.querySelector('[data-galat]')
  const kontrol = el.querySelector('input, select, textarea')
  p.textContent = pesan
  p.hidden = !pesan
  if (kontrol) {
    kontrol.classList.toggle('!border-rose-500', Boolean(pesan))
    kontrol.removeAttribute('aria-invalid')
  }
}

export function bacaForm(form, nama) {
  const hasil = {}
  for (const n of nama) hasil[n] = form.elements[n] ? form.elements[n].value : ''
  return hasil
}

export function barSimpan({ teks = 'Simpan' } = {}) {
  return `<div class="bar-simpan mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
    <button type="button" data-aksi="kembali" data-batal class="${KELAS.tombol}">Batal</button>
    <button type="submit" data-simpan class="${KELAS.utama}">${esc(teks)}</button></div>`
}

export function sibukSimpan(form, sibuk, teks = 'Simpan', teksSibuk = 'Memproses...') {
  const simpan = form.querySelector('[data-simpan]')
  const batal = form.querySelector('[data-batal]')
  if (simpan) {
    simpan.disabled = sibuk
    simpan.setAttribute('aria-busy', String(sibuk))
    simpan.innerHTML = sibuk ? spinner() + '<span>' + esc(teksSibuk) + '</span>' : esc(teks)
  }
  if (batal) batal.disabled = sibuk
}

export function galatMuat(teks) {
  return `<div role="alert" class="kosong-ui flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-sm text-rose-800 shadow-sm">
    ${ikon(IKON.info, 'mt-0.5 h-5 w-5 text-rose-500')}
    <div class="min-w-0 flex-1"><p class="font-medium">${esc(teks)}</p>
    <button type="button" data-aksi="muat-ulang" class="${KELAS.tombol} mt-3">Coba lagi</button></div></div>`
}

const NADA_AKSI = {
  biru: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
  amber: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200',
  bahaya: 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200',
}
export function aksiIkon({ aksi, id = '', label, d, bahaya = false, nonaktif = false, nada = '' }) {
  const warna = NADA_AKSI[bahaya ? 'bahaya' : nada] || 'hover:bg-slate-100 hover:text-slate-900'
  return `<button type="button" data-aksi="${esc(aksi)}" data-id="${esc(id)}" title="${esc(label)}" aria-label="${esc(label)}"${nonaktif ? ' disabled' : ''}
    class="aksi-ikon inline-grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:border-slate-200 ${warna}">${ikon(d, 'h-[18px] w-[18px]')}</button>`
}

const SEL = 'border-b border-r border-slate-200 last:border-r-0 px-4 py-3.5'
const SELH = 'border-b border-r border-slate-300 last:border-r-0 px-4 py-3.5'
const RATA = { tengah: ' text-center', angka: ' text-center tabular-nums' }
const TENGAH = ' text-center'

export function tabel({ kolom, baris, idKey = 'id', aksi = null, pilih = null, kosong = null, kartu = true }) {
  if (!baris.length && kosong) return statusKosong(kosong)
  const adaPilih = Boolean(pilih && pilih.aktif)
  const kepala = [
    adaPilih ? `<th class="${SELH} w-10 text-center"><input type="checkbox" data-pilih-semua aria-label="Pilih semua"${pilih.semua ? ' checked' : ''}${pilih.sebagian ? ' data-sebagian' : ''}${baris.length ? '' : ' disabled'} class="rounded border-slate-300"></th>` : '',
    ...kolom.map((k) => `<th scope="col" class="${SELH} font-bold text-slate-700 uppercase tracking-wider text-xs${RATA[k.rata] || TENGAH}">${esc(k.judul)}</th>`),
    aksi ? `<th scope="col" class="${SELH} text-center font-bold text-slate-700 uppercase tracking-wider text-xs">Aksi</th>` : '',
  ].join('')
  const nilaiSel = (k, b) => (k.html ? k.html(b) : esc(k.nilai ? k.nilai(b) : ''))
  const centang = (b, id, dipilih) => `<input type="checkbox" data-pilih="${esc(id)}" aria-label="${esc(pilih.label ? pilih.label(b) : 'Pilih baris')}"${dipilih ? ' checked' : ''}${pilih.nonaktif && pilih.nonaktif(b) ? ' disabled' : ''} class="rounded border-slate-300">`
  const isi = baris.map((b) => {
    const id = b[idKey]
    const dipilih = adaPilih && pilih.ada(id)
    const sel = kolom.map((k) => `<td class="${SEL} text-slate-700 font-medium align-middle${k.isi === 'kiri' ? ' text-left' : (RATA[k.rata] || TENGAH)}"${k.isi === 'kiri' ? ' style="text-align:left"' : ''}>${nilaiSel(k, b)}</td>`).join('')
    return `<tr class="transition-colors ${dipilih ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'}">
      ${adaPilih ? `<td class="${SEL} w-10 text-center">${centang(b, id, dipilih)}</td>` : ''}
      ${sel}
      ${aksi ? `<td class="${SEL}"><div class="flex justify-center gap-1.5">${aksi(b).map((a) => aksiIkon({ ...a, id })).join('')}</div></td>` : ''}</tr>`
  }).join('')
  const tabelHtml = `<div class="${kartu ? 'dt-desk ' : ''}overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm"><table class="w-full border-collapse text-sm">
    <thead class="bg-slate-100/70 border-b border-slate-200"><tr>${kepala}</tr></thead><tbody class="divide-y divide-slate-100">${isi}</tbody></table></div>`
  if (!kartu) return tabelHtml

  const [kolJudul, ...kolLain] = kolom
  const kolRinci = kolLain.filter((k) => !k.di)
  const kolTanda = kolLain.filter((k) => k.di === 'tanda')
  const kolTombol = kolLain.filter((k) => k.di === 'aksi')
  const daftarKartu = baris.map((b) => {
    const id = b[idKey]
    const dipilih = adaPilih && pilih.ada(id)
    const rinci = kolRinci.map((k) => `<div><dt class="text-xs font-semibold text-slate-400">${esc(k.judul)}</dt><dd class="text-sm font-semibold text-slate-800">${nilaiSel(k, b)}</dd></div>`).join('')
    const tanda = kolTanda.map((k) => nilaiSel(k, b)).join('')
    const bawah = kolTombol.map((k) => nilaiSel(k, b)).join('') + (aksi ? aksi(b).map((a) => aksiIkon({ ...a, id })).join('') : '')
    return `<li class="dt-k ${dipilih ? 'bg-blue-50/80 border-blue-200' : ''}">
      <div class="dt-k-atas">${adaPilih ? centang(b, id, dipilih) : ''}<div class="dt-k-judul text-slate-900">${nilaiSel(kolJudul, b)}</div>${tanda ? `<div class="dt-k-tanda">${tanda}</div>` : ''}</div>
      ${rinci ? `<dl class="dt-k-rinci text-sm border-t border-slate-100 pt-3">${rinci}</dl>` : ''}
      ${bawah ? `<div class="dt-k-aksi${kolTombol.length ? ' dt-k-teks' : ''}">${bawah}</div>` : ''}</li>`
  }).join('')
  return `<div class="dt">${tabelHtml}<ul class="dt-kartu" role="list">${daftarKartu}</ul></div>`
}

export function tandaiSebagian(wadah) {
  wadah.querySelectorAll('input[data-pilih-semua]').forEach((i) => { i.indeterminate = i.hasAttribute('data-sebagian') })
}

export function isiUlang(el, html) {
  const a = document.activeElement
  let sel = ''
  if (a && a !== document.body && el.contains(a)) {
    if (a.hasAttribute('data-pilih')) sel = '[data-pilih="' + CSS.escape(a.getAttribute('data-pilih')) + '"]'
    else if (a.hasAttribute('data-pilih-semua')) sel = '[data-pilih-semua]'
    else if (a.hasAttribute('data-aksi')) {
      sel = '[data-aksi="' + CSS.escape(a.getAttribute('data-aksi')) + '"]'
      if (a.hasAttribute('data-id')) sel += '[data-id="' + CSS.escape(a.getAttribute('data-id')) + '"]'
    }
  }
  el.innerHTML = html
  tandaiSebagian(el)
  if (sel) {
    const baru = [...el.querySelectorAll(sel)].find((n) => n.offsetParent !== null) || el.querySelector(sel)
    if (baru && !baru.disabled) baru.focus()
  }
}

const PETA_AKSI = new WeakMap()
export function pasangAksi(wadah, peta) {
  PETA_AKSI.set(wadah, peta)
  if (wadah.dataset.aksiTerpasang) return
  wadah.dataset.aksiTerpasang = '1'
  wadah.addEventListener('click', (e) => {
    const el = e.target.closest('[data-aksi]')
    if (!el || !wadah.contains(el) || el.disabled) return
    const f = PETA_AKSI.get(wadah)[el.dataset.aksi]
    if (!f) return
    const hasil = f(el.dataset.id, el)
    if (hasil && typeof hasil.then === 'function') {
      MENUNGGU.add(el)
      if (!dialogTerbuka) sibukTombol(el, true)
      const lepas = () => { MENUNGGU.delete(el); sibukTombol(el, false) }
      hasil.then(lepas, lepas)
    }
  })
  wadah.addEventListener('change', (e) => {
    const el = e.target
    const peta2 = PETA_AKSI.get(wadah)
    if (el.matches('[data-pilih]') && peta2.pilih) peta2.pilih(el.dataset.pilih, el)
    else if (el.matches('[data-pilih-semua]') && peta2['pilih-semua']) peta2['pilih-semua']()
  })
}

export function pilihanMassal() {
  let dipilih = new Set()
  let daftar = []
  const s = {
    aktif: false,
    mulai() { s.aktif = true },
    selesai() { dipilih = new Set(); s.aktif = false },
    setDaftar(ids) { daftar = ids; dipilih = new Set([...dipilih].filter((i) => ids.includes(i))) },
    ada: (id) => dipilih.has(id),
    balik(id) { if (dipilih.has(id)) dipilih.delete(id); else dipilih.add(id) },
    balikSemua() { dipilih = s.semuaDipilih ? new Set() : new Set(daftar) },
    get jumlah() { return dipilih.size },
    get semuaDipilih() { return daftar.length > 0 && dipilih.size === daftar.length },
    get sebagian() { return dipilih.size > 0 && !s.semuaDipilih },
    get daftarId() { return [...dipilih] },
  }
  return s
}

export function barAlat({ pilihan, total, satuan, sibuk = false }) {
  if (!pilihan.aktif) {
    return `<div class="mb-3 flex justify-end"><button type="button" data-aksi="mulai-pilih" class="${KELAS.tombol} ${KELAS.kecil}"${total === 0 ? ' disabled' : ''}
      title="Pilih beberapa ${esc(satuan)} sekaligus">${ikon(IKON.pilih, 'h-4 w-4')}Pilih ${esc(satuan)}</button></div>`
  }
  return `<div role="region" aria-label="Mode pilih ${esc(satuan)}" class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3">
    <span aria-live="polite" class="text-sm font-semibold text-blue-900"><strong>${pilihan.jumlah}</strong> dari ${total} ${esc(satuan)} dipilih</span>
    <div class="flex gap-2">
      <button type="button" data-aksi="pilih-semua" class="${KELAS.tombol} ${KELAS.kecil}"${sibuk ? ' disabled' : ''}>${pilihan.semuaDipilih ? 'Lepas semua' : 'Pilih semua'}</button>
      <button type="button" data-aksi="selesai-pilih" class="${KELAS.tombol} ${KELAS.kecil}"${sibuk ? ' disabled' : ''}>Selesai</button>
    </div></div>`
}

export function barAksiBawah({ pilihan, satuan, sibuk = false }) {
  if (!pilihan.aktif) return ''
  return `<div role="region" aria-label="Aksi untuk ${esc(satuan)} terpilih" class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <span aria-live="polite" class="text-sm font-semibold text-slate-700"><strong>${pilihan.jumlah}</strong> ${esc(satuan)} dipilih</span>
    <button type="button" data-aksi="hapus-terpilih" class="${KELAS.bahaya}"${sibuk || pilihan.jumlah === 0 ? ' disabled' : ''}>${sibuk ? spinner() + '<span>Memproses...</span>' : 'Hapus terpilih'}</button></div>`
}

export function ringkasanMassal(hasil, satuan) {
  const lewat = hasil.dilewati || []
  let teks = hasil.dihapus + ' ' + satuan + ' dihapus.'
  if (lewat.length) teks += ' ' + lewat.length + ' dilewati: ' + lewat.map((x) => x.nama + ' (' + x.alasan + ')').join('; ') + '.'
  return { jenis: hasil.dihapus === 0 ? 'galat' : lewat.length ? 'peringatan' : 'sukses', teks }
}
