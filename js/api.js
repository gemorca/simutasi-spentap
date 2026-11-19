import { urutKelas } from './urutKelas.js'
import * as gudang from './data.js'
export function ambilToken() { return sessionStorage.getItem('token') }
export function simpanToken(token) { gudang.kosongkan(); sessionStorage.setItem('token', token) }
export function hapusToken() { sessionStorage.removeItem('token'); gudang.kosongkan() }

const TIMEOUT_MS = 45000
const TTL_KELAS_MS = 60000

const AKSI_BACA = new Set([
  'me', 'kelasDaftar', 'siswaDaftar', 'siswaDetail', 'mutasiDaftar', 'mutasiDetail', 'mutasiRiwayat',
  'dashboard', 'laporanRekap', 'logDaftar', 'pengaturanAmbil', 'penggunaDaftar', 'lampiranAmbil',
  'profilFotoAmbil', 'dataAwal',
])

const KECEPATAN_KIRIM = 300 * 1024

function mulaiProgres(saatProgres, byteTotal) {
  const aman = (p) => { try { saatProgres(p) } catch {  } }
  const estimasi = Math.min(30000, Math.max(1500, (byteTotal / KECEPATAN_KIRIM) * 1000))
  const mulai = Date.now()
  let diServer = false
  aman({ tahap: 'kirim', dimuat: 0, total: estimasi })
  const pewaktu = setInterval(() => {
    const lalu = Date.now() - mulai
    if (lalu < estimasi) aman({ tahap: 'kirim', dimuat: lalu, total: estimasi })
    else if (!diServer) { diServer = true; aman({ tahap: 'server' }) }
  }, 200)
  return () => clearInterval(pewaktu)
}

async function kirim(url, aksi, data, saatProgres) {
  const badan = JSON.stringify({ aksi, token: ambilToken(), data })
  const pengendali = new AbortController()
  const batas = setTimeout(() => pengendali.abort(), TIMEOUT_MS)
  const hentiProgres = saatProgres ? mulaiProgres(saatProgres, badan.length) : null
  try {
    const respons = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: badan,
      signal: pengendali.signal,
    })
    return await respons.json()
  } finally {
    clearTimeout(batas)
    if (hentiProgres) hentiProgres()
  }
}

export async function panggilApi(aksi, data = {}, { saatProgres, paksa = false } = {}) {
  const API_URL = window.APP_CONFIG && window.APP_CONFIG.API_URL
  if (!API_URL) {
    throw new Error('API_URL belum diisi di config.js')
  }

  const baca = AKSI_BACA.has(aksi)
  const bisaCache = aksi === 'kelasDaftar' && Object.keys(data).length === 0
  if (!baca) gudang.terapkanDampak(aksi)
  if (bisaCache && !paksa) {
    const tersimpan = gudang.ambil('kelas', { maksUmurMs: TTL_KELAS_MS })
    if (tersimpan) return tersimpan
  }
  const versiKelas = gudang.versiSekarang().kelas

  let hasil
  for (let percobaan = 0; ; percobaan++) {
    try {
      hasil = await kirim(API_URL, aksi, data, saatProgres)
      break
    } catch {
      if (!baca || percobaan >= 1) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.')
      }
    }
  }

  if (!hasil.ok) {
    if (hasil.kode === 'SESI_HABIS') {
      hapusToken()
      window.dispatchEvent(new Event('sesi-habis'))
    }
    if (hasil.kode === 'PERIODE_TUTUP') {
      window.dispatchEvent(new CustomEvent('periode-tutup', { detail: hasil.data }))
    }
    throw new Error(hasil.pesan)
  }
  if (aksi === 'kelasDaftar' && Array.isArray(hasil.data)) hasil.data = [...hasil.data].sort(urutKelas)
  if (!baca) gudang.terapkanDampak(aksi)
  if (bisaCache) gudang.simpan('kelas', hasil.data, versiKelas)
  return hasil.data
}

export function bolehMuatAwal(pengguna) {
  if (!pengguna) return false
  const p = pengguna.periode
  return !(p && p.aktif === false && pengguna.peran !== 'admin')
}

let muatBerjalan = null

export function muatAwal({ saatProgres, denganSiswa = false } = {}) {
  if (muatBerjalan) return muatBerjalan
  const versiAwal = gudang.versiSekarang()
  muatBerjalan = panggilApi('dataAwal', denganSiswa ? { siswa: true } : {}, { saatProgres })
    .then((hasil) => {
      gudang.simpan('kelas', [...hasil.kelas].sort(urutKelas), versiAwal.kelas)
      gudang.simpan('mutasi', hasil.mutasi, versiAwal.mutasi)
      gudang.simpan('dashboard', hasil.dashboard, versiAwal.dashboard)
      if (hasil.siswa) gudang.simpan('siswa', hasil.siswa, versiAwal.siswa)
      return gudang.ringkas()
    })
    .finally(() => { muatBerjalan = null })
  return muatBerjalan
}

const PARAMETER_SEGAR = {
  siswa: ['siswaDaftar', { semua: true }],
  mutasi: ['mutasiDaftar', { semua: true }],
  dashboard: ['dashboard', {}],
}
const segarBerjalan = {}

export function ambilCache(nama) { return gudang.ambil(nama) }
export function umurCache(nama) { return gudang.umur(nama) }

export function segarkan(nama) {
  const versi = gudang.versiSekarang()[nama]
  const jalan = segarBerjalan[nama]
  if (jalan && jalan.versi === versi) return jalan.janji
  let janji
  if (nama === 'kelas') {
    janji = panggilApi('kelasDaftar', {}, { paksa: true })
  } else {
    const [aksi, data] = PARAMETER_SEGAR[nama]
    janji = panggilApi(aksi, data).then((hasil) => { gudang.simpan(nama, hasil, versi); return hasil })
  }
  const catat = { versi, janji: janji.finally(() => { if (segarBerjalan[nama] === catat) delete segarBerjalan[nama] }) }
  segarBerjalan[nama] = catat
  return catat.janji
}