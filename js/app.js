import { panggilApi, ambilToken, hapusToken } from './api.js'
import { menuUntuk, NAMA_PERAN } from './menu.js'
import { bacaHalaman, pindah, saatBerubah, HALAMAN, TAHAP } from './router.js'
import { esc, ikon, memuat, dialogKonfirmasi } from './ui.js'
import { isiAvatar, muatFotoProfil, lupakanFoto } from './foto.js'
import * as login from './halaman/login.js'
import { mulaiNotifikasi, hentikanNotifikasi } from './notifikasi.js'
import { mulaiTema, pasangPemilihTema } from './tema.js'

const NAMA_SEKOLAH = ['SMP Negeri 1', 'Tapa']
const JUDUL_APP = 'SIM Mutasi Siswa'
const $ = (id) => document.getElementById(id)

const HALAMAN_TAHUN_AJARAN = 'tahunAjaran'

const JUDUL_KUNCI = {
  belum_mulai: 'Aplikasi belum aktif',
  menunggu_kenaikan: 'Menunggu kenaikan kelas',
  berakhir: 'Tahun ajaran telah berakhir',
}
const PESAN_KUNCI = 'Aplikasi sedang tidak dapat digunakan. Silakan hubungi Administrator.'

let pengguna = null
let urutan = 0
let memeriksaKunci = false
let pewaktuPeriode = null
let versiPeriode = 0
let memuatPeriode = false
let hashAktif = ''

function tampilPengingat(periode) {
  const banner = $('pengingat-periode')
  const pesan = pengguna?.peran === 'admin' ? periode?.pengingat || [] : []
  banner.hidden = !pesan.length
  banner.innerHTML = pesan.length
    ? `<div role="status"><ul class="list-disc pl-5 space-y-1">${pesan.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <a href="#/tahunAjaran" class="mt-2 inline-block font-bold underline underline-offset-2">Kelola Tahun Ajaran</a></div>`
    : ''
}

async function segarkanPeriode() {
  if (pengguna?.peran !== 'admin' || document.hidden || memuatPeriode || document.documentElement.dataset.periodeMenulis === '1') return
  const versi = versiPeriode
  memuatPeriode = true
  try {
    const baru = await panggilApi('me')
    if (versi !== versiPeriode || pengguna?.id !== baru.id) return
    pengguna.periode = baru.periode
    tampilPengingat(baru.periode)
  } catch {  }
  finally { memuatPeriode = false }
}

function tampilKunci(periode) {
  const p = periode || {}
  hentikanNotifikasi()
  bukaAkun(false)
  bukaLaci(false)
  $('kunci-judul').textContent = JUDUL_KUNCI[p.status] || 'Aplikasi sedang ditutup'
  $('kunci-pesan').textContent = p.pesan || PESAN_KUNCI
  $('kunci-ta').textContent = p.tahun_ajaran ? 'Tahun ajaran ' + p.tahun_ajaran : ''
  $('kunci-ta').hidden = !p.tahun_ajaran
  const baru = $('kunci').classList.contains('hidden')
  $('kunci').classList.remove('hidden')
  document.body.classList.add('kunci-buka')
  $('aplikasi').inert = true
  if (baru) $('kunci-ulang').focus()
}

function sembunyiKunci() {
  $('kunci').classList.add('hidden')
  document.body.classList.remove('kunci-buka')
  $('aplikasi').inert = false
  $('kunci-info').textContent = ''
  $('kunci-ulang').disabled = false
  $('kunci-ulang').textContent = 'Coba lagi'
  $('kunci-keluar').disabled = false
}

function jamSekarang() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

async function cobaLagiKunci() {
  if (memeriksaKunci) return
  memeriksaKunci = true
  const tombol = $('kunci-ulang')
  const info = $('kunci-info')
  tombol.disabled = true
  tombol.textContent = 'Memeriksa...'
  info.textContent = ''
  try {
    const baru = await panggilApi('me')
    pengguna = baru
    if (baru.periode && baru.periode.aktif === false && baru.peran !== 'admin') {
      tampilKunci(baru.periode)
      info.textContent = 'Diperiksa pukul ' + jamSekarang() + '. Aplikasi masih ditutup.'
    } else {
      sembunyiKunci()
      masuk()
    }
  } catch (err) {
    info.textContent = err.message
  } finally {
    memeriksaKunci = false
    tombol.disabled = false
    tombol.textContent = 'Coba lagi'
  }
}

function tampilLogin() {
  urutan++
  pengguna = null
  versiPeriode++
  clearInterval(pewaktuPeriode)
  pewaktuPeriode = null
  tampilPengingat(null)
  sembunyiKunci()
  hentikanNotifikasi()
  lupakanFoto()
  document.body.classList.remove('laci-buka')
  document.body.dataset.memuat = 'selesai'
  $('aplikasi').classList.add('hidden')
  $('layar').classList.remove('hidden')
  document.title = JUDUL_APP
  login.render($('layar'), (p) => { pengguna = p; masuk() })
}

function masuk() {
  $('layar').classList.add('hidden')
  $('layar').innerHTML = ''
  const periode = pengguna.periode
  if (periode && periode.aktif === false) {
    if (pengguna.peran !== 'admin') { tampilKunci(periode); return }
    history.replaceState(null, '', '#/' + HALAMAN_TAHUN_AJARAN)
  }
  $('aplikasi').classList.remove('hidden')
  bangunKerangka()
  versiPeriode++
  tampilPengingat(periode)
  clearInterval(pewaktuPeriode)
  if (pengguna.peran === 'admin') pewaktuPeriode = setInterval(segarkanPeriode, 60000)
  mulaiNotifikasi(pengguna)
  tampilHalaman()
}

const HALAMAN_AKUN = { profil: 'Profil Saya' }

function isiIdentitas() {
  const peran = NAMA_PERAN[pengguna.peran] || pengguna.peran
  for (const id of ['samping-avatar', 'akun-avatar']) isiAvatar($(id), pengguna.nama)
  for (const id of ['samping-nama', 'akun-nama', 'panel-nama']) $(id).textContent = pengguna.nama
  for (const id of ['samping-peran', 'akun-peran', 'panel-peran']) $(id).textContent = peran
  $('akun-tombol').setAttribute('aria-label', 'Menu akun ' + pengguna.nama)
}

function bangunKerangka() {
  $('sekolah-1').textContent = NAMA_SEKOLAH[0]
  $('sekolah-2').textContent = NAMA_SEKOLAH[1]
  isiIdentitas()
  if (pengguna.ada_foto) muatFotoProfil()

  $('menu').innerHTML = menuUntuk(pengguna.peran).map((m) => {
    const isi = ikon(m.ikon, 'h-5 w-5') + `<span class="font-semibold">${esc(m.label)}${m.tersedia ? '' : ' (segera)'}</span>`
    const dasar = 'flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm transition-all'
    return m.tersedia
      ? `<li><a href="#/${esc(m.id)}" data-id="${esc(m.id)}" class="${dasar} text-slate-400 hover:bg-slate-800/80 hover:text-white aria-[current=page]:bg-blue-600 aria-[current=page]:text-white aria-[current=page]:shadow-md aria-[current=page]:shadow-blue-600/30">${isi}</a></li>`
      : `<li><span aria-disabled="true" class="${dasar} cursor-not-allowed opacity-40 text-slate-500">${isi}</span></li>`
  }).join('')
  bukaAkun(false)
  bukaLaci(false)
}

function tandaiMenuAktif(id) {
  $('menu').querySelectorAll('a').forEach((a) => {
    if (a.dataset.id === id) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
}

function bukaAkun(buka) {
  $('akun-panel').hidden = !buka
  $('akun-tombol').setAttribute('aria-expanded', String(buka))
}

let pewaktuScrim = 0
function bukaLaci(buka) {
  $('samping').dataset.buka = String(buka)
  const scrim = $('scrim')
  clearTimeout(pewaktuScrim)
  if (buka) scrim.classList.remove('hidden', 'scrim-keluar')
  else if (!scrim.classList.contains('hidden')) {
    scrim.classList.add('scrim-keluar')
    pewaktuScrim = setTimeout(() => scrim.classList.add('hidden'), 200)
  }
  $('buka-laci').setAttribute('aria-expanded', String(buka))
  document.body.classList.toggle('laci-buka', buka)
}

async function tampilHalaman() {
  if (!pengguna) return
  if (document.documentElement.dataset.periodeMenulis === '1') {
    if (hashAktif) history.replaceState(null, '', hashAktif)
    return
  }
  hashAktif = location.hash || '#/beranda'
  segarkanPeriode()
  const menu = menuUntuk(pengguna.peran)
  const diminta = bacaHalaman()
  const id = HALAMAN_AKUN[diminta] || menu.some((m) => m.id === diminta && m.tersedia) ? diminta : 'beranda'
  const label = HALAMAN_AKUN[id] || (menu.find((m) => m.id === id) || {}).label || 'Beranda'

  $('judul').textContent = label
  document.title = label + ' - ' + JUDUL_APP
  tandaiMenuAktif(id)
  bukaLaci(false)
  window.scrollTo(0, 0)

  const saya = ++urutan
  const wadah = $('isi')
  wadah.innerHTML = memuat()
  document.body.dataset.memuat = 'true'

  try {
    const muat = HALAMAN[id]
    const modul = muat ? await muat() : null
    if (saya !== urutan) return
    wadah.innerHTML = ''
    const dalam = document.createElement('div')
    dalam.className = 'halaman-masuk'
    wadah.appendChild(dalam)
    if (modul) await modul.render(dalam, pengguna)
    else dalam.innerHTML = placeholder(label, TAHAP[id])
  } catch (err) {
    if (saya !== urutan) return
    wadah.innerHTML = `<div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 font-semibold" role="alert">${esc(err.message)}</div>`
  } finally {
    if (saya === urutan) document.body.dataset.memuat = 'selesai'
  }
}

function placeholder(label, tahap) {
  return `<div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <h2 class="text-2xl font-bold tracking-tight text-slate-900">${esc(label)}</h2>
    <p class="mt-3 text-sm text-slate-500">Halaman ini dibuat di Tahap ${esc(tahap || '?')}.</p>
  </div>`
}

async function keluarSekarang() {
  if (document.documentElement.dataset.periodeMenulis === '1') return
  try { await panggilApi('logout') } catch {  }
  hapusToken()
  pindah('beranda')
  tampilLogin()
}

async function keluar() {
  if (document.documentElement.dataset.periodeMenulis === '1') return
  const ya = await dialogKonfirmasi({
    judul: 'Keluar dari aplikasi?',
    pesan: 'Anda perlu masuk lagi untuk memakai SIM Mutasi Siswa.',
    ya: 'Ya, keluar',
    tidak: 'Batal',
  })
  if (!ya) return
  await keluarSekarang()
}

function pasangEvent() {
  saatBerubah(tampilHalaman)
  pasangPemilihTema()
  window.addEventListener('periode-berubah', (e) => {
    if (!pengguna) return
    versiPeriode++
    pengguna.periode = e.detail
    tampilPengingat(e.detail)
  })
  window.addEventListener('periode-menulis', (e) => {
    if (e.detail) versiPeriode++
  })
  document.addEventListener('visibilitychange', () => { if (!document.hidden) segarkanPeriode() })

  $('menu').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-id]')
    if (!a) return
    bukaLaci(false)
    if (a.dataset.id === bacaHalaman()) tampilHalaman()
  })

  $('buka-laci').addEventListener('click', () => bukaLaci(true))
  $('tutup-laci').addEventListener('click', () => { bukaLaci(false); $('buka-laci').focus() })
  $('scrim').addEventListener('click', () => bukaLaci(false))
  window.matchMedia('(min-width: 640px)').addEventListener('change', (e) => { if (e.matches) bukaLaci(false) })

  $('akun-tombol').addEventListener('click', () => bukaAkun($('akun-panel').hidden))
  $('btn-profil').addEventListener('click', () => { bukaAkun(false); pindah('profil') })
  $('btn-keluar').addEventListener('click', () => { bukaAkun(false); keluar() })
  window.addEventListener('profil-berubah', (e) => {
    if (!pengguna) return
    Object.assign(pengguna, e.detail)
    isiIdentitas()
  })
  window.addEventListener('foto-berubah', () => {
    if (pengguna) isiIdentitas()
  })
  document.addEventListener('pointerdown', (e) => {
    if (!$('akun-panel').hidden && !$('akun').contains(e.target)) bukaAkun(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (!$('akun-panel').hidden) { bukaAkun(false); $('akun-tombol').focus() }
    else if ($('samping').dataset.buka === 'true') { bukaLaci(false); $('buka-laci').focus() }
  })

  $('lompat').addEventListener('click', (e) => { e.preventDefault(); $('isi').focus() })

  window.addEventListener('sesi-habis', () => { pindah('beranda'); tampilLogin() })

  window.addEventListener('periode-tutup', (e) => {
    if (!pengguna || pengguna.peran === 'admin') return
    tampilKunci(e.detail)
  })
  $('kunci-ulang').addEventListener('click', cobaLagiKunci)
  $('kunci-keluar').addEventListener('click', () => {
    $('kunci-keluar').disabled = true
    keluarSekarang()
  })
}

async function mulai() {
  mulaiTema()
  pasangEvent()
  if (!ambilToken()) return tampilLogin()
  try {
    pengguna = await panggilApi('me')
    masuk()
  } catch {
    hapusToken()
    tampilLogin()
  }
}

mulai()
