import { panggilApi, ambilCache } from '../api.js'
import { esc, KELAS, IKON, judulHalaman, lencana, tabel, pasangAksi } from '../ui.js'
import { formFilterMutasi, pasangFilter, opsiKelas } from '../mutasiFilter.js'
import { sumberMutasi } from '../sumberMutasi.js'
import { renderDetail, pulihkanTerbuka, hapusTerbuka } from '../mutasiDetail.js'

const OPSI_STATUS = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'Diajukan', label: 'Menunggu persetujuan' },
  { nilai: 'Disetujui', label: 'Disetujui' },
  { nilai: 'Ditolak', label: 'Ditolak' },
]

export function render(wadah, pengguna) {
  const kepsek = pengguna.peran === 'kepala_sekolah'
  const filter = { q: '', status: 'Diajukan', kelas_id: '' }
  let kelas = []
  let kelasAda = false
  const sumber = sumberMutasi(filter)
  const PEMILIK = 'persetujuan:' + pengguna.id

  function buka(id, tabAwal = 'data') {
    renderDetail(wadah, { id, pemilik: PEMILIK, tabAwal, hanyaBaca: true, bisaPutuskan: kepsek, onKembali: tampilDaftar })
    window.scrollTo(0, 0)
  }

  function gambarIsi(akar, hasil) {
    akar.querySelector('[data-isi]').innerHTML = `<p class="mb-3 text-sm font-semibold text-slate-500">Jumlah Pengajuan: <strong class="text-slate-900">${esc(hasil.total)}</strong></p>`
      + tabel({
        kolom: [
          { judul: 'Nama Siswa', isi: 'kiri', html: (m) => `<strong class="text-slate-900 font-bold">${esc(m.nama_siswa)}</strong>` },
          { judul: 'Kelas Tujuan', nilai: (m) => m.nama_kelas },
          { judul: 'Tanggal Masuk', nilai: (m) => m.tanggal },
          { judul: 'Sekolah Asal', nilai: (m) => m.sekolah },
          { judul: 'Diajukan Oleh', isi: 'kiri', nilai: (m) => m.diajukan_oleh || '-' },
          { judul: 'Status', di: 'tanda', html: (m) => lencana(m.status) },
          { judul: 'Aksi', rata: 'tengah', di: 'aksi', html: (m) => `<button type="button" data-aksi="buka" data-id="${esc(m.id)}" class="${KELAS.utama} ${KELAS.kecil}">${kepsek ? 'Tinjau Pengajuan' : 'Buka Detail'}</button>` },
        ],
        baris: hasil.daftar,
        kosong: { ikon: IKON.info, judul: 'Tidak ada pengajuan persetujuan' },
      })
  }

  const muatIsi = (akar) => sumber.muat(akar.querySelector('[data-isi]'), (hasil) => gambarIsi(akar, hasil))
  const saringIsi = (akar) => sumber.saring(akar.querySelector('[data-isi]'), (hasil) => gambarIsi(akar, hasil))

  function tampilDaftar() {
    hapusTerbuka()
    const akar = document.createElement('div')
    wadah.innerHTML = ''
    wadah.appendChild(akar)
    const kelasCache = ambilCache('kelas')
    if (kelasCache) { kelas = kelasCache; kelasAda = true }
    akar.innerHTML = judulHalaman({ judul: 'Persetujuan Siswa Masuk', sub: 'Tinjau berkas pengajuan mutasi siswa, lalu setujui atau tolak.' })
      + formFilterMutasi(filter, kelas, OPSI_STATUS, false) + '<div data-isi></div>'
    pasangAksi(akar, { buka: (id) => buka(id), 'muat-ulang': () => muatIsi(akar) })
    pasangFilter(akar.querySelector('[data-filter]'), filter, () => saringIsi(akar))
    muatIsi(akar)

    if (!kelasAda) {
      panggilApi('kelasDaftar').then((k) => {
        kelas = k
        kelasAda = true
        const sel = akar.isConnected && akar.querySelector('[name="kelas_id"]')
        if (sel) sel.innerHTML = opsiKelas(kelas, filter.kelas_id)
      }).catch(() => {})
    }
    window.scrollTo(0, 0)
  }

  const tersimpan = pulihkanTerbuka(PEMILIK)
  let langsung = ''
  try { langsung = sessionStorage.getItem('sim_buka_mutasi') || ''; sessionStorage.removeItem('sim_buka_mutasi') } catch {  }
  if (langsung) buka(langsung)
  else if (tersimpan) buka(tersimpan.id, tersimpan.tab)
  else tampilDaftar()
}