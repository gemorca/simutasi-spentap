import { panggilApi } from '../api.js'
import {
  esc, ikon, KELAS, IKON, memuat, judulHalaman, tabel, lencana, galatMuat, statusKosong, pasangAksi,
} from '../ui.js'

const IK_ORANG = 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'
const IK_AKTIF = 'M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10'
const IK_MASUK = 'M4 12h12M12 7l5 5-5 5M20 4v16'
const IK_TUNGGU = 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2'
const IK_LIHAT = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'

const NAMA_AKSI = {
  SISWA_TAMBAH: 'Tambah siswa', SISWA_UBAH: 'Ubah siswa', SISWA_IMPOR: 'Impor siswa',
  MUTASI_TAMBAH: 'Buat mutasi', MUTASI_UBAH: 'Ubah mutasi', MUTASI_AJUKAN: 'Ajukan mutasi',
  MUTASI_NOMOR_SURAT: 'Ubah nomor surat', MUTASI_SURAT_TERBIT: 'Terbitkan surat',
  LAMPIRAN_UNGGAH: 'Unggah lampiran', LAMPIRAN_HAPUS: 'Hapus lampiran',
  PROFIL_FOTO_UNGGAH: 'Unggah foto profil', PROFIL_FOTO_HAPUS: 'Hapus foto profil',
  LOGIN: 'Masuk', LOGOUT: 'Keluar', LOGIN_GAGAL: 'Gagal masuk',
}
const namaAksi = (a) => NAMA_AKSI[a] || a

function kartuStat(d, angka, label, sorot = false) {
  return `<div class="ringkas-k ${sorot ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300' : ''}">
    <div class="ikon-chip h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center shrink-0 border border-blue-100">
      ${ikon(d, 'h-6 w-6')}
    </div>
    <div class="min-w-0">
      <b class="block text-2xl font-extrabold text-slate-900 leading-tight">${esc(angka)}</b>
      <span class="ringkas-l text-xs font-semibold text-slate-500">${esc(label)}</span>
    </div>
  </div>`
}

function tampil(h) {
  const r = h.ringkasan
  const ringkas = `<div class="ringkas">
    ${kartuStat(IK_ORANG, r.total, 'Petugas TU terdaftar')}
    ${kartuStat(IK_AKTIF, r.aktif, 'Akun aktif')}
    ${kartuStat(IK_MASUK, r.login_hari_ini, 'Login hari ini')}
    ${kartuStat(IK_TUNGGU, r.menunggu, 'Pengajuan menunggu Anda', r.menunggu_lama > 0)}
  </div>`
  const peringatan = r.menunggu_lama > 0
    ? `<div role="alert" class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900"><strong class="font-bold">${esc(r.menunggu_lama)} pengajuan</strong> menunggu persetujuan lebih dari ${esc(h.batas_lama_hari)} hari. Buka menu Persetujuan untuk memprosesnya.</div>`
    : ''
  const tbl = tabel({
    kolom: [
      { judul: 'Nama', isi: 'kiri', html: (u) => `<strong class="text-slate-900">${esc(u.nama)}</strong><span class="block text-xs font-medium text-slate-500">${esc(u.username)}</span>` },
      { judul: 'Status', rata: 'tengah', html: (u) => lencana(u.aktif ? 'Aktif' : 'Nonaktif') },
      { judul: 'Login Terakhir', html: (u) => (u.login_terakhir
        ? `${esc(u.login_terakhir)}${u.login_hari_ini ? ' ' + lencana('Disetujui', 'Hari ini') : ''}`
        : '<span class="text-slate-400">Belum pernah</span>') },
      { judul: 'Aktivitas Terakhir', html: (u) => (u.aktivitas_terakhir
        ? `${esc(namaAksi(u.aktivitas_terakhir.aksi))}<span class="block text-xs font-medium text-slate-500">${esc(u.aktivitas_terakhir.waktu)}</span>`
        : '<span class="text-slate-400">-</span>') },
      { judul: 'Aktivitas 30 Hari', rata: 'angka', nilai: (u) => u.aktivitas_30 },
      { judul: 'Diajukan', rata: 'angka', nilai: (u) => u.diajukan },
      { judul: 'Menunggu', rata: 'tengah', html: (u) => (u.menunggu
        ? lencana('Diajukan', String(u.menunggu)) + (u.menunggu_lama ? ' ' + lencana('Ditolak', u.menunggu_lama + ' lama') : '')
        : '0') },
      { judul: 'Disetujui', rata: 'angka', nilai: (u) => u.disetujui },
      { judul: 'Ditolak', rata: 'angka', nilai: (u) => u.ditolak },
    ],
    baris: h.daftar,
    aksi: () => [{ aksi: 'lihat', label: 'Lihat aktivitas', d: IK_LIHAT, nada: 'biru' }],
    kosong: {
      ikon: IK_ORANG, judul: 'Belum ada Petugas TU',
      teks: 'Administrator dapat menambah akun Petugas TU pada menu Pengguna.',
    },
  })
  return ringkas + peringatan + tbl
}

function bukaAktivitas(h) {
  const d = document.createElement('dialog')
  d.className = 'dlg dlg-staf rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm shadow-2xl'
  const isi = h.daftar.length
    ? `<div class="staf-riwayat">${tabel({
      kolom: [
        { judul: 'Waktu (WITA)', nilai: (l) => l.waktu },
        { judul: 'Aktivitas', html: (l) => `<strong class="text-slate-900 font-bold">${esc(namaAksi(l.aksi))}</strong>` },
        { judul: 'Detail', isi: 'kiri', nilai: (l) => l.detail },
      ],
      baris: h.daftar.map((l, i) => ({ ...l, id: i })),
      kartu: false,
    })}</div>`
    : statusKosong({ ikon: IKON.info, judul: 'Belum ada aktivitas', teks: 'Petugas ini belum tercatat melakukan aktivitas.' })
  d.innerHTML = `<div class="p-6"><h2 class="text-xl font-bold tracking-tight text-slate-900">Aktivitas ${esc(h.nama)}</h2>
    <p class="mt-1 text-sm text-slate-600">${esc(h.username)}. Menampilkan hingga 30 aktivitas terbaru.</p>
    <div class="mt-5">${isi}</div>
    <div class="dlg-aksi mt-6 flex flex-wrap justify-end gap-3"><button type="button" data-tutup class="${KELAS.tombol}">Tutup</button></div></div>`
  document.body.appendChild(d)
  d.addEventListener('click', (e) => { if (e.target.closest('[data-tutup]')) d.close() })
  d.addEventListener('close', () => d.remove(), { once: true })
  d.showModal()
}

export function render(wadah) {
  wadah.innerHTML = judulHalaman({
    judul: 'Staf Tata Usaha',
    sub: 'Pantau aktivitas dan pengajuan mutasi yang dikerjakan Petugas TU.',
  }) + '<div data-isi></div>'
  const isi = wadah.querySelector('[data-isi]')
  let urutan = 0
  let data = null

  async function muat() {
    const saya = ++urutan
    isi.innerHTML = memuat('Memuat data staf...')
    try {
      const hasil = await panggilApi('stafTuDaftar')
      if (saya !== urutan || !isi.isConnected) return
      data = hasil
      isi.innerHTML = tampil(hasil)
    } catch (err) {
      if (saya !== urutan || !isi.isConnected) return
      isi.innerHTML = galatMuat(err.message)
    }
  }

  async function lihat(id, el) {
    if (!id || (el && el.disabled)) return
    try {
      bukaAktivitas(await panggilApi('stafTuAktivitas', { id }))
    } catch (err) {
      isi.insertAdjacentHTML('afterbegin', galatMuat(err.message))
    }
  }

  pasangAksi(wadah, { 'muat-ulang': () => muat(), lihat })
  muat()
}
