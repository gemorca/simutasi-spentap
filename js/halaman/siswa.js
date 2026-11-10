import { panggilApi } from '../api.js'
import {
  esc, KELAS, IKON, memuat, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm, barSimpan, sibukSimpan,
  galatMuat, tabel, lencana, isiUlang, pasangAksi, pilihanMassal, barAlat, barAksiBawah, ringkasanMassal,
  dialogKonfirmasi, tampilPesan, notif, tunda, tandaiMemuat, namaJenisKelamin,
} from '../ui.js'
import { periksa, wajib } from '../validasi.js'
import { bukaImporSiswa } from '../imporSiswa.js'

const IK_ORANG = 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'
const IK_LIHAT = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
const SATUAN = 'siswa'
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function tanggalLengkap(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t || ''))
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return String(t || '').trim()
  return `${m[3]} ${BULAN[Number(m[2]) - 1]} ${m[1]}`
}

const butirBio = (label, nilai, { penuh = false, lipat = false } = {}) =>
  `<div class="grid content-start gap-1${penuh ? ' sm:col-span-2' : ''}">
    <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">${esc(label)}</dt>
    <dd class="text-sm font-semibold text-slate-900${lipat ? ' whitespace-pre-line break-words' : ''}">${esc(String(nilai || '').trim() || '-')}</dd></div>`

const bagianBio = (judul, isi) =>
  `<section class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
    <h3 class="mb-5 text-base font-bold text-slate-900">${esc(judul)}</h3>
    <dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">${isi}</dl></section>`
const KOLOM_FORM = ['nisn_nis', 'nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'kelas_id', 'alamat', 'nama_ayah', 'nama_ibu']
const ATURAN = {
  nama: [wajib('Nama lengkap wajib diisi')],
  jenis_kelamin: [wajib('Pilih jenis kelamin')],
  kelas_id: [wajib('Pilih kelas')],
}

export function render(wadah, pengguna) {
  const admin = pengguna.peran === 'admin'
  const bisaTambah = admin || pengguna.peran === 'petugas_tu'
  const hanyaBaca = !admin
  let hasil = { total: 0, dipotong: false, daftar: [] }
  let kelas = []
  let filter = { q: '', kelas_id: '' }
  let sibuk = false
  let layar = 0
  let urutanCari = 0
  const pilihan = pilihanMassal()

  const idStr = (s) => String(s.id)
  const cari = (id) => hasil.daftar.find((s) => idStr(s) === String(id))

  const judul = (dengan) => judulHalaman({
    judul: 'Data Siswa Aktif',
    sub: admin
      ? 'Kelola data siswa aktif sekolah.'
      : bisaTambah ? 'Tambah atau impor siswa baru. Ubah dan hapus data khusus Administrator.' : 'Daftar seluruh siswa aktif (mode lihat).',
    aksi: dengan && bisaTambah
      ? `<button type="button" data-aksi="impor" class="${KELAS.tombol}">Impor Excel/CSV</button><button type="button" data-aksi="tambah" class="${KELAS.utama}">Tambah Siswa</button>`
      : '',
  })

  function formFilter() {
    const opsi = kelas.map((k) =>
      `<option value="${esc(k.id)}"${String(k.id) === String(filter.kelas_id) ? ' selected' : ''}>${esc(k.nama_kelas + ' - ' + k.tahun_ajaran)}</option>`).join('')
    return `<form data-filter role="search" class="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <label class="grid min-w-[12rem] flex-1 gap-1.5 text-sm font-semibold text-slate-800">Cari siswa
        <input name="q" value="${esc(filter.q)}" placeholder="Nama atau NISN/NIS" autocomplete="off" class="${KELAS.input} font-normal"></label>
      <label class="grid gap-1.5 text-sm font-semibold text-slate-800">Filter Kelas
        <select name="kelas_id" class="${KELAS.kontrol} font-normal"><option value="">Semua kelas</option>${opsi}</select></label></form>`
  }

  function gambarIsi() {
    const isi = wadah.querySelector('[data-isi]')
    if (!isi) return
    const ringkas = `<p class="mb-3 text-sm font-semibold text-slate-500">Total Data: <strong class="text-slate-900">${esc(hasil.total)}</strong> siswa${hasil.dipotong ? ' (ditampilkan 300 pertama, persempit pencarian)' : ''}</p>`
    isiUlang(isi,
      ringkas
      + (hanyaBaca ? '' : barAlat({ pilihan, total: hasil.daftar.length, satuan: SATUAN, sibuk }))
      + tabel({
        kolom: [
          { judul: 'NISN/NIS', nilai: (s) => s.nisn_nis || '-' },
          { judul: 'Nama Lengkap', isi: 'kiri', html: (s) => `<strong class="text-slate-900 font-bold">${esc(s.nama)}</strong>` },
          { judul: 'Jenis Kelamin', rata: 'tengah', nilai: (s) => namaJenisKelamin(s.jenis_kelamin) },
          { judul: 'Kelas', nilai: (s) => s.nama_kelas },
          { judul: 'Status', rata: 'tengah', html: (s) => lencana(s.status) },
        ],
        baris: hasil.daftar,
        aksi: () => [
          { aksi: 'detail', label: 'Lihat detail', d: IK_LIHAT },
          ...(hanyaBaca ? [] : [
            { aksi: 'ubah', label: 'Ubah', d: IKON.ubah },
            { aksi: 'hapus', label: 'Hapus', d: IKON.hapus, bahaya: true },
          ]),
        ],
        pilih: hanyaBaca ? null : {
          aktif: pilihan.aktif,
          ada: (id) => pilihan.ada(String(id)),
          semua: pilihan.semuaDipilih,
          sebagian: pilihan.sebagian,
          label: (s) => 'Pilih siswa ' + s.nama,
        },
        kosong: {
          ikon: IK_ORANG, judul: 'Tidak ada siswa ditemukan',
          teks: bisaTambah
            ? 'Ubah kata kunci atau pilih kelas lain. Siswa baru bisa ditambah lewat tombol Tambah Siswa atau Impor Excel/CSV.'
            : 'Ubah kata kunci atau pilih kelas lain.',
        },
      })
      + (hanyaBaca ? '' : barAksiBawah({ pilihan, satuan: SATUAN, sibuk })))
  }

  async function ambil(semua) {
    const [siswa, daftarKelas] = await Promise.all([
      panggilApi('siswaDaftar', filter),
      semua ? panggilApi('kelasDaftar') : Promise.resolve(kelas),
    ])
    hasil = siswa
    kelas = daftarKelas
    pilihan.setDaftar(hasil.daftar.map(idStr))
  }

  async function muatIsi(semua = false, senyap = false) {
    const id = layar
    const saya = ++urutanCari
    const isi = wadah.querySelector('[data-isi]')
    if (senyap && isi.firstElementChild) tandaiMemuat(isi, true)
    else isi.innerHTML = memuat()
    try {
      await ambil(semua)
      if (id !== layar || saya !== urutanCari || !wadah.isConnected) return
      gambarIsi()
    } catch (err) {
      if (id !== layar || saya !== urutanCari || !wadah.isConnected) return
      isi.innerHTML = galatMuat(err.message)
    } finally {
      if (saya === urutanCari) tandaiMemuat(isi, false)
    }
  }

  async function tampilDaftar(segar = true) {
    const id = ++layar
    pilihan.selesai()
    sibuk = false
    pasangAksi(wadah, PETA_DAFTAR)
    if (segar) {
      wadah.innerHTML = judul(false) + '<div data-isi></div>'
      const saya = ++urutanCari
      const isi = wadah.querySelector('[data-isi]')
      isi.innerHTML = memuat()
      try {
        await ambil(true)
      } catch (err) {
        if (id !== layar || saya !== urutanCari || !wadah.isConnected) return
        isi.innerHTML = galatMuat(err.message)
        return
      }
      if (id !== layar || saya !== urutanCari || !wadah.isConnected) return
    }
    wadah.innerHTML = judul(true) + formFilter() + '<div data-isi></div>'
    const form = wadah.querySelector('[data-filter]')
    const baca = () => { filter = { q: form.elements.q.value, kelas_id: form.elements.kelas_id.value } }
    let terakhir = JSON.stringify(filter)
    const terapkan = () => {
      baca()
      const tanda = JSON.stringify(filter)
      if (tanda === terakhir) return
      terakhir = tanda
      pilihan.selesai()
      muatIsi(false, true)
    }
    const tundaCari = tunda(terapkan, 400)
    form.addEventListener('input', (e) => { baca(); if (e.target.name === 'q') tundaCari() })
    form.addEventListener('change', terapkan)
    form.addEventListener('submit', (e) => { e.preventDefault(); terapkan() })
    gambarIsi()
  }

  async function hapus(s) {
    if (!s) return
    const ya = await dialogKonfirmasi({
      judul: 'Hapus siswa permanen?',
      pesan: 'Siswa ' + s.nama + ' akan dihapus permanen. Data tidak dapat dikembalikan.',
      ya: 'Hapus permanen',
      bahaya: true,
    })
    if (!ya || !wadah.isConnected) return
    try {
      await panggilApi('siswaHapus', { id: s.id })
      tampilPesan({ jenis: 'sukses', teks: 'Data siswa berhasil dihapus' })
      if (wadah.isConnected) muatIsi(true)
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  async function hapusTerpilih() {
    const n = pilihan.jumlah
    if (!n || sibuk) return
    const ya = await dialogKonfirmasi({
      judul: 'Hapus ' + n + ' siswa permanen?',
      pesan: n + ' siswa terpilih akan dihapus permanen. Data tidak dapat dikembalikan.',
      ya: 'Hapus ' + n + ' siswa',
      bahaya: true,
    })
    if (!ya || !wadah.isConnected) return
    sibuk = true
    gambarIsi()
    try {
      const ids = pilihan.daftarId.map((id) => (cari(id) || {}).id)
      const res = await panggilApi('siswaBulkDestroy', { ids })
      tampilPesan(ringkasanMassal(res, SATUAN))
      pilihan.selesai()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
    sibuk = false
    if (wadah.isConnected) muatIsi(true)
  }

  const PETA_DAFTAR = {
    tambah: () => tampilForm(null),
    impor: () => {
      if (!bisaTambah) return
      bukaImporSiswa({ onSelesai: () => { if (wadah.isConnected) tampilDaftar(true) } })
    },
    detail: (id) => { const s = cari(id); if (s) tampilDetail(s) },
    ubah: async (id) => {
      const s = cari(id)
      if (!s || !admin) return
      const saat = layar
      try {
        const detail = await panggilApi('siswaDetail', { id: s.id })
        if (saat !== layar || !wadah.isConnected) return
        tampilForm({ ...s, ...detail })
      } catch (err) {
        if (saat === layar && wadah.isConnected) tampilPesan({ jenis: 'galat', teks: err.message })
      }
    },
    hapus: (id) => hapus(cari(id)),
    'mulai-pilih': () => { pilihan.mulai(); gambarIsi() },
    'selesai-pilih': () => { pilihan.selesai(); gambarIsi() },
    'pilih-semua': () => { pilihan.balikSemua(); gambarIsi() },
    pilih: (id) => { pilihan.balik(id); gambarIsi() },
    'hapus-terpilih': hapusTerpilih,
    'muat-ulang': () => tampilDaftar(true),
  }

  async function tampilDetail(s) {
    const id = ++layar
    pilihan.selesai()
    sibuk = false
    const judulDetail = (aksiTambahan = '') => judulHalaman({
      judul: 'Biodata Siswa',
      sub: s.nama,
      aksi: aksiTambahan + `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Kembali</button>`,
    })
    wadah.innerHTML = judulDetail() + memuat()
    window.scrollTo(0, 0)
    pasangAksi(wadah, { kembali: () => tampilDaftar(false) })

    let d
    try {
      d = await panggilApi('siswaDetail', { id: s.id })
    } catch (err) {
      if (id !== layar || !wadah.isConnected) return
      wadah.innerHTML = judulDetail() + galatMuat(err.message)
      return
    }
    if (id !== layar || !wadah.isConnected) return

    const kelasTeks = d.nama_kelas ? d.nama_kelas + (d.tahun_ajaran ? ' - ' + d.tahun_ajaran : '') : ''
    const ttl = [d.tempat_lahir, tanggalLengkap(d.tanggal_lahir)].filter(Boolean).join(', ')
    wadah.innerHTML = judulDetail(admin
      ? `<button type="button" data-aksi="ubah-detail" class="${KELAS.utama}">Ubah</button>` : '')
      + `<div class="grid gap-6">`
      + bagianBio('Data Pribadi',
        butirBio('Nama lengkap', d.nama)
        + butirBio('NISN / NIS', d.nisn_nis)
        + butirBio('Jenis kelamin', namaJenisKelamin(d.jenis_kelamin))
        + butirBio('Tempat, tanggal lahir', ttl))
      + bagianBio('Data Sekolah',
        butirBio('Kelas', kelasTeks)
        + `<div class="grid content-start gap-1"><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt><dd>${lencana(d.status)}</dd></div>`
        + butirBio('Terdaftar pada', tanggalLengkap(d.dibuat_pada)))
      + bagianBio('Alamat dan Orang Tua',
        butirBio('Alamat', d.alamat, { penuh: true, lipat: true })
        + butirBio('Nama ayah', d.nama_ayah)
        + butirBio('Nama ibu', d.nama_ibu))
      + `</div>`
    pasangAksi(wadah, {
      kembali: () => tampilDaftar(false),
      'ubah-detail': () => tampilForm(d),
    })
  }

  function tampilForm(s) {
    if (!bisaTambah || (s && !admin)) return
    const id = ++layar
    const ubah = Boolean(s)
    const n = ubah
      ? {
        nisn_nis: s.nisn_nis || '', nama: s.nama, jenis_kelamin: s.jenis_kelamin,
        tempat_lahir: s.tempat_lahir || '', tanggal_lahir: s.tanggal_lahir || '', kelas_id: s.kelas_id,
        alamat: s.alamat || '', nama_ayah: s.nama_ayah || '', nama_ibu: s.nama_ibu || '',
      }
      : {
        nisn_nis: '', nama: '', jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '', kelas_id: '',
        alamat: '', nama_ayah: '', nama_ibu: '',
      }

    wadah.innerHTML = judulHalaman({
      judul: ubah ? 'Ubah Data Siswa' : 'Tambah Siswa Aktif Baru',
      sub: ubah ? 'Perbarui data siswa, lalu simpan.' : 'Isi data siswa baru, lalu simpan.',
      aksi: `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Kembali</button>`,
    }) + `<form novalidate class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div class="grid gap-5 sm:grid-cols-2">
        ${medan({ label: 'NISN / NIS', nama: 'nisn_nis', nilai: n.nisn_nis, catatan: 'Boleh dikosongkan.', placeholder: 'Contoh: 0012345678', atribut: { inputmode: 'numeric', autocomplete: 'off' } })}
        ${medan({ label: 'Nama Lengkap', nama: 'nama', nilai: n.nama, wajib: true, placeholder: 'Nama lengkap siswa', atribut: { autocomplete: 'off' } })}
        ${medan({
          label: 'Jenis kelamin', nama: 'jenis_kelamin', nilai: n.jenis_kelamin, wajib: true, placeholder: 'Pilih jenis kelamin',
          pilihan: [{ nilai: 'L', label: 'Laki-laki' }, { nilai: 'P', label: 'Perempuan' }],
        })}
        ${medan({
          label: 'Kelas', nama: 'kelas_id', nilai: n.kelas_id, wajib: true, placeholder: 'Pilih kelas',
          pilihan: kelas.map((k) => ({ nilai: k.id, label: k.nama_kelas + ' - ' + k.tahun_ajaran + ' (sisa ' + k.sisa + ')' })),
        })}
        ${medan({ label: 'Tempat lahir', nama: 'tempat_lahir', nilai: n.tempat_lahir, placeholder: 'Contoh: Manado', atribut: { autocomplete: 'off' } })}
        ${medan({ label: 'Tanggal lahir', nama: 'tanggal_lahir', nilai: n.tanggal_lahir, tipe: 'date' })}
        ${medan({ label: 'Alamat', nama: 'alamat', nilai: n.alamat, tipe: 'textarea', baris: 3, penuh: true, catatan: 'Boleh dikosongkan. Maksimal 300 karakter.', placeholder: 'Alamat lengkap siswa', atribut: { maxlength: 300 } })}
        ${medan({ label: 'Nama ayah', nama: 'nama_ayah', nilai: n.nama_ayah, placeholder: 'Nama lengkap ayah', atribut: { maxlength: 100, autocomplete: 'off' } })}
        ${medan({ label: 'Nama ibu', nama: 'nama_ibu', nilai: n.nama_ibu, placeholder: 'Nama lengkap ibu', atribut: { maxlength: 100, autocomplete: 'off' } })}
      </div>${barSimpan()}</form>`
    window.scrollTo(0, 0)
    pasangAksi(wadah, { kembali: () => tampilDaftar(false) })

    const form = wadah.querySelector('form')
    form.addEventListener('input', (e) => { if (e.target.name) bersihkanGalat(form, e.target.name) })
    form.addEventListener('change', (e) => { if (e.target.name) bersihkanGalat(form, e.target.name) })
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (form.querySelector('[data-simpan]').disabled) return
      const isian = bacaForm(form, KOLOM_FORM)
      const galat = periksa(isian, ATURAN)
      if (Object.keys(galat).length) { tandaiGalat(form, galat); notif.kolomGalat(); return }
      sibukSimpan(form, true)
      try {
        await panggilApi('siswaSimpan', { id: ubah ? s.id : '', ...isian })
        tampilPesan({ jenis: 'sukses', teks: ubah ? 'Data siswa berhasil diperbarui' : 'Siswa baru berhasil ditambahkan' })
        if (id !== layar || !wadah.isConnected) return
        tampilDaftar(true)
      } catch (err) {
        if (id !== layar || !wadah.isConnected) return
        sibukSimpan(form, false)
        tampilPesan({ jenis: 'galat', teks: err.message })
      }
    })
    const pertama = form.querySelector('input:not(:disabled), select:not(:disabled)')
    if (pertama) pertama.focus()
  }

  tampilDaftar(true)
}
