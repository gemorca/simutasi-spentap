import { panggilApi } from './api.js'
import {
  KELAS, memuat, judulHalaman, medan, bacaForm, barSimpan, sibukSimpan, galatMuat, pasangAksi, tampilPesan,
} from './ui.js'
import { periksa, wajib } from './validasi.js'

const KOLOM = ['nama_siswa', 'nisn_nis', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'kelas_id', 'tanggal', 'sekolah', 'alamat', 'alasan', 'catatan']
const TEKS_SIMPAN = 'Simpan sebagai Draft'

const ATURAN = {
  nama_siswa: [wajib('Nama siswa wajib diisi')],
  jenis_kelamin: [wajib('Jenis kelamin wajib dipilih')],
  tempat_lahir: [wajib('Tempat lahir wajib diisi')],
  tanggal_lahir: [wajib('Tanggal lahir wajib diisi')],
  kelas_id: [wajib('Kelas tujuan wajib dipilih')],
  tanggal: [wajib('Tanggal masuk wajib diisi')],
  sekolah: [wajib('Sekolah asal wajib diisi')],
  alamat: [wajib('Alamat siswa wajib diisi')],
  alasan: [wajib('Alasan pindah wajib diisi')],
}

// Kata kunci untuk memetakan pesan "... wajib ..." dari server ke kolom yang tepat.
const PETA_SERVER = [
  ['nama_siswa', 'nama siswa'],
  ['tempat_lahir', 'tempat lahir'],
  ['tanggal_lahir', 'tanggal lahir'],
  ['nisn_nis', 'nisn'],
  ['kelas_id', 'kelas'],
  ['tanggal', 'tanggal masuk'],
  ['sekolah', 'sekolah'],
  ['alamat', 'alamat'],
  ['alasan', 'alasan'],
]

const KELAS_GALAT = ['!border-rose-500', '!bg-rose-50/60', '!ring-2', '!ring-rose-500/20']

function setGalat(form, nama, pesan) {
  const el = form.querySelector(`[data-medan="${CSS.escape(nama)}"]`)
  if (!el) return null
  const p = el.querySelector('[data-galat]')
  const label = el.querySelector('label')
  const kontrol = el.querySelector('input, select, textarea')
  if (p) { p.textContent = pesan || ''; p.hidden = !pesan }
  if (label) label.classList.toggle('!text-rose-600', Boolean(pesan))
  if (kontrol) {
    KELAS_GALAT.forEach((k) => kontrol.classList.toggle(k, Boolean(pesan)))
    if (pesan) kontrol.setAttribute('aria-invalid', 'true')
    else kontrol.removeAttribute('aria-invalid')
  }
  return kontrol
}

function tandaiSemua(form, galat) {
  let pertama = null
  form.querySelectorAll('[data-medan]').forEach((el) => {
    const nama = el.dataset.medan
    const kontrol = setGalat(form, nama, galat[nama] || '')
    if (galat[nama] && !pertama) pertama = kontrol
  })
  if (pertama) {
    pertama.scrollIntoView({ behavior: 'smooth', block: 'center' })
    pertama.focus({ preventScroll: true })
  }
  return pertama
}

export function renderForm(wadah, { id = '', onSelesai }) {
  const akar = document.createElement('div')
  wadah.innerHTML = ''
  wadah.appendChild(akar)

  const judul = (ubah) => judulHalaman({
    judul: (ubah ? 'Ubah' : 'Tambah') + ' Siswa Masuk',
    sub: 'Lampiran berkas dapat diunggah setelah data berhasil disimpan. Kolom bertanda * wajib diisi.',
    aksi: `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Batal</button>`,
  })

  async function muat() {
    akar.innerHTML = judul(Boolean(id)) + memuat()
    try {
      const [kelas, detail] = await Promise.all([
        panggilApi('kelasDaftar'),
        id ? panggilApi('mutasiDetail', { id }) : Promise.resolve(null),
      ])
      if (!akar.isConnected) return
      gambar(kelas, detail ? detail.mutasi : null)
    } catch (err) {
      if (!akar.isConnected) return
      akar.innerHTML = judul(Boolean(id)) + galatMuat(err.message)
    }
  }

  function gambar(kelas, m) {
    const n = m
      ? {
        nama_siswa: m.nama_siswa, nisn_nis: m.nisn_nis || '', jenis_kelamin: m.jenis_kelamin,
        tempat_lahir: m.tempat_lahir || '', tanggal_lahir: m.tanggal_lahir || '', kelas_id: m.kelas_id,
        tanggal: m.tanggal, sekolah: m.sekolah, alamat: m.alamat, alasan: m.alasan, catatan: m.catatan || '',
      }
      : {
        nama_siswa: '', nisn_nis: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '', kelas_id: '',
        tanggal: '', sekolah: '', alamat: '', alasan: '', catatan: '',
      }
    const seksi = (judulSeksi, isi) => `<fieldset class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <legend class="px-3 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg py-1">${judulSeksi}</legend><div class="mt-4 grid gap-5 sm:grid-cols-2">${isi}</div></fieldset>`
    const kelasPilihan = [{ nilai: '', label: '(pilih kelas)' }]
      .concat(kelas.map((k) => ({ nilai: k.id, label: k.nama_kelas + ' - ' + k.tahun_ajaran + ' (sisa ' + k.sisa + ')' })))

    akar.innerHTML = judul(Boolean(m)) + `<form novalidate>
      ${seksi('1. Data Pribadi Siswa', `
        ${medan({ label: 'Nama lengkap siswa', nama: 'nama_siswa', nilai: n.nama_siswa, wajib: true, penuh: true, placeholder: 'Contoh: Ahmad Fauzi', atribut: { autocomplete: 'off' } })}
        ${medan({ label: 'NISN / NIS (jika ada)', nama: 'nisn_nis', nilai: n.nisn_nis, placeholder: 'Boleh dikosongkan', atribut: { inputmode: 'numeric' } })}
        ${medan({ label: 'Jenis kelamin', nama: 'jenis_kelamin', nilai: n.jenis_kelamin, wajib: true, pilihan: [{ nilai: 'L', label: 'Laki-laki' }, { nilai: 'P', label: 'Perempuan' }] })}
        ${medan({ label: 'Tempat lahir', nama: 'tempat_lahir', nilai: n.tempat_lahir, wajib: true, placeholder: 'Contoh: Gorontalo' })}
        ${medan({ label: 'Tanggal lahir', nama: 'tanggal_lahir', nilai: n.tanggal_lahir, wajib: true, tipe: 'date' })}
        ${medan({ label: 'Alamat siswa', nama: 'alamat', nilai: n.alamat, wajib: true, penuh: true, placeholder: 'Alamat lengkap siswa' })}`)}
      ${seksi('2. Penempatan Kelas', `
        ${medan({ label: 'Kelas tujuan', nama: 'kelas_id', nilai: n.kelas_id, wajib: true, pilihan: kelasPilihan })}
        ${medan({ label: 'Tanggal masuk', nama: 'tanggal', nilai: n.tanggal, wajib: true, tipe: 'date' })}`)}
      ${seksi('3. Asal dan Alasan Pindah', `
        ${medan({ label: 'Sekolah asal', nama: 'sekolah', nilai: n.sekolah, wajib: true, placeholder: 'Nama sekolah asal' })}
        ${medan({ label: 'Alasan pindah', nama: 'alasan', nilai: n.alasan, wajib: true, placeholder: 'Contoh: Mengikuti orang tua' })}
        ${medan({ label: 'Catatan (boleh kosong)', nama: 'catatan', nilai: n.catatan, penuh: true, placeholder: 'Boleh dikosongkan' })}`)}
      ${barSimpan({ teks: TEKS_SIMPAN })}</form>`
    window.scrollTo(0, 0)

    const form = akar.querySelector('form')
    const bersih = (e) => { if (e.target.name) setGalat(form, e.target.name, '') }
    form.addEventListener('input', bersih)
    form.addEventListener('change', bersih)

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (form.querySelector('[data-simpan]').disabled) return
      const isian = bacaForm(form, KOLOM)
      const galat = periksa(isian, ATURAN)
      if (Object.keys(galat).length) { tandaiSemua(form, galat); return }
      sibukSimpan(form, true, TEKS_SIMPAN)
      try {
        const hasil = await panggilApi('mutasiSimpan', { id: m ? m.id : id, ...isian })
        tampilPesan({ jenis: 'sukses', teks: id ? 'Data siswa masuk berhasil diperbarui' : 'Siswa masuk berhasil ditambahkan sebagai Draft' })
        if (!akar.isConnected) return
        onSelesai(hasil.id)
      } catch (err) {
        if (!akar.isConnected) return
        sibukSimpan(form, false, TEKS_SIMPAN)
        // Pesan "wajib" dari server: tampilkan langsung pada kolom terkait, bukan dialog.
        const pesan = String(err.message || '')
        const cocok = /wajib|nisn/i.test(pesan)
          ? PETA_SERVER.find(([, kata]) => pesan.toLowerCase().includes(kata))
          : null
        if (cocok) { tandaiSemua(form, { [cocok[0]]: pesan }); return }
        window.scrollTo({ top: 0, behavior: 'smooth' })
        tampilPesan({ jenis: 'galat', teks: pesan })
      }
    })
    const pertama = form.querySelector('input:not(:disabled)')
    if (pertama) pertama.focus()
  }

  pasangAksi(akar, { kembali: () => onSelesai(''), 'muat-ulang': muat })
  muat()
}