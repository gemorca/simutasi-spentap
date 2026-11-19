import { panggilApi, ambilCache } from './api.js'
import {
  KELAS, memuat, judulHalaman, medan, bacaForm, barSimpan, sibukSimpan, galatMuat, pasangAksi, tampilPesan,
} from './ui.js'
import { periksa, wajib } from './validasi.js'

const KOLOM = ['nama_siswa', 'nisn_nis', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'kelas_id', 'tanggal', 'sekolah', 'alamat', 'alasan', 'catatan']
const TEKS_SIMPAN = 'Simpan sebagai Draft'
const KUNCI_DETAIL = ['jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'alasan', 'catatan']
const PLACEHOLDER = {
  tempat_lahir: 'Contoh: Gorontalo',
  alamat: 'Alamat lengkap siswa',
  alasan: 'Contoh: Mengikuti orang tua',
  catatan: 'Boleh dikosongkan',
}

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

export function renderForm(wadah, { id = '', awal = null, onSelesai }) {
  const akar = document.createElement('div')
  wadah.innerHTML = ''
  wadah.appendChild(akar)
  const disentuh = new Set()
  const dikunci = new Set()

  const judul = (ubah) => judulHalaman({
    judul: (ubah ? 'Ubah' : 'Tambah') + ' Siswa Masuk',
    sub: 'Lampiran berkas dapat diunggah setelah data berhasil disimpan. Kolom bertanda * wajib diisi.',
    aksi: `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Batal</button>`,
  })

  function lengkapi(m) {
    const form = akar.querySelector('form')
    if (!form) return
    KOLOM.forEach((nama) => {
      const el = form.elements[nama]
      if (!el || disentuh.has(nama)) return
      const nilai = m[nama] == null ? '' : String(m[nama])
      if (el.value !== nilai) el.value = nilai
      if (PLACEHOLDER[nama]) el.placeholder = PLACEHOLDER[nama]
    })
    dikunci.forEach((nama) => {
      const el = form.elements[nama]
      if (!el) return
      el.disabled = false
      if (el.tagName === 'SELECT') {
        const kosong = [...el.options].find((o) => o.value === '' && o.disabled)
        if (kosong) kosong.remove()
        if (nama === 'kelas_id' && el.options[0] && el.options[0].value === '') el.options[0].text = '(pilih kelas)'
      }
    })
    dikunci.clear()
    const simpan = form.querySelector('[data-simpan]')
    if (simpan) simpan.disabled = false
  }

  async function muat(pakaiAwal = true) {
    const baris = pakaiAwal && id ? awal : null
    const kelasCache = baris ? ambilCache('kelas') : undefined
    if (baris && kelasCache) {
      gambar(kelasCache, baris, true)
      try {
        const detail = await panggilApi('mutasiDetail', { id })
        if (!akar.isConnected) return
        lengkapi(detail.mutasi)
      } catch (err) {
        if (!akar.isConnected) return
        akar.innerHTML = judul(true) + galatMuat(err.message)
      }
      return
    }
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

  function gambar(kelas, m, menunggu = false) {
    dikunci.clear()
    if (menunggu) {
      KUNCI_DETAIL.forEach((nama) => dikunci.add(nama))
      if (m.kelas_id === undefined) dikunci.add('kelas_id')
    }
    const nk = (nama) => dikunci.has(nama)
    const ph = (nama, teks) => (nk(nama) ? 'Memuat...' : teks)
    const n = m
      ? {
        nama_siswa: m.nama_siswa, nisn_nis: m.nisn_nis || '', jenis_kelamin: m.jenis_kelamin || '',
        tempat_lahir: m.tempat_lahir || '', tanggal_lahir: m.tanggal_lahir || '', kelas_id: m.kelas_id || '',
        tanggal: m.tanggal || '', sekolah: m.sekolah || '', alamat: m.alamat || '', alasan: m.alasan || '', catatan: m.catatan || '',
      }
      : {
        nama_siswa: '', nisn_nis: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '', kelas_id: '',
        tanggal: '', sekolah: '', alamat: '', alasan: '', catatan: '',
      }
    const seksi = (judulSeksi, isi) => `<fieldset class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <legend class="px-3 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg py-1">${judulSeksi}</legend><div class="mt-4 grid gap-5 sm:grid-cols-2">${isi}</div></fieldset>`
    const kelasPilihan = [{ nilai: '', label: nk('kelas_id') ? 'Memuat...' : '(pilih kelas)' }]
      .concat(kelas.map((k) => ({ nilai: k.id, label: k.nama_kelas + ' - ' + k.tahun_ajaran + ' (sisa ' + k.sisa + ')' })))

    akar.innerHTML = judul(Boolean(m)) + `<form novalidate>
      ${seksi('1. Data Pribadi Siswa', `
        ${medan({ label: 'Nama lengkap siswa', nama: 'nama_siswa', nilai: n.nama_siswa, wajib: true, penuh: true, placeholder: 'Contoh: Ahmad Fauzi', atribut: { autocomplete: 'off' } })}
        ${medan({ label: 'NISN / NIS (jika ada)', nama: 'nisn_nis', nilai: n.nisn_nis, placeholder: 'Boleh dikosongkan', atribut: { inputmode: 'numeric' } })}
        ${medan({ label: 'Jenis kelamin', nama: 'jenis_kelamin', nilai: n.jenis_kelamin, wajib: true, placeholder: ph('jenis_kelamin', ''), nonaktif: nk('jenis_kelamin'), pilihan: [{ nilai: 'L', label: 'Laki-laki' }, { nilai: 'P', label: 'Perempuan' }] })}
        ${medan({ label: 'Tempat lahir', nama: 'tempat_lahir', nilai: n.tempat_lahir, wajib: true, placeholder: ph('tempat_lahir', 'Contoh: Gorontalo'), nonaktif: nk('tempat_lahir') })}
        ${medan({ label: 'Tanggal lahir', nama: 'tanggal_lahir', nilai: n.tanggal_lahir, wajib: true, tipe: 'date', nonaktif: nk('tanggal_lahir') })}
        ${medan({ label: 'Alamat siswa', nama: 'alamat', nilai: n.alamat, wajib: true, penuh: true, placeholder: ph('alamat', 'Alamat lengkap siswa'), nonaktif: nk('alamat') })}`)}
      ${seksi('2. Penempatan Kelas', `
        ${medan({ label: 'Kelas tujuan', nama: 'kelas_id', nilai: n.kelas_id, wajib: true, nonaktif: nk('kelas_id'), pilihan: kelasPilihan })}
        ${medan({ label: 'Tanggal masuk', nama: 'tanggal', nilai: n.tanggal, wajib: true, tipe: 'date' })}`)}
      ${seksi('3. Asal dan Alasan Pindah', `
        ${medan({ label: 'Sekolah asal', nama: 'sekolah', nilai: n.sekolah, wajib: true, placeholder: 'Nama sekolah asal' })}
        ${medan({ label: 'Alasan pindah', nama: 'alasan', nilai: n.alasan, wajib: true, placeholder: ph('alasan', 'Contoh: Mengikuti orang tua'), nonaktif: nk('alasan') })}
        ${medan({ label: 'Catatan (boleh kosong)', nama: 'catatan', nilai: n.catatan, penuh: true, placeholder: ph('catatan', 'Boleh dikosongkan'), nonaktif: nk('catatan') })}`)}
      ${barSimpan({ teks: TEKS_SIMPAN })}</form>`
    window.scrollTo(0, 0)

    const form = akar.querySelector('form')
    if (menunggu) form.querySelector('[data-simpan]').disabled = true
    const bersih = (e) => { if (e.target.name) { disentuh.add(e.target.name); setGalat(form, e.target.name, '') } }
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

  pasangAksi(akar, { kembali: () => onSelesai(''), 'muat-ulang': () => muat(false) })
  muat()
}