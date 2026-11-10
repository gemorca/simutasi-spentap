import { panggilApi } from './api.js'
import { bacaExcel, unduhExcel, tanggalKeTeks } from './excel.js'
import { esc, KELAS, notif, barProgres } from './ui.js'

const MAKS_BARIS = 1000
const MAKS_BYTE = 5 * 1024 * 1024
const TAMPIL_GAGAL = 50
const TAMPIL_PRATINJAU = 8

const KOLOM = [
  { kunci: 'nisn_nis', judul: 'NISN/NIS', alias: ['nisnnis', 'nisn', 'nis', 'nomorinduk'] },
  { kunci: 'nama_siswa', judul: 'Nama Lengkap', alias: ['namalengkap', 'nama', 'namasiswa'] },
  { kunci: 'jenis_kelamin', judul: 'Jenis Kelamin', alias: ['jeniskelamin', 'jk', 'lp'] },
  { kunci: 'tempat_lahir', judul: 'Tempat Lahir', alias: ['tempatlahir', 'tempat'] },
  { kunci: 'tanggal_lahir', judul: 'Tanggal Lahir', alias: ['tanggallahir', 'tgllahir'] },
  { kunci: 'nama_kelas', judul: 'Kelas', alias: ['kelas', 'namakelas'] },
  { kunci: 'tahun_ajaran', judul: 'Tahun Ajaran', alias: ['tahunajaran', 'ta'] },
  { kunci: 'tanggal', judul: 'Tanggal Masuk', alias: ['tanggalmasuk', 'tglmasuk', 'tanggal'] },
  { kunci: 'sekolah', judul: 'Sekolah Asal', alias: ['sekolahasal', 'asalsekolah', 'sekolah'] },
  { kunci: 'alamat', judul: 'Alamat', alias: ['alamat'] },
  { kunci: 'alasan', judul: 'Alasan Pindah', alias: ['alasanpindah', 'alasan'] },
  { kunci: 'catatan', judul: 'Catatan', alias: ['catatan', 'keterangan'] },
]
const KOLOM_TANGGAL = ['tanggal_lahir', 'tanggal']
const KOLOM_PRATINJAU = ['nama_siswa', 'nama_kelas', 'tanggal', 'sekolah']
const WAJIB = ['nama_siswa', 'jenis_kelamin', 'nama_kelas', 'tanggal']

const norm = (h) => String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]/g, '')
const kosong = (c) => String(c == null ? '' : c).trim() === ''

async function unduhTemplate() {
  await unduhExcel('template-impor-mutasi-arsip.xlsx', [
    {
      nama: 'Mutasi Arsip',
      baris: [
        KOLOM.map((k) => k.judul),
        ['0012345678', 'Contoh Siswa Satu', 'L', 'Manado', '2013-05-21', '7A', '2026/2027', '2026-07-20', 'SDN 1 Contoh', 'Jl. Contoh No. 1', 'Pindah tugas orang tua', ''],
        ['', 'Contoh Siswa Dua', 'P', '', '', '7A', '', '2026-08-03', '', '', '', 'Surat pindah ada di berkas kertas'],
      ],
      lebar: [14, 28, 14, 18, 14, 10, 14, 14, 24, 28, 24, 28],
    },
    {
      nama: 'Petunjuk',
      baris: [
        ['Petunjuk pengisian'],
        ['1. Khusus siswa pindahan yang masuk saat pencatatan masih manual. Bukan untuk siswa baru lewat alur normal.'],
        ['2. Kolom wajib: Nama Lengkap, Jenis Kelamin (L atau P), Kelas, Tanggal Masuk.'],
        ['3. Nama Kelas dan Tahun Ajaran harus sama dengan menu Kelas. Tahun Ajaran kosong = tahun ajaran aktif.'],
        ['4. Tanggal ditulis yyyy-mm-dd, misalnya 2026-07-20. Tanggal masuk tidak boleh setelah hari ini.'],
        ['5. Sekolah Asal, Alamat, Alasan, Tempat/Tanggal Lahir, NISN/NIS boleh kosong. Format kolom NISN sebagai Teks.'],
        ['6. Siswa dicocokkan dengan menu Siswa lewat NISN/NIS, atau nama + kelas bila NISN kosong. Cocok = ditautkan. Tidak cocok = siswa aktif baru dibuat.'],
        ['7. Impor Siswa dulu bila daftar siswa belum masuk, supaya tidak ada siswa ganda.'],
        ['8. Maksimal ' + MAKS_BARIS + ' baris per impor. Baris yang salah dilewati, sisanya tetap diimpor.'],
        ['9. Hasil: mutasi langsung berstatus Disetujui, bertanda Arsip, tanpa lampiran dan tanpa surat keterangan.'],
      ],
      lebar: [110],
    },
  ])
}

async function bacaBerkas(file) {
  const semua = await bacaExcel(file)
  const awal = semua.findIndex((r) => r.some((c) => !kosong(c)))
  if (awal < 0) throw new Error('File kosong.')

  const peta = {}
  semua[awal].forEach((h, i) => {
    const kol = KOLOM.find((k) => k.alias.includes(norm(h)))
    if (kol && peta[kol.kunci] === undefined) peta[kol.kunci] = i
  })
  const hilang = WAJIB.filter((k) => peta[k] === undefined)
  if (hilang.length) {
    const nama = hilang.map((k) => KOLOM.find((x) => x.kunci === k).judul).join(', ')
    throw new Error('Kolom wajib tidak ditemukan: ' + nama + '. Gunakan template yang disediakan.')
  }

  const hasil = []
  for (let i = awal + 1; i < semua.length; i++) {
    const r = semua[i]
    if (r.every(kosong)) continue
    const o = { baris: i + 1 }
    for (const k of KOLOM) {
      const v = peta[k.kunci] === undefined ? '' : r[peta[k.kunci]]
      o[k.kunci] = KOLOM_TANGGAL.includes(k.kunci) ? await tanggalKeTeks(v) : String(v == null ? '' : v).trim()
    }
    hasil.push(o)
  }
  if (!hasil.length) throw new Error('Tidak ada baris data di bawah judul kolom.')
  if (hasil.length > MAKS_BARIS) throw new Error('Maksimal ' + MAKS_BARIS + ' baris per impor. File ini berisi ' + hasil.length + ' baris.')
  return hasil
}

export function bukaImporMutasiArsip({ onSelesai } = {}) {
  const d = document.createElement('dialog')
  d.className = 'dlg dlg-impor rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm shadow-2xl'
  document.body.appendChild(d)

  let status = 'pilih'
  let namaFile = ''
  let baris = []
  let periksa = null
  let akhir = null
  let galat = ''
  let sibuk = false
  let diimpor = false
  let bar = null

  const tunggu = (ms) => new Promise((r) => setTimeout(r, ms))
  const pasangBar = (label) => {
    const tempat = d.querySelector('[data-bar]')
    bar = tempat ? barProgres(tempat, label) : null
  }
  const lepasBar = () => { if (bar) bar.hapus(); bar = null }

  const ringkas = (n, label, kelas) => `<div class="rounded-xl border px-3 py-2 ${kelas}"><div class="text-lg font-bold">${esc(n)}</div><div class="text-xs font-semibold">${esc(label)}</div></div>`

  function htmlPilih() {
    return `<div class="mt-5 grid gap-4">
      <div role="note" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900"><strong class="block font-bold">Khusus data arsip</strong>Mutasi langsung berstatus Disetujui, tanpa lampiran dan tanpa surat keterangan. Impor Siswa dulu bila daftar siswa belum ada. Pakai hanya untuk siswa pindahan masa pencatatan manual.</div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm font-bold text-slate-900">Langkah 1. Unduh template</p>
        <p class="mt-1 text-sm text-slate-600">Isi data mutasi arsip memakai template agar kolom sesuai.</p>
        <button type="button" data-aksi="template" class="${KELAS.tombol} ${KELAS.kecil} impor-template-btn mt-3">Unduh Template Excel</button></div>
      <div>
        <p class="mb-2 text-sm font-bold text-slate-900">Langkah 2. Pilih file terisi</p>
        <label data-zona class="impor-zona flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-center transition-colors focus-within:border-blue-600">
          <span class="text-sm font-bold text-slate-800"><span class="impor-teks-desk">Tarik file ke sini atau klik untuk memilih</span><span class="impor-teks-hp">Ketuk untuk memilih file</span></span>
          <span class="text-xs font-medium text-slate-500">Format .xlsx, .xls, atau .csv. Maksimal 5 MB.</span>
          <input type="file" data-berkas accept=".xlsx,.xls,.csv" class="sr-only"></label></div>
      ${galat ? `<p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">${esc(galat)}</p>` : ''}
    </div>`
  }

  function htmlPratinjau() {
    const { total, valid, gagal, peringatan } = periksa
    const contoh = baris.slice(0, TAMPIL_PRATINJAU)
    const tabel = `<div class="overflow-x-auto rounded-xl border border-slate-200"><table class="min-w-full text-left text-xs">
      <thead class="bg-slate-50 text-slate-500"><tr><th class="px-2.5 py-2 font-semibold">Baris</th>${KOLOM_PRATINJAU.map((c) => `<th class="px-2.5 py-2 font-semibold">${esc(KOLOM.find((k) => k.kunci === c).judul)}</th>`).join('')}</tr></thead>
      <tbody>${contoh.map((r) => `<tr class="border-t border-slate-100"><td class="px-2.5 py-1.5 text-slate-400">${esc(r.baris)}</td>${KOLOM_PRATINJAU.map((c) => `<td class="px-2.5 py-1.5 text-slate-800">${esc(r[c] || '-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    return `<div class="mt-5 grid gap-4">
      <p class="text-sm font-semibold text-slate-600">File: <strong class="text-slate-900">${esc(namaFile)}</strong></p>
      <div class="grid grid-cols-3 gap-3">
        ${ringkas(total, 'Baris dibaca', 'border-slate-200 bg-slate-50 text-slate-900')}
        ${ringkas(valid, 'Siap diimpor', 'border-emerald-200 bg-emerald-50 text-emerald-900')}
        ${ringkas(gagal.length, 'Dilewati', gagal.length ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-900')}</div>
      <p class="text-sm font-medium text-slate-600">Ditautkan ke siswa yang sudah ada: <strong class="text-slate-900">${esc(periksa.terhubung)}</strong>. Siswa aktif baru dibuat: <strong class="text-slate-900">${esc(periksa.siswa_baru)}</strong>.</p>
      ${peringatan.length ? `<div role="alert" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900"><strong class="block font-bold">Peringatan kuota</strong><ul class="mt-1 list-disc pl-5">${peringatan.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
      ${gagal.length ? `<div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><strong class="block font-bold">Baris yang akan dilewati</strong>
        <ul class="mt-1 max-h-40 overflow-auto pl-1">${gagal.slice(0, TAMPIL_GAGAL).map((g) => `<li>Baris ${esc(g.baris)}: ${esc(g.pesan)}</li>`).join('')}</ul>
        ${gagal.length > TAMPIL_GAGAL ? `<p class="mt-1 text-xs font-semibold">dan ${gagal.length - TAMPIL_GAGAL} baris lainnya.</p>` : ''}</div>` : ''}
      <div><p class="mb-2 text-sm font-bold text-slate-900">Pratinjau ${contoh.length} baris pertama</p>${tabel}</div>
      ${galat ? `<p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">${esc(galat)}</p>` : ''}
    </div>`
  }

  function htmlSelesai() {
    return `<div role="status" class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
      <strong class="block text-base font-bold">${esc(akhir.diimpor)} mutasi arsip berhasil diimpor</strong>
      <p class="mt-1 text-sm font-medium">${esc(akhir.terhubung)} ditautkan ke siswa yang sudah ada, ${esc(akhir.siswa_baru)} siswa aktif baru dibuat.</p>
      <p class="mt-1 text-sm font-medium">${esc(akhir.gagal.length)} baris dilewati karena tidak valid.</p></div>`
  }

  function gambar() {
    const judul = status === 'selesai' ? 'Impor selesai' : 'Impor Mutasi Arsip dari Excel/CSV'
    let isi = ''
    let aksi = ''
    const tutup = `<button type="button" data-aksi="tutup" class="${KELAS.tombol}"${sibuk ? ' disabled' : ''}>${status === 'selesai' ? 'Tutup' : 'Batal'}</button>`
    if (status === 'pilih') {
      isi = htmlPilih()
      aksi = tutup
    } else if (status === 'memeriksa' || status === 'proses') {
      isi = `<p role="status" class="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900">${status === 'memeriksa' ? 'Membaca dan memeriksa file...' : 'Mengimpor mutasi arsip...'}</p><div data-bar></div>`
      aksi = tutup
    } else if (status === 'pratinjau') {
      isi = htmlPratinjau()
      aksi = `<button type="button" data-aksi="ulang" class="${KELAS.tombol}">Pilih file lain</button>${tutup}`
        + `<button type="button" data-aksi="proses" class="${KELAS.utama}"${periksa.valid ? '' : ' disabled'}>Proses Impor (${esc(periksa.valid)} data)</button>`
    } else {
      isi = htmlSelesai()
      aksi = tutup
    }
    d.innerHTML = `<div class="impor-isi"><h2 class="text-xl font-bold tracking-tight text-slate-900">${esc(judul)}</h2>${isi}
      <div class="dlg-aksi impor-aksi mt-6 flex flex-wrap justify-end gap-3">${aksi}</div></div>`
  }

  async function periksaFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { galat = 'Format file harus .xlsx, .xls, atau .csv.'; gambar(); return }
    if (file.size > MAKS_BYTE) { galat = 'Ukuran file melebihi 5 MB.'; gambar(); return }
    galat = ''
    namaFile = file.name
    status = 'memeriksa'
    sibuk = true
    gambar()
    pasangBar('Membaca file...')
    try {
      if (bar) bar.naik(5, 'Membaca file...')
      baris = await bacaBerkas(file)
      if (bar) bar.naik(25, 'Memeriksa data di server...')
      periksa = await panggilApi('mutasiImporArsip', { baris, simpan: false }, { saatProgres: bar ? (p) => bar.api(p) : undefined })
      if (bar) { bar.selesai('Pemeriksaan selesai'); await tunggu(500) }
      status = 'pratinjau'
    } catch (err) {
      galat = err.message
      status = 'pilih'
    }
    lepasBar()
    sibuk = false
    gambar()
  }

  async function proses() {
    if (sibuk || !periksa || !periksa.valid) return
    galat = ''
    status = 'proses'
    sibuk = true
    gambar()
    pasangBar('Mengirim data...')
    try {
      if (bar) bar.naik(5, 'Mengirim data...')
      akhir = await panggilApi('mutasiImporArsip', { baris, simpan: true }, { saatProgres: bar ? (p) => bar.api(p) : undefined })
      if (bar) { bar.selesai('Impor selesai'); await tunggu(600) }
      diimpor = akhir.diimpor > 0
      status = 'selesai'
    } catch (err) {
      galat = err.message
      status = 'pratinjau'
    }
    lepasBar()
    sibuk = false
    gambar()
  }

  d.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-aksi]')
    if (!el || el.disabled) return
    const aksi = el.dataset.aksi
    if (aksi === 'tutup') d.close()
    else if (aksi === 'ulang') { status = 'pilih'; galat = ''; periksa = null; baris = []; gambar() }
    else if (aksi === 'proses') proses()
    else if (aksi === 'template') {
      try { await unduhTemplate() } catch (err) { notif.galat(err.message) }
    }
  })
  d.addEventListener('change', (e) => {
    if (!e.target.matches('input[data-berkas]')) return
    const file = e.target.files[0]
    e.target.value = ''
    if (file) periksaFile(file)
  })
  const zona = (e) => e.target.closest && e.target.closest('[data-zona]')
  d.addEventListener('dragover', (e) => {
    const z = zona(e)
    if (!z) return
    e.preventDefault()
    z.classList.add('border-blue-600', 'bg-blue-50')
  })
  d.addEventListener('dragleave', (e) => {
    const z = zona(e)
    if (z) z.classList.remove('border-blue-600', 'bg-blue-50')
  })
  d.addEventListener('drop', (e) => {
    const z = zona(e)
    if (!z) return
    e.preventDefault()
    z.classList.remove('border-blue-600', 'bg-blue-50')
    const file = e.dataTransfer && e.dataTransfer.files[0]
    if (file && status === 'pilih') periksaFile(file)
  })
  d.addEventListener('cancel', (e) => { if (sibuk) e.preventDefault() })
  d.addEventListener('close', () => {
    d.remove()
    if (diimpor && onSelesai) onSelesai()
  }, { once: true })

  gambar()
  d.showModal()
}
