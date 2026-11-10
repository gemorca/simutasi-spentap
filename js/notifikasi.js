import { panggilApi } from './api.js'
import { bacaHalaman, pindah } from './router.js'
import { esc } from './ui.js'

const SELANG_MS = 60000
const KUNCI_BUKA = 'sim_buka_mutasi'
const $ = (id) => document.getElementById(id)

let aktif = false
let pewaktu = null
let pewaktuWaktu = null
let urutan = 0
let terpasang = false
let penggunaId = ''
let daftar = []
let sudahMuat = false
let gagal = false
let baca = new Set()

function waktuLalu(teks) {
  const t = new Date(String(teks || '').trim().replace(' ', 'T'))
  if (Number.isNaN(t.getTime())) return ''
  const d = Math.max(1, Math.floor((Date.now() - t.getTime()) / 1000))
  if (d < 60) return d + ' detik yang lalu'
  const menit = Math.floor(d / 60)
  if (menit < 60) return menit + ' menit yang lalu'
  const jam = Math.floor(menit / 60)
  if (jam < 24) return jam + ' jam yang lalu'
  const hari = Math.floor(jam / 24)
  if (hari < 7) return hari + ' hari yang lalu'
  if (hari < 30) return Math.floor(hari / 7) + ' minggu yang lalu'
  if (hari < 365) return Math.floor(hari / 30) + ' bulan yang lalu'
  return Math.floor(hari / 365) + ' tahun yang lalu'
}

const kunci = (m) => m.id + '|' + (m.tanggal_diajukan || '')
const kunciSimpan = () => 'sim_notif_baca:' + penggunaId

function muatBaca() {
  try { return new Set(JSON.parse(localStorage.getItem(kunciSimpan())) || []) } catch { return new Set() }
}
function simpanBaca() {
  try { localStorage.setItem(kunciSimpan(), JSON.stringify([...baca])) } catch {  }
}

const belumDibaca = () => daftar.filter((m) => !baca.has(kunci(m)))
const panelTerbuka = () => !$('notif-panel').hidden

function bukaPanel(buka) {
  $('notif-panel').hidden = !buka
  $('notif-tombol').setAttribute('aria-expanded', String(buka))
  if (buka) { gambarPanel(); segarkanNotifikasi() }
}

function gambarTombol() {
  const tombol = $('notif-tombol')
  const angka = $('notif-angka')
  const n = belumDibaca().length
  tombol.classList.toggle('notif-aktif', n > 0)
  angka.hidden = n === 0
  angka.textContent = n > 99 ? '99+' : String(n)
  tombol.setAttribute('aria-label', n > 0
    ? n + ' notifikasi baru: pengajuan siswa masuk menunggu persetujuan Anda'
    : 'Notifikasi (tidak ada yang baru)')
}

function gambarPanel() {
  const panel = $('notif-panel')
  if (panel.hidden) return
  const baru = belumDibaca().length
  let isi
  if (!sudahMuat) {
    isi = `<p class="px-4 py-6 text-center text-sm font-medium text-slate-500">${gagal ? 'Gagal memuat notifikasi. Coba lagi sebentar.' : 'Memuat notifikasi...'}</p>`
  } else if (!daftar.length) {
    isi = '<p class="px-4 py-8 text-center text-sm font-medium text-slate-500">Tidak ada pengajuan yang menunggu persetujuan.</p>'
  } else {
    isi = `<ul class="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">${daftar.map((m) => {
      const k = kunci(m)
      const baru1 = !baca.has(k)
      return `<li class="px-3 py-2.5 ${baru1 ? 'bg-blue-50/60' : ''}">
        <button type="button" data-aksi="buka" data-id="${esc(m.id)}" data-kunci="${esc(k)}" class="flex w-full min-w-0 items-start gap-3 rounded-xl p-1 text-left hover:bg-slate-100/80">
          <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${baru1 ? 'bg-rose-500' : 'bg-slate-300'}" aria-hidden="true"></span>
          <span class="min-w-0">
            <span class="block text-sm ${baru1 ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'}">Pengajuan siswa masuk baru</span>
            <span class="mt-0.5 block truncate text-sm font-semibold text-blue-700">${esc(m.nama_siswa)}${m.nama_kelas ? ' &middot; ' + esc(m.nama_kelas) : ''}</span>
            <span class="mt-0.5 block text-xs font-medium text-slate-500">Diajukan oleh ${esc(m.diajukan_oleh || '-')}</span>
            ${waktuLalu(m.tanggal_diajukan) ? `<span class="mt-0.5 block text-xs font-medium text-slate-400">${esc(waktuLalu(m.tanggal_diajukan))}</span>` : ''}
          </span>
        </button>
        ${baru1 ? `<div class="mt-1 flex justify-end"><button type="button" data-aksi="baca" data-kunci="${esc(k)}" class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">Tandai telah dibaca</button></div>` : ''}
      </li>`
    }).join('')}</ul>`
  }
  panel.innerHTML = `<div class="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
      <strong class="text-sm font-bold text-slate-900">Notifikasi${baru ? ` <span class="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">${baru} baru</span>` : ''}</strong>
      ${baru ? '<button type="button" data-aksi="semua" class="text-xs font-semibold text-blue-600 hover:underline">Tandai semua telah dibaca</button>' : ''}
    </div>${isi}`
}

function gambar() { gambarTombol(); gambarPanel() }

function keHalamanPersetujuan(id) {
  try { if (id) sessionStorage.setItem(KUNCI_BUKA, id) } catch {  }
  if (bacaHalaman() === 'persetujuan') window.dispatchEvent(new Event('hashchange'))
  else pindah('persetujuan')
}

function saatKlikPanel(e) {
  const t = e.target.closest('[data-aksi]')
  if (!t) return
  const aksi = t.dataset.aksi
  if (aksi === 'baca') { baca.add(t.dataset.kunci); simpanBaca(); gambar() }
  else if (aksi === 'semua') { daftar.forEach((m) => baca.add(kunci(m))); simpanBaca(); gambar() }
  else if (aksi === 'buka') {
    bukaPanel(false)
    keHalamanPersetujuan(t.dataset.id)
  }
}

function saatKlikLuar(e) {
  if (panelTerbuka() && !$('notif').contains(e.target)) bukaPanel(false)
}
function saatTombolTekan(e) {
  if (e.key === 'Escape' && panelTerbuka()) { bukaPanel(false); $('notif-tombol').focus() }
}

export async function segarkanNotifikasi() {
  if (!aktif) return
  const saya = ++urutan
  try {
    const hasil = await panggilApi('mutasiDaftar', { status: 'Diajukan' })
    if (!aktif || saya !== urutan) return
    daftar = hasil.daftar || []
    sudahMuat = true
    gagal = false
    const hidup = new Set(daftar.map(kunci))
    const sisa = [...baca].filter((k) => hidup.has(k))
    if (sisa.length !== baca.size) { baca = new Set(sisa); simpanBaca() }
  } catch {
    if (!sudahMuat) gagal = true
  }
  if (aktif && saya === urutan) gambar()
}

function saatTampak() {
  if (document.visibilityState === 'visible') segarkanNotifikasi()
}

export function mulaiNotifikasi(pengguna) {
  hentikanNotifikasi()
  if (!$('notif') || !pengguna || pengguna.peran !== 'kepala_sekolah') return
  aktif = true
  penggunaId = pengguna.id || pengguna.username || 'kepsek'
  baca = muatBaca()
  daftar = []
  sudahMuat = false
  gagal = false
  if (!terpasang) {
    terpasang = true
    $('notif-tombol').addEventListener('click', () => bukaPanel(!panelTerbuka()))
    $('notif-panel').addEventListener('click', saatKlikPanel)
    document.addEventListener('pointerdown', saatKlikLuar)
    document.addEventListener('keydown', saatTombolTekan)
  }
  $('notif').hidden = false
  bukaPanel(false)
  gambarTombol()
  segarkanNotifikasi()
  pewaktu = setInterval(saatTampak, SELANG_MS)
  pewaktuWaktu = setInterval(gambarPanel, 15000)
  document.addEventListener('visibilitychange', saatTampak)
  window.addEventListener('notif-segarkan', segarkanNotifikasi)
  window.addEventListener('hashchange', segarkanNotifikasi)
}

export function hentikanNotifikasi() {
  aktif = false
  urutan++
  if (pewaktu) clearInterval(pewaktu)
  pewaktu = null
  if (pewaktuWaktu) clearInterval(pewaktuWaktu)
  pewaktuWaktu = null
  document.removeEventListener('visibilitychange', saatTampak)
  window.removeEventListener('notif-segarkan', segarkanNotifikasi)
  window.removeEventListener('hashchange', segarkanNotifikasi)
  const wadah = $('notif')
  if (wadah) {
    wadah.hidden = true
    $('notif-panel').hidden = true
    $('notif-panel').innerHTML = ''
    $('notif-tombol').classList.remove('notif-aktif')
    $('notif-angka').hidden = true
  }
}
