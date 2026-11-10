import { panggilApi } from '../api.js'
import { esc, KELAS, IKON, memuat, judulHalaman, lencana, tabel, galatMuat, pasangAksi, tandaiMemuat } from '../ui.js'
import { formFilterMutasi, pasangFilter, opsiKelas } from '../mutasiFilter.js'
import { renderForm } from '../mutasiForm.js'
import { renderDetail, pulihkanTerbuka, hapusTerbuka } from '../mutasiDetail.js'
import { bukaImporMutasiArsip } from '../imporMutasiArsip.js'

const OPSI_STATUS = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'Draft', label: 'Draft' },
  { nilai: 'Diajukan', label: 'Diajukan' },
  { nilai: 'Disetujui', label: 'Disetujui' },
  { nilai: 'Ditolak', label: 'Ditolak' },
]

export function render(wadah, pengguna) {
  const peran = pengguna.peran
  const admin = peran === 'admin'
  const bisaTulis = admin || peran === 'petugas_tu'
  const filter = { q: '', status: '', kelas_id: '', dari: '', sampai: '' }
  let kelas = []
  let kelasAda = false
  let urutan = 0
  const PEMILIK = 'siswaMasuk:' + pengguna.id

  function bukaForm(id) {
    renderForm(wadah, {
      id,
      onSelesai: (idBaru) => (idBaru ? bukaDetail(idBaru) : tampilDaftar()),
    })
    window.scrollTo(0, 0)
  }

  function bukaDetail(id, tabAwal = 'data') {
    renderDetail(wadah, {
      id,
      pemilik: PEMILIK,
      tabAwal,
      hanyaBaca: !bisaTulis,
      bisaBatalkan: admin,
      bisaHapusMutasi: admin,
      bisaUbahNomor: bisaTulis,
      onKembali: tampilDaftar,
      onUbah: () => bukaForm(id),
    })
    window.scrollTo(0, 0)
  }

  function gambarIsi(akar, hasil) {
    akar.querySelector('[data-isi]').innerHTML = `<p class="mb-3 text-sm font-semibold text-slate-500">Total Data: <strong class="text-slate-900">${esc(hasil.total)}</strong>${hasil.dipotong ? ' (ditampilkan 300 pertama)' : ''}</p>`
      + tabel({
        kolom: [
          { judul: 'Nama Siswa', isi: 'kiri', html: (m) => `<strong class="text-slate-900 font-bold">${esc(m.nama_siswa)}</strong>${m.sumber === 'arsip' ? ' <span class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">Arsip</span>' : ''}` },
          { judul: 'Kelas', nilai: (m) => m.nama_kelas },
          { judul: 'Tanggal Masuk', nilai: (m) => m.tanggal },
          { judul: 'Sekolah Asal', isi: 'kiri', nilai: (m) => m.sekolah },
          { judul: 'Lampiran', rata: 'angka', nilai: (m) => m.jumlah_lampiran },
          { judul: 'Status', di: 'tanda', html: (m) => lencana(m.status) },
          { judul: 'Aksi', rata: 'tengah', di: 'aksi', html: (m) => `<button type="button" data-aksi="buka" data-id="${esc(m.id)}" class="${KELAS.tombol} ${KELAS.kecil}">Buka Detail</button>` },
        ],
        baris: hasil.daftar,
        kosong: { ikon: IKON.info, judul: 'Belum ada data siswa masuk' },
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
    akar.innerHTML = judulHalaman({
      judul: 'Data Siswa Masuk',
      sub: bisaTulis
        ? 'Catat siswa pindahan, lengkapi dokumen, lalu ajukan ke Kepala Sekolah.'
        : 'Pantau data siswa masuk. Keputusan persetujuan ada di menu Persetujuan.',
      aksi: (admin ? `<button type="button" data-aksi="impor-arsip" class="${KELAS.tombol}">Impor Arsip</button>` : '')
        + (bisaTulis ? `<button type="button" data-aksi="tambah" class="${KELAS.utama}">Tambah Siswa Masuk</button>` : ''),
    }) + formFilterMutasi(filter, kelas, OPSI_STATUS) + '<div data-isi></div>'
    pasangAksi(akar, {
      tambah: () => { if (bisaTulis) bukaForm('') },
      'impor-arsip': () => {
        if (admin) bukaImporMutasiArsip({ onSelesai: () => { if (akar.isConnected) muatIsi(akar) } })
      },
      buka: (id) => bukaDetail(id),
      'muat-ulang': () => muatIsi(akar),
    })
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
  if (tersimpan) bukaDetail(tersimpan.id, tersimpan.tab)
  else tampilDaftar()
}
