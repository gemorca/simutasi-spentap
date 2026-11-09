import { panggilApi } from '../api.js'
import {
  esc, KELAS, IKON, memuat, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm, barSimpan, sibukSimpan,
  galatMuat, tabel, isiUlang, pasangAksi, tampilPesan, notif, tandaiMemuat, lencana,
} from '../ui.js'
import { periksa, wajib } from '../validasi.js'
import { tampilKenaikan, tulisPeriode, kabarkanPeriode, tautanBackup } from './kenaikan.js'

const IK_TA = 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2'
const KOLOM_FORM = ['tahun_ajaran', 'ganjil_mulai', 'ganjil_selesai', 'genap_mulai', 'genap_selesai']
const KOLOM_TANGGAL = KOLOM_FORM.slice(1)
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const STATUS_PERIODE = {
  aktif: { label: 'Aktif', kelas: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  belum_mulai: { label: 'Belum mulai', kelas: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  menunggu_kenaikan: { label: 'Menunggu kenaikan kelas', kelas: 'bg-amber-50 text-amber-700 border-amber-200' },
  berakhir: { label: 'Berakhir', kelas: 'bg-rose-50 text-rose-700 border-rose-200/80' },
}

/* ---------- Tanggal dan validasi (cermin aturan server: validasiTahunAjaran_ di Modul.gs) ---------- */
function tanggalValid(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

function formatTaValid(ta) {
  const m = /^(\d{4})\/(\d{4})$/.exec(String(ta || '').trim())
  return Boolean(m) && Number(m[2]) === Number(m[1]) + 1
}

function tgl(iso) {
  const p = String(iso || '').split('-')
  return p.length === 3 ? Number(p[2]) + ' ' + BULAN[Number(p[1]) - 1] + ' ' + p[0] : '-'
}

const rentang = (a, b) => tgl(a) + ' - ' + tgl(b)

/* Tanggal bawaan Juli-Juni, sama seperti server (tanggalSemesterBawaan_). */
function tanggalBawaan(ta) {
  const y1 = Number(String(ta).substr(0, 4))
  return {
    ganjil_mulai: y1 + '-07-01', ganjil_selesai: y1 + '-12-31',
    genap_mulai: (y1 + 1) + '-01-01', genap_selesai: (y1 + 1) + '-06-30',
  }
}

const tglWajib = (nama) => (v) => (tanggalValid(v) ? '' : 'Tanggal ' + nama + ' wajib diisi dengan tanggal yang valid')
// Galat bila v tidak lebih besar dari tanggal pembanding (format ISO bisa dibandingkan sebagai teks).
const harusSetelah = (kunci, pesan) => (v, semua) => (
  tanggalValid(v) && tanggalValid(semua[kunci]) && v <= semua[kunci] ? pesan : ''
)

const ATURAN = {
  tahun_ajaran: [
    wajib('Tahun ajaran wajib diisi'),
    (v) => (formatTaValid(v) ? '' : 'Format tahun ajaran harus seperti 2026/2027 (tahun kedua = tahun pertama + 1)'),
  ],
  ganjil_mulai: [tglWajib('Ganjil mulai')],
  ganjil_selesai: [tglWajib('Ganjil selesai'), harusSetelah('ganjil_mulai', 'Ganjil selesai harus setelah Ganjil mulai')],
  genap_mulai: [tglWajib('Genap mulai'), harusSetelah('ganjil_selesai', 'Genap mulai harus setelah Ganjil selesai')],
  genap_selesai: [tglWajib('Genap selesai'), harusSetelah('genap_mulai', 'Genap selesai harus setelah Genap mulai')],
}

/* Bentrok dengan tahun ajaran lain: nama kembar atau rentang tumpang tindih. Kembalikan {} bila aman. */
function cariBentrok(v, lainnya) {
  for (const r of lainnya) {
    if (r.tahun_ajaran === v.tahun_ajaran) return { tahun_ajaran: 'Tahun ajaran ' + v.tahun_ajaran + ' sudah ada' }
    if (v.ganjil_mulai <= r.genap_selesai && r.ganjil_mulai <= v.genap_selesai) {
      return { ganjil_mulai: 'Rentang tanggal tumpang tindih dengan tahun ajaran ' + r.tahun_ajaran + ' (' + rentang(r.ganjil_mulai, r.genap_selesai) + ')' }
    }
  }
  return {}
}

/* ---------- Tampilan ---------- */
function lencanaKenaikan(status) {
  if (status === 'selesai') return lencana('Disetujui', 'Selesai')
  if (status === 'berjalan') return lencana('Diajukan', 'Berjalan')
  return lencana('Draft', 'Belum dijalankan')
}

function kartuStatus(p) {
  if (!p) return ''
  const meta = STATUS_PERIODE[p.status] || STATUS_PERIODE.aktif
  const tutup = p.aktif === false
  const sisa = Number(p.hari_ke_akhir)
  const semester = p.aktif && p.semester ? ' - Semester ' + (p.semester === 'genap' ? 'Genap' : 'Ganjil') : ''
  let uraian
  if (tutup) {
    uraian = (p.pesan ? esc(p.pesan) + ' ' : '')
      + 'Petugas TU dan Kepala Sekolah tidak dapat memakai aplikasi sampai status kembali aktif. Administrator tetap dapat masuk.'
  } else if (p.fallback) {
    uraian = 'Belum ada tahun ajaran tersimpan. Sistem memakai aturan bawaan Juli sampai Juni. Tambahkan tahun ajaran agar tanggal semester dapat diatur.'
  } else if (Number.isFinite(sisa)) {
    uraian = sisa > 0 ? 'Tahun ajaran berakhir ' + sisa + ' hari lagi (' + tgl(p.genap_selesai) + ').' : 'Hari ini hari terakhir tahun ajaran.'
  } else {
    uraian = ''
  }
  const dasar = tutup ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
  return `<section aria-label="Status periode" class="mb-6 rounded-2xl border ${dasar} p-5 shadow-sm">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span class="inline-flex items-center whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.kelas}">${esc(meta.label)}</span>
      <strong class="text-base font-bold text-slate-900">${p.tahun_ajaran ? 'Tahun ajaran ' + esc(p.tahun_ajaran) : 'Tahun ajaran'}${esc(semester)}</strong>
    </div>
    ${uraian ? `<p class="mt-2 text-sm font-medium text-slate-600">${uraian}</p>` : ''}
    ${p.tahun_ajaran_aktif ? `<p class="mt-2 text-xs font-semibold text-slate-500">Data siswa dan kelas saat ini berada di tahun ajaran ${esc(p.tahun_ajaran_aktif)}.</p>` : ''}
  </section>`
}

export function render(wadah, pengguna) {
  // Halaman khusus Administrator. Menu sudah disembunyikan; ini pengaman jika halaman dibuka langsung.
  if (!pengguna || pengguna.peran !== 'admin') {
    wadah.innerHTML = judulHalaman({ judul: 'Tahun Ajaran', sub: 'Halaman ini hanya dapat diakses Administrator Utama.' })
    return
  }
  let data = { periode: null, daftar: [], usulan: null }
  let layar = 0
  let urutan = 0

  const cari = (id) => data.daftar.find((r) => String(r.id) === String(id))

  function gambarIsi() {
    const isi = wadah.querySelector('[data-isi]')
    if (!isi) return
    const periode = data.periode || {}
    isiUlang(isi, kartuStatus(data.periode) + tabel({
      kolom: [
        {
          judul: 'Tahun Ajaran',
          html: (r) => `<strong class="text-slate-900">${esc(r.tahun_ajaran)}</strong>`
            + (r.tahun_ajaran === periode.tahun_ajaran ? ' <span class="ml-1 inline-block rounded-md border border-blue-200/80 bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">Saat ini</span>' : ''),
        },
        { judul: 'Semester Ganjil', nilai: (r) => rentang(r.ganjil_mulai, r.ganjil_selesai) },
        { judul: 'Semester Genap', nilai: (r) => rentang(r.genap_mulai, r.genap_selesai) },
        { judul: 'Kelas', rata: 'angka', nilai: (r) => r.jumlah_kelas },
        { judul: 'Kenaikan Kelas', di: 'tanda', html: (r) => lencanaKenaikan(r.kenaikan_status) + (r.backup_url ? '<div class="mt-2 text-xs">' + tautanBackup(r.backup_url) + '</div>' : '') },
      ],
      baris: data.daftar,
      aksi: (r) => [
        { aksi: 'ubah', label: 'Ubah', d: IKON.ubah, nonaktif: r.kenaikan_status === 'berjalan' },
        ...(r.kenaikan_status === 'belum' ? [{ aksi: 'salin-kelas', label: 'Buat kelas tahun ajaran baru', d: IKON.salin }] : []),
        ...(r.kenaikan_status !== 'selesai' ? [{ aksi: 'kenaikan', label: r.kenaikan_status === 'berjalan' ? 'Lanjutkan kenaikan kelas' : 'Pratinjau kenaikan kelas', d: IKON.aktif }] : []),
        ...(r.bisa_batal ? [{ aksi: 'batal-kenaikan', label: 'Batalkan kenaikan kelas', d: IKON.tutup, bahaya: true }] : []),
      ],
      kosong: {
        ikon: IK_TA,
        judul: 'Belum ada tahun ajaran',
        teks: 'Tambahkan tahun ajaran beserta tanggal semester lewat tombol Tambah Tahun Ajaran.',
      },
    }))
  }

  /* Muat dari server (AJAX). Hasil yang datang terlambat (layar sudah pindah) dibuang. */
  async function muat() {
    const saya = layar
    const urut = ++urutan
    const isi = wadah.querySelector('[data-isi]')
    if (!isi) return
    isi.innerHTML = memuat()
    try {
      const hasil = await panggilApi('tahunAjaranDaftar')
      if (saya !== layar || urut !== urutan || !wadah.isConnected) return
      data = { periode: hasil.periode || null, daftar: hasil.daftar || [], usulan: hasil.usulan || null }
      kabarkanPeriode(data.periode)
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
    wadah.innerHTML = judulHalaman({
      judul: 'Tahun Ajaran',
      sub: 'Atur tanggal semester. Tanggal ini menentukan kapan aplikasi aktif bagi Petugas TU dan Kepala Sekolah.',
      aksi: `<button type="button" data-aksi="tambah" class="${KELAS.utama}">Tambah Tahun Ajaran</button>`,
    }) + '<div data-isi></div>'
    pasangAksi(wadah, PETA_DAFTAR)
    if (segar) return muat()
    gambarIsi()
  }

  const PETA_DAFTAR = {
    tambah: () => tampilForm(null),
    ubah: (id) => { const r = cari(id); if (r && r.kenaikan_status !== 'berjalan') tampilForm(r) },
    'salin-kelas': (id) => salinKelas(id),
    kenaikan: (id) => bukaKenaikan(id),
    'batal-kenaikan': (id) => bukaKenaikan(id, true),
    'muat-ulang': () => muat(),
  }

  function bukaKenaikan(id, batal = false) {
    const tahun = cari(id)
    if (!tahun) return
    const saya = ++layar
    tampilKenaikan(wadah, tahun, { batal, kembali: () => tampilDaftar(true), masihAktif: () => saya === layar })
  }

  async function salinKelas(id) {
    const tahun = cari(id)
    if (!tahun || tahun.kenaikan_status !== 'belum') return
    try {
      const hasil = await tulisPeriode(() => panggilApi('tahunAjaranSalinKelas', { id }))
      kabarkanPeriode(hasil.periode)
      tampilPesan({ jenis: 'sukses', teks: (hasil.pesan || 'Kelas berhasil disalin.') + ' Kelas tingkat awal dibuat manual di Kelola Kelas.' })
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message + ' Daftar dimuat ulang untuk memeriksa hasil penyalinan.' })
    }
    if (wadah.isConnected) await muat()
  }

  function tampilForm(r) {
    const saya = ++layar
    const ubah = Boolean(r)
    const bawaan = data.usulan || { tahun_ajaran: '', ganjil_mulai: '', ganjil_selesai: '', genap_mulai: '', genap_selesai: '' }
    const nilai = ubah ? r : bawaan
    // Nama tahun ajaran dikunci bila sudah dipakai kelas atau kenaikan kelas (aturan server).
    const kunciNama = ubah && (Number(r.jumlah_kelas) > 0 || r.kenaikan_status !== 'belum')
    const lainnya = data.daftar.filter((x) => !ubah || x.id !== r.id)
    let disentuh = ubah // tanggal bawaan hanya diisi otomatis bila belum diubah manual

    const catatanForm = !ubah && !data.daftar.length
      ? 'Tahun ajaran pertama langsung dianggap berjalan.'
      : 'Aplikasi terkunci bagi Petugas TU dan Kepala Sekolah dari tanggal Ganjil mulai sampai kenaikan kelas tahun ajaran ini dijalankan.'

    wadah.innerHTML = judulHalaman({
      judul: ubah ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran',
      sub: ubah ? 'Perbarui tanggal semester, lalu simpan.' : 'Isi tahun ajaran dan tanggal semester, lalu simpan.',
      aksi: `<button type="button" data-aksi="kembali" class="${KELAS.tombol}">Kembali</button>`,
    }) + `<form novalidate class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div class="grid gap-5 sm:grid-cols-2">
        ${medan({
          label: 'Tahun ajaran', nama: 'tahun_ajaran', nilai: nilai.tahun_ajaran, wajib: true, penuh: true,
          placeholder: 'Contoh: 2026/2027', nonaktif: kunciNama,
          catatan: kunciNama ? 'Nama tidak dapat diubah karena sudah dipakai kelas atau kenaikan kelas.' : 'Tahun kedua = tahun pertama + 1.',
          atribut: { autocomplete: 'off', maxlength: '9' },
        })}
        ${medan({ label: 'Ganjil mulai', nama: 'ganjil_mulai', nilai: nilai.ganjil_mulai, wajib: true, tipe: 'date' })}
        ${medan({ label: 'Ganjil selesai', nama: 'ganjil_selesai', nilai: nilai.ganjil_selesai, wajib: true, tipe: 'date' })}
        ${medan({ label: 'Genap mulai', nama: 'genap_mulai', nilai: nilai.genap_mulai, wajib: true, tipe: 'date', catatan: 'Harus setelah Ganjil selesai.' })}
        ${medan({ label: 'Genap selesai', nama: 'genap_selesai', nilai: nilai.genap_selesai, wajib: true, tipe: 'date' })}
      </div>
      <p class="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">${esc(catatanForm)}</p>
      ${barSimpan()}</form>`
    window.scrollTo(0, 0)
    pasangAksi(wadah, { kembali: () => tampilDaftar(false) })

    const form = wadah.querySelector('form')
    form.addEventListener('input', (e) => {
      if (!e.target.name) return
      if (KOLOM_TANGGAL.includes(e.target.name)) disentuh = true
      bersihkanGalat(form, e.target.name)
    })
    form.addEventListener('change', (e) => {
      if (!e.target.name) return
      bersihkanGalat(form, e.target.name)
      // Tambah baru: ganti tahun ajaran mengisi ulang tanggal bawaan Juli-Juni selama belum diubah manual.
      if (e.target.name === 'tahun_ajaran' && !ubah && !disentuh && formatTaValid(e.target.value)) {
        const t = tanggalBawaan(e.target.value.trim())
        for (const k of KOLOM_TANGGAL) { form.elements[k].value = t[k]; bersihkanGalat(form, k) }
      }
    })
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (form.querySelector('[data-simpan]').disabled) return
      const isian = bacaForm(form, KOLOM_FORM)
      isian.tahun_ajaran = isian.tahun_ajaran.trim()
      let galat = periksa(isian, ATURAN)
      if (!Object.keys(galat).length) galat = cariBentrok(isian, lainnya)
      if (Object.keys(galat).length) { tandaiGalat(form, galat); notif.kolomGalat(); return }
      sibukSimpan(form, true)
      try {
        const hasil = await tulisPeriode(() => panggilApi('tahunAjaranSimpan', { id: ubah ? r.id : '', ...isian }))
        kabarkanPeriode(hasil.periode)
        tampilPesan({ jenis: 'sukses', teks: (hasil && hasil.pesan) || 'Tahun ajaran ' + isian.tahun_ajaran + ' disimpan' })
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
