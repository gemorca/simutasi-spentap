import { panggilApi } from '../api.js'
import {
  esc, KELAS, IKON, memuat, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm, barSimpan, sibukSimpan,
  galatMuat, tabel, isiUlang, pasangAksi, pilihanMassal, barAlat, barAksiBawah, ringkasanMassal,
  dialogKonfirmasi, tampilPesan, notif, tandaiMemuat,
} from '../ui.js'
import { periksa, wajib, angkaMin } from '../validasi.js'
import { pasangFilter } from '../mutasiFilter.js'
import { uraiKelas, urutKelas } from '../urutKelas.js'

const IK_KELAS = 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01'
const KOLOM_FORM = ['nama_kelas', 'tahun_ajaran', 'kuota', 'wali_kelas']
const ATURAN = {
  nama_kelas: [wajib('Nama kelas wajib diisi')],
  tahun_ajaran: [wajib('Tahun ajaran wajib diisi')],
  kuota: [wajib('Kuota wajib diisi'), angkaMin(0, 'Kuota harus bilangan bulat, minimal 0')],
}
const SATUAN = 'kelas'

export function render(wadah, pengguna) {
  if (!pengguna || pengguna.peran !== 'admin') {
    wadah.innerHTML = judulHalaman({ judul: 'Kelola Kelas', sub: 'Halaman ini hanya dapat diakses Administrator Utama.' })
    return
  }
  let daftar = []
  let tampil = []
  let sibuk = false
  let layar = 0
  let urutan = 0
  const filter = { q: '', tingkat: '', tahun: '' }
  const pilihan = pilihanMassal()

  const idStr = (k) => String(k.id)
  const cari = (id) => daftar.find((k) => idStr(k) === String(id))

  function opsiTingkat() {
    const peta = new Map()
    for (const k of daftar) {
      const u = uraiKelas(k.nama_kelas)
      if (u.tingkat !== null && !peta.has(u.tingkat)) peta.set(u.tingkat, u.label)
    }
    const urut = [...peta.entries()].sort((a, b) => a[0] - b[0])
    return '<option value="">Semua kelas</option>' + urut.map(([nilai, label]) =>
      `<option value="${nilai}"${String(nilai) === String(filter.tingkat) ? ' selected' : ''}>Kelas ${esc(label)}</option>`).join('')
  }

  function opsiTahun() {
    const tahun = [...new Set(daftar.map((k) => String(k.tahun_ajaran)))]
      .sort((a, b) => b.localeCompare(a, 'id', { numeric: true }))
    return '<option value="">Semua tahun ajaran</option>' + tahun.map((t) =>
      `<option value="${esc(t)}"${t === String(filter.tahun) ? ' selected' : ''}>${esc(t)}</option>`).join('')
  }

  function formFilter() {
    const lab = 'grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800'
    const isi = `${KELAS.kontrol} font-normal`
    return `<form data-filter role="search" class="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <label class="${lab} flt-cari min-w-[12rem] flex-1">Cari Data
        <input name="q" value="${esc(filter.q)}" placeholder="Nama kelas atau wali kelas" autocomplete="off" class="${isi}"></label>
      <label class="${lab} flt-lain">Filter Kelas
        <select name="tingkat" class="${isi}">${opsiTingkat()}</select></label>
      <label class="${lab} flt-lain">Tahun Ajaran
        <select name="tahun" class="${isi}">${opsiTahun()}</select></label></form>`
  }

  function segarkanOpsi() {
    const form = wadah.querySelector('[data-filter]')
    if (!form) return
    const adaTingkat = daftar.some((k) => String(uraiKelas(k.nama_kelas).tingkat) === String(filter.tingkat))
    if (filter.tingkat && !adaTingkat) filter.tingkat = ''
    if (filter.tahun && !daftar.some((k) => String(k.tahun_ajaran) === String(filter.tahun))) filter.tahun = ''
    form.elements.tingkat.innerHTML = opsiTingkat()
    form.elements.tahun.innerHTML = opsiTahun()
  }

  function terapkanFilter() {
    const kata = filter.q.trim().toLowerCase()
    tampil = daftar.filter((k) => {
      if (filter.tingkat && String(uraiKelas(k.nama_kelas).tingkat) !== String(filter.tingkat)) return false
      if (filter.tahun && String(k.tahun_ajaran) !== String(filter.tahun)) return false
      if (kata && !(String(k.nama_kelas) + ' ' + String(k.wali_kelas || '')).toLowerCase().includes(kata)) return false
      return true
    })
  }

  function gambarIsi() {
    const isi = wadah.querySelector('[data-isi]')
    if (!isi) return
    terapkanFilter()
    pilihan.setDaftar(tampil.map(idStr))
    const difilter = Boolean(filter.q || filter.tingkat || filter.tahun)
    isiUlang(isi,
      barAlat({ pilihan, total: tampil.length, satuan: SATUAN, sibuk })
      + tabel({
        kolom: [
          { judul: 'Kelas', html: (k) => `<strong class="text-slate-900">${esc(k.nama_kelas)}</strong>` },
          { judul: 'Tahun Ajaran', nilai: (k) => k.tahun_ajaran },
          { judul: 'Kuota', rata: 'angka', nilai: (k) => k.kuota },
          { judul: 'Aktif', rata: 'angka', nilai: (k) => k.jumlah_aktif },
          { judul: 'Sisa', rata: 'angka', html: (k) => `<span class="${k.sisa <= 0 ? 'font-bold text-rose-600' : ''}">${esc(k.sisa)}</span>` },
          { judul: 'Wali Kelas', isi: 'kiri', html: (k) => (k.wali_kelas ? esc(k.wali_kelas) : '<span class="block text-center">-</span>') },
        ],
        baris: tampil,
        aksi: () => [
          { aksi: 'ubah', label: 'Ubah', d: IKON.ubah },
          { aksi: 'hapus', label: 'Hapus', d: IKON.hapus, bahaya: true },
        ],
        pilih: {
          aktif: pilihan.aktif,
          ada: (id) => pilihan.ada(String(id)),
          semua: pilihan.semuaDipilih,
          sebagian: pilihan.sebagian,
          label: (k) => 'Pilih kelas ' + k.nama_kelas,
        },
        kosong: difilter
          ? { ikon: IK_KELAS, judul: 'Tidak ada kelas yang cocok', teks: 'Ubah kata pencarian atau filter kelas.' }
          : { ikon: IK_KELAS, judul: 'Belum ada kelas', teks: 'Tambah kelas beserta kuota dan wali kelas lewat tombol Tambah Kelas.' },
      })
      + barAksiBawah({ pilihan, satuan: SATUAN, sibuk }))
  }

  async function muat(senyap = false) {
    const saya = layar
    const urut = ++urutan
    const isi = wadah.querySelector('[data-isi]')
    if (!isi) return
    if (senyap && isi.firstElementChild) tandaiMemuat(isi, true)
    else isi.innerHTML = memuat()
    try {
      const hasil = await panggilApi('kelasDaftar')
      if (saya !== layar || urut !== urutan || !wadah.isConnected) return
      daftar = [...hasil].sort(urutKelas)
      segarkanOpsi()
      gambarIsi()
    } catch (err) {
      if (saya !== layar || urut !== urutan || !wadah.isConnected) return
      isi.innerHTML = galatMuat(err.message)
    } finally {
      if (urut === urutan) tandaiMemuat(isi, false)
    }
  }

  function tampilDaftar(segar = true) {
    layar++
    pilihan.selesai()
    sibuk = false
    wadah.innerHTML = judulHalaman({
      judul: 'Kelola Kelas',
      sub: 'Atur data kelas, kapasitas kuota, dan wali kelas per tahun ajaran.',
      aksi: `<button type="button" data-aksi="tambah" class="${KELAS.utama}">Tambah Kelas</button>`,
    }) + formFilter() + '<div data-isi></div>'
    pasangAksi(wadah, PETA_DAFTAR)
    pasangFilter(wadah.querySelector('[data-filter]'), filter, () => {
      pilihan.selesai()
      muat(true)
    })
    if (segar) return muat()
    gambarIsi()
  }

  async function hapus(k) {
    if (!k) return
    const ya = await dialogKonfirmasi({
      judul: 'Hapus kelas?',
      pesan: 'Kelas ' + k.nama_kelas + ' (' + k.tahun_ajaran + ') akan dihapus.',
      ya: 'Hapus',
      bahaya: true,
    })
    if (!ya || !wadah.isConnected) return
    try {
      await panggilApi('kelasHapus', { id: k.id })
      tampilPesan({ jenis: 'sukses', teks: 'Kelas berhasil dihapus' })
      if (wadah.isConnected) muat()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  async function hapusTerpilih() {
    const n = pilihan.jumlah
    if (!n || sibuk) return
    const ya = await dialogKonfirmasi({
      judul: 'Hapus ' + n + ' kelas?',
      pesan: 'Kelas terpilih akan dihapus permanen. Kelas yang masih dipakai data siswa atau mutasi akan dilewati.',
      ya: 'Hapus ' + n + ' kelas',
      bahaya: true,
    })
    if (!ya || !wadah.isConnected) return
    sibuk = true
    gambarIsi()
    try {
      const ids = pilihan.daftarId.map((id) => (cari(id) || {}).id)
      const hasil = await panggilApi('kelasBulkDestroy', { ids })
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
    ubah: (id) => { const k = cari(id); if (k) tampilForm(k) },
    hapus: (id) => hapus(cari(id)),
    'mulai-pilih': () => { pilihan.mulai(); gambarIsi() },
    'selesai-pilih': () => { pilihan.selesai(); gambarIsi() },
    'pilih-semua': () => { pilihan.balikSemua(); gambarIsi() },
    pilih: (id) => { pilihan.balik(id); gambarIsi() },
    'hapus-terpilih': hapusTerpilih,
    'muat-ulang': () => muat(),
  }

  function tampilForm(k) {
    const saya = ++layar
    const ubah = Boolean(k)
    const nilai = ubah
      ? { nama_kelas: k.nama_kelas, tahun_ajaran: k.tahun_ajaran, kuota: k.kuota, wali_kelas: k.wali_kelas }
      : { nama_kelas: '', tahun_ajaran: '', kuota: '', wali_kelas: '' }

    wadah.innerHTML = judulHalaman({
      judul: ubah ? 'Ubah Data Kelas' : 'Tambah Kelas Baru',
      sub: ubah ? 'Perbarui data kelas, lalu simpan.' : 'Isi data kelas baru, lalu simpan.',
      aksi: `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Kembali</button>`,
    }) + `<form novalidate class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div class="grid gap-5 sm:grid-cols-2">
        ${medan({ label: 'Nama kelas', nama: 'nama_kelas', nilai: nilai.nama_kelas, wajib: true, placeholder: 'Contoh: VII A', atribut: { autocomplete: 'off' } })}
        ${medan({ label: 'Tahun ajaran', nama: 'tahun_ajaran', nilai: nilai.tahun_ajaran, wajib: true, placeholder: 'Contoh: 2026/2027', atribut: { autocomplete: 'off' } })}
        ${medan({ label: 'Kuota', nama: 'kuota', nilai: nilai.kuota, wajib: true, tipe: 'number', placeholder: 'Contoh: 32', atribut: { min: '0', inputmode: 'numeric' } })}
        ${medan({ label: 'Wali kelas', nama: 'wali_kelas', nilai: nilai.wali_kelas, catatan: 'Boleh dikosongkan.', placeholder: 'Nama wali kelas', atribut: { autocomplete: 'off' } })}
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
        await panggilApi('kelasSimpan', { id: ubah ? k.id : '', ...isian })
        tampilPesan({ jenis: 'sukses', teks: ubah ? 'Data kelas ' + isian.nama_kelas + ' berhasil diperbarui' : 'Kelas ' + isian.nama_kelas + ' berhasil dibuat' })
        if (saya !== layar || !wadah.isConnected) return
        tampilDaftar(true)
      } catch (err) {
        if (saya !== layar || !wadah.isConnected) return
        sibukSimpan(form, false)
        tampilPesan({ jenis: 'galat', teks: err.message })
      }
    })
    const pertama = form.querySelector('input:not(:disabled), select:not(:disabled)')
    if (pertama) pertama.focus()
  }

  tampilDaftar(true)
}
