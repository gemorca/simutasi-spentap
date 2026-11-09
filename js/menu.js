const ADMIN = ['admin']
const KEPSEK = ['kepala_sekolah']
const SEMUA = ['admin', 'petugas_tu', 'kepala_sekolah']

export const NAMA_PERAN = {
  admin: 'Administrator Utama',
  petugas_tu: 'Petugas TU',
  kepala_sekolah: 'Kepala Sekolah',
}

const DAFTAR_MENU = [
  { id: 'beranda',       label: 'Beranda',        peran: SEMUA,              tersedia: true, ikon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  { id: 'kelas',         label: 'Kelas',          peran: ADMIN,              tersedia: true, ikon: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13' },
  { id: 'pengguna',      label: 'Pengguna',       peran: ADMIN,              tersedia: true, ikon: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1a4 4 0 0 0-3-3.9' },
  { id: 'siswa',         label: 'Siswa',          peran: SEMUA,              tersedia: true, ikon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5' },
  { id: 'siswaMasuk',    label: 'Siswa Masuk',    peran: SEMUA,              tersedia: true, ikon: 'M4 12h12M12 7l5 5-5 5M20 4v16' },
  { id: 'persetujuan',   label: 'Persetujuan',    peran: KEPSEK,             tersedia: true, ikon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6' },
  { id: 'stafTu',        label: 'Staf Tata Usaha', peran: KEPSEK,            tersedia: true, ikon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
  { id: 'laporan',       label: 'Laporan',        peran: SEMUA,              tersedia: true, ikon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6' },
  { id: 'log',           label: 'Log Aktivitas',  peran: ADMIN,              tersedia: true, ikon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2' },
  { id: 'pengaturan',    label: 'Pengaturan',     peran: ADMIN,              tersedia: true, ikon: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4' },
]

export function menuUntuk(peran) {
  return DAFTAR_MENU.filter((m) => m.tampil !== false && m.peran.includes(peran))
}
