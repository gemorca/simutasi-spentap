import { panggilApi } from '../api.js'
import { esc, KELAS, IKON, memuat, judulHalaman, lencana, tabel, galatMuat, pasangAksi, tandaiMemuat } from '../ui.js'
import { formFilterMutasi, pasangFilter, opsiKelas } from '../mutasiFilter.js'
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
  let urutan = 0
  const PEMILIK = 'persetujuan:' + pengguna.id

  function buka(id, tabAwal = 'data') {
    renderDetail(wadah, { id, pemilik: PEMILIK, tabAwal, hanyaBaca: true, bisaPutuskan: kepsek, onKembali: tampilDaftar })
    window.scrollTo(0, 0)
  }

  function gambarIsi(akar, hasil) {
    akar.querySelector('[data-isi]').innerHTML = `<p class="mb-3 text-sm font-semibold text-slate-500">Jumlah Pengajuan: <strong class="text-slate-900">${esc(hasil.total)}</strong></p>`
      + tabel({
        kolom: [
          { judul: 'Nama Siswa', html: (m) => `<strong class="text-slate-900 font-bold">${esc(m.nama_siswa)}</strong>` },
          { judul: 'Kelas Tujuan', nilai: (m) => m.nama_kelas },
          { judul: 'Tanggal Masuk', nilai: (m) => m.tanggal },
          { judul: 'Sekolah Asal', nilai: (m) => m.sekolah },
          { judul: 'Diajukan Oleh', nilai: (m) => m.diajukan_oleh || '-' },
          { judul: 'Status', di: 'tanda', html: (m) => lencana(m.status) },
          { judul: 'Aksi', rata: 'tengah', di: 'aksi', html: (m) => `<button type="button" data-aksi="buka" data-id="${esc(m.id)}" class="${KELAS.utama} ${KELAS.kecil}">${kepsek ? 'Tinjau Pengajuan' : 'Buka Detail'}</button>` },
        ],
        baris: hasil.daftar,
        kosong: { ikon: IKON.info, judul: 'Tidak ada pengajuan persetujuan' },
      })
  }

  async function muatIsi(akar, senyap = false) {
    const saya = ++urutan
    const isi = akar.querySelector('[data-isi]')
    if (senyap && isi.firstElementChild) tandaiMemuat(isi, true)
    else isi.innerHTML = memuat()
    try {
      const hasil = await panggilApi('mutasiDaftar', filter)
      if (saya !== urutan || !akar.isConnected) return
      gambarIsi(akar, hasil)
    } catch (err) {
      if (saya !== urutan || !akar.isConnected) return
      isi.innerHTML = galatMuat(err.message)
    } finally {
      if (saya === urutan) tandaiMemuat(isi, false)
    }
  }

  function tampilDaftar() {
    hapusTerbuka()
    const akar = document.createElement('div')
    wadah.innerHTML = ''
    wadah.appendChild(akar)
    akar.innerHTML = judulHalaman({ judul: 'Persetujuan Siswa Masuk', sub: 'Tinjau berkas pengajuan mutasi siswa, lalu setujui atau tolak.' })
      + formFilterMutasi(filter, kelas, OPSI_STATUS, false) + '<div data-isi></div>'
    pasangAksi(akar, { buka: (id) => buka(id), 'muat-ulang': () => muatIsi(akar) })
    pasangFilter(akar.querySelector('[data-filter]'), filter, () => muatIsi(akar, true))
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
  try { langsung = sessionStorage.getItem('sim_buka_mutasi') || ''; sessionStorage.removeItem('sim_buka_mutasi') } catch { /* abaikan */ }
  if (langsung) buka(langsung)
  else if (tersimpan) buka(tersimpan.id, tersimpan.tab)
  else tampilDaftar()
}