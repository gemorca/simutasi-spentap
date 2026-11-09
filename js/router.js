export const HALAMAN = {
  beranda: () => import('./halaman/beranda.js'),
  kelas: () => import('./halaman/kelas.js'),
  tahunAjaran: () => import('./halaman/tahunAjaran.js'),
  pengguna: () => import('./halaman/pengguna.js'),
  siswa: () => import('./halaman/siswa.js'),
  siswaMasuk: () => import('./halaman/mutasi.js'),
  persetujuan: () => import('./halaman/persetujuan.js'),
  stafTu: () => import('./halaman/stafTu.js'),
  laporan: () => import('./halaman/laporan.js'),
  log: () => import('./halaman/log.js'),
  pengaturan: () => import('./halaman/pengaturan.js'),
  profil: () => import('./halaman/profil.js'),
}

// Placeholder untuk halaman yang belum dibuat (kosong: semua halaman sudah ada).
export const TAHAP = {}

export function bacaHalaman() {
  return window.location.hash.replace(/^#\/?/, '') || 'beranda'
}

export function pindah(id) {
  window.location.hash = '/' + id
}

export function saatBerubah(fn) {
  window.addEventListener('hashchange', fn)
}
