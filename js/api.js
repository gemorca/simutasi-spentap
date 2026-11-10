import { urutKelas } from './urutKelas.js'
export function ambilToken() { return sessionStorage.getItem('token') }
export function simpanToken(token) { sessionStorage.setItem('token', token) }
export function hapusToken() { sessionStorage.removeItem('token') }

const TIMEOUT_MS = 45000
const TTL_KELAS_MS = 60000

const AKSI_BACA = new Set([
  'me', 'kelasDaftar', 'siswaDaftar', 'siswaDetail', 'mutasiDaftar', 'mutasiDetail', 'mutasiRiwayat',
  'dashboard', 'laporanRekap', 'logDaftar', 'pengaturanAmbil', 'penggunaDaftar', 'lampiranAmbil',
  'profilFotoAmbil',
])

let cacheKelas = null

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

export async function panggilApi(aksi, data = {}, { saatProgres } = {}) {
  const API_URL = window.APP_CONFIG && window.APP_CONFIG.API_URL
  if (!API_URL) {
    throw new Error('API_URL belum diisi di config.js')
  }

  const baca = AKSI_BACA.has(aksi)
  const bisaCache = aksi === 'kelasDaftar' && Object.keys(data).length === 0
  if (!baca) cacheKelas = null
  if (bisaCache && cacheKelas && Date.now() - cacheKelas.waktu < TTL_KELAS_MS) {
    return JSON.parse(cacheKelas.isi)
  }

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
  if (!baca) cacheKelas = null
  if (bisaCache) cacheKelas = { waktu: Date.now(), isi: JSON.stringify(hasil.data) }
  return hasil.data
}
