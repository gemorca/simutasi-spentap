import { panggilApi } from '../api.js'
import {
  esc, KELAS, IKON, memuat, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm, barSimpan, sibukSimpan,
  galatMuat, tabel, lencana, isiUlang, pasangAksi, pilihanMassal, barAlat, barAksiBawah, ringkasanMassal,
  dialogKonfirmasi, dialogPasswordBaru, tampilPesan, notif, spinner,
} from '../ui.js'
import { NAMA_PERAN } from '../menu.js'
import { periksa, wajib, minPanjang } from '../validasi.js'

const IK_ORANG = 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'
const SATUAN = 'pengguna'

const POLA_USERNAME = /^[a-z0-9._-]{3,30}$/
const cekUsername = (v) => (POLA_USERNAME.test(String(v).trim().toLowerCase())
  ? '' : 'Username 3-30 karakter: huruf kecil, angka, titik, strip, garis bawah')
const ATURAN_DASAR = {
  nama: [wajib('Nama wajib diisi')],
  username: [wajib('Username wajib diisi'), cekUsername],
  peran: [wajib('Pilih peran')],
}
const ATURAN_BARU = {
  nama: ATURAN_DASAR.nama,
  username: ATURAN_DASAR.username,
  password: [wajib('Password awal wajib diisi'), minPanjang(8, 'Password minimal 8 karakter')],
  peran: ATURAN_DASAR.peran,
}
const PILIHAN_PERAN = Object.keys(NAMA_PERAN).map((p) => ({ nilai: p, label: NAMA_PERAN[p] }))

export function render(wadah, saya) {
  let daftar = []
  let sibuk = false
  let layar = 0
  const pilihan = pilihanMassal()

  const idStr = (u) => String(u.id)
  const cari = (id) => daftar.find((u) => idStr(u) === String(id))
  const sendiri = (u) => idStr(u) === String(saya.id)
  const bisaDipilih = () => daftar.filter((u) => !sendiri(u))

  function gambarIsi() {
    const isi = wadah.querySelector('[data-isi]')
    if (!isi) return
    isiUlang(isi,
      barAlat({ pilihan, total: bisaDipilih().length, satuan: SATUAN, sibuk })
      + tabel({
        kolom: [
          { judul: 'Nama', isi: 'kiri', html: (u) => `<strong class="text-slate-900">${esc(u.nama)}</strong>` },
          { judul: 'Username', nilai: (u) => u.username },
          { judul: 'Peran', nilai: (u) => NAMA_PERAN[u.peran] || u.peran },
          { judul: 'Status', rata: 'tengah', html: (u) => lencana(u.aktif ? 'Aktif' : 'Nonaktif') },
        ],
        baris: daftar,
        aksi: (u) => [
          { aksi: 'ubah', label: 'Edit', d: IKON.ubah, nada: 'biru' },
          { aksi: 'reset', label: 'Reset Password', d: IKON.kunci, nada: 'amber' },
          sendiri(u)
            ? { aksi: 'hapus', label: 'Akun sendiri tidak dapat dihapus', d: IKON.hapus, bahaya: true, nonaktif: true }
            : { aksi: 'hapus', label: 'Hapus', d: IKON.hapus, bahaya: true },
        ],
        pilih: {
          aktif: pilihan.aktif,
          ada: (id) => pilihan.ada(String(id)),
          semua: pilihan.semuaDipilih,
          sebagian: pilihan.sebagian,
          label: (u) => (sendiri(u) ? 'Akun sendiri tidak dapat dihapus' : 'Pilih pengguna ' + u.username),
          nonaktif: sendiri,
        },
        kosong: {
          ikon: IK_ORANG, judul: 'Belum ada pengguna',
          teks: 'Buat akun Administrator, Petugas TU, atau Kepala Sekolah lewat tombol Tambah Pengguna.',
        },
      })
      + barAksiBawah({ pilihan, satuan: SATUAN, sibuk }))
  }

  async function muat() {
    const id = layar
    const isi = wadah.querySelector('[data-isi]')
    isi.innerHTML = memuat()
    try {
      const hasil = await panggilApi('penggunaDaftar')
      if (id !== layar || !wadah.isConnected) return
      daftar = hasil
      pilihan.setDaftar(bisaDipilih().map(idStr))
      gambarIsi()
    } catch (err) {
      if (id !== layar || !wadah.isConnected) return
      isi.innerHTML = galatMuat(err.message)
    }
  }

  function tampilDaftar(segar = true) {
    layar++
    pilihan.selesai()
    sibuk = false
    wadah.innerHTML = judulHalaman({
      judul: 'Kelola Pengguna',
      sub: 'Manajemen akun Administrator, Petugas TU, dan Kepala Sekolah.',
      aksi: `<button type="button" data-aksi="tambah" class="${KELAS.utama}">+ Tambah Pengguna</button>`,
    }) + '<div data-isi></div>'
    pasangAksi(wadah, PETA_DAFTAR)
    if (segar) return muat()
    gambarIsi()
  }

  function sibukTombol(el, sibuk) {
    if (!el || !el.isConnected) return
    if (sibuk) { el.dataset.html = el.innerHTML; el.innerHTML = spinner('h-[18px] w-[18px]'); el.disabled = true }
    else { el.innerHTML = el.dataset.html || el.innerHTML; el.disabled = false }
  }

  async function hapus(u, el) {
    if (!u || sendiri(u)) return
    const ya = await dialogKonfirmasi({
      judul: 'Hapus pengguna?',
      pesan: 'Akun ' + u.username + ' akan dihapus permanen dan tidak bisa login lagi. Data tidak dapat dikembalikan.',
      ya: 'Hapus',
      bahaya: true,
    })
    if (!ya || !wadah.isConnected) return
    sibukTombol(el, true)
    try {
      await panggilApi('penggunaHapus', { id: u.id })
      tampilPesan({ jenis: 'sukses', teks: 'Pengguna ' + u.username + ' dihapus' })
      if (wadah.isConnected) muat()
    } catch (err) {
      sibukTombol(el, false)
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  async function reset(u, el) {
    if (!u) return
    const ya = await dialogKonfirmasi({
      judul: 'Reset password?',
      pesan: 'Password ' + u.username + ' akan diganti dengan password baru yang dibuat otomatis.',
      ya: 'Reset password',
    })
    if (!ya) return
    sibukTombol(el, true)
    try {
      const hasil = await panggilApi('penggunaResetPassword', { id: u.id })
      sibukTombol(el, false)
      await dialogPasswordBaru({ username: hasil.username, password: hasil.passwordBaru })
    } catch (err) {
      sibukTombol(el, false)
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  async function hapusTerpilih() {
    const n = pilihan.jumlah
    if (!n || sibuk) return
    const ya = await dialogKonfirmasi({
      judul: 'Hapus ' + n + ' pengguna?',
      pesan: 'Akun terpilih akan dihapus permanen dan tidak bisa login lagi. Data tidak dapat dikembalikan.',
      ya: 'Hapus ' + n + ' pengguna',
      bahaya: true,
    })
    if (!ya || !wadah.isConnected) return
    sibuk = true
    gambarIsi()
    try {
      const ids = pilihan.daftarId.map((id) => (cari(id) || {}).id)
      const hasil = await panggilApi('penggunaBulkDestroy', { ids })
      tampilPesan(ringkasanMassal(hasil, SATUAN))
      pilihan.selesai()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
    sibuk = false
    if (wadah.isConnected) muat()
  }

  const PETA_DAFTAR = {
    tambah: () => tampilForm(null),
    ubah: (id) => { const u = cari(id); if (u) tampilForm(u) },
    reset: (id, el) => reset(cari(id), el),
    hapus: (id, el) => hapus(cari(id), el),
    'mulai-pilih': () => { pilihan.mulai(); gambarIsi() },
    'selesai-pilih': () => { pilihan.selesai(); gambarIsi() },
    'pilih-semua': () => { pilihan.balikSemua(); gambarIsi() },
    pilih: (id) => { pilihan.balik(id); gambarIsi() },
    'hapus-terpilih': hapusTerpilih,
    'muat-ulang': () => muat(),
  }

  function tampilForm(u) {
    const id = ++layar
    const ubah = Boolean(u)
    const nilai = ubah ? { nama: u.nama, username: u.username, peran: u.peran } : { nama: '', username: '', peran: '' }

    wadah.innerHTML = judulHalaman({
      judul: ubah ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru',
      sub: ubah ? 'Perbarui nama, username, dan peran akun.' : 'Buat akun baru untuk Administrator, Petugas TU, atau Kepala Sekolah.',
      aksi: `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Kembali</button>`,
    }) + `<form novalidate class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div class="grid gap-5 sm:grid-cols-2">
        ${medan({ label: 'Nama Lengkap', nama: 'nama', nilai: nilai.nama, wajib: true, placeholder: 'Nama lengkap', atribut: { autocomplete: 'off' } })}
        ${medan({
          label: 'Username', nama: 'username', nilai: nilai.username, wajib: true,
          catatan: 'Huruf kecil, angka, titik, strip, garis bawah (3-30 karakter).', placeholder: 'Contoh: petugas.tu',
          atribut: { autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false' },
        })}
        ${ubah ? '' : medan({
          label: 'Password awal', nama: 'password', tipe: 'password', wajib: true, catatan: 'Minimal 8 karakter.',
          placeholder: 'Minimal 8 karakter', atribut: { autocomplete: 'new-password' },
        })}
        ${medan({ label: 'Peran Akun', nama: 'peran', nilai: nilai.peran, wajib: true, pilihan: PILIHAN_PERAN, placeholder: 'Pilih peran' })}
      </div>${barSimpan()}</form>`
    window.scrollTo(0, 0)
    pasangAksi(wadah, { kembali: () => tampilDaftar(false) })

    const form = wadah.querySelector('form')
    form.addEventListener('input', (e) => { if (e.target.name) bersihkanGalat(form, e.target.name) })
    form.addEventListener('change', (e) => { if (e.target.name) bersihkanGalat(form, e.target.name) })
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (form.querySelector('[data-simpan]').disabled) return
      const isian = bacaForm(form, ['nama', 'username', 'password', 'peran'])
      isian.username = isian.username.trim().toLowerCase()
      const galat = periksa(isian, ubah ? ATURAN_DASAR : ATURAN_BARU)
      if (Object.keys(galat).length) { tandaiGalat(form, galat); notif.kolomGalat(); return }
      sibukSimpan(form, true)
      try {
        const hasil = await panggilApi('penggunaSimpan', { id: ubah ? u.id : '', ...isian })
        tampilPesan({ jenis: 'sukses', teks: ubah ? 'Data pengguna ' + isian.username + ' berhasil diperbarui' : 'Pengguna ' + isian.username + ' berhasil dibuat' })
        // Admin mengubah akunnya sendiri: sinkronkan nama/username di header.
        if (ubah && sendiri(u) && hasil && hasil.pengguna) {
          window.dispatchEvent(new CustomEvent('profil-berubah', { detail: hasil.pengguna }))
        }
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