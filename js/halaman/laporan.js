import { panggilApi } from '../api.js'
import { esc, KELAS, memuat, statusKosong, tabel, galatMuat, pasangAksi, notif, namaJenisKelamin } from '../ui.js'
import { parameterPeriode, pengendaliPeriode } from '../periode.js'
import { persen } from '../util.js'
import { unduhExcel } from '../excel.js'
import { unduhPdfRekap, tanggalIndonesia } from '../pdf.js'
import { urutKelas } from '../urutKelas.js'

function teksSisa(sisa) {
  if (sisa < 0) return 'Lebih ' + Math.abs(sisa)
  if (sisa === 0) return '0 (penuh)'
  return String(sisa)
}

const atauStrip = (v) => (v === undefined || v === null || v === '' ? '-' : v)

function barisExcel(lap) {
  const s = lap.sekolah
  const p = lap.periode
  const r = lap.ringkasan
  return [
    {
      nama: 'Ringkasan',
      lebar: [30, 40],
      baris: [
        [s.nama], [s.alamat], ['NPSN', s.npsn], [],
        ['REKAPITULASI MUTASI SISWA MASUK'],
        ['Periode', p.label],
        ['Rentang tanggal', p.dari + ' s/d ' + p.sampai],
        ['Dicetak', lap.dicetak], [],
        ['Total siswa masuk', r.total_masuk],
        ['Siswa aktif (TA ' + p.tahun_ajaran + ')', r.siswa_aktif],
        ['Jumlah kelas', r.jumlah_kelas],
        ['Total kuota', r.total_kuota], [],
        ['Kepala Sekolah', s.kepala],
        ['NIP', s.nip],
      ],
    },
    {
      nama: 'Per Kelas',
      lebar: [16, 10, 10, 10, 18],
      baris: [
        ['Kelas', 'Kuota', 'Aktif', 'Sisa', 'Masuk (periode)'],
        ...lap.per_kelas.map((k) => [k.nama_kelas, k.kuota, k.aktif, k.sisa, k.masuk_periode]),
      ],
    },
    {
      nama: 'Daftar Mutasi',
      lebar: [5, 28, 14, 6, 10, 14, 26, 30, 16, 20],
      baris: [
        ['No', 'Nama siswa', 'NISN/NIS', 'JK', 'Kelas', 'Tanggal masuk', 'Sekolah asal', 'Alasan', 'Disetujui oleh', 'Tanggal persetujuan'],
        ...lap.daftar.map((m) => [
          m.no, m.nama_siswa, m.nisn_nis, m.jenis_kelamin, m.nama_kelas,
          m.tanggal, m.sekolah, m.alasan, m.disetujui_oleh ? 'Kepala Sekolah' : '', m.tanggal_persetujuan,
        ]),
      ],
    },
  ]
}

function tabelKelas(lap) {
  return tabel({
    kartu: false,
    idKey: 'nama_kelas',
    baris: lap.per_kelas,
    kosong: {
      judul: 'Belum ada kelas',
      teks: 'Belum ada kelas untuk tahun ajaran ' + lap.periode.tahun_ajaran + '. Pilih tahun ajaran lain di atas.',
    },
    kolom: [
      { judul: 'Kelas', rata: 'tengah', html: (k) => `<b class="font-bold text-slate-900">${esc(k.nama_kelas)}</b>` },
      { judul: 'Kuota', rata: 'tengah', nilai: (k) => k.kuota },
      {
        judul: 'Aktif',
        rata: 'tengah',
        html: (k) => `<span class="mx-auto mb-1 block h-2 w-20 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span class="block h-full bg-blue-600 rounded-full" style="width:${persen(k.aktif, k.kuota)}%"></span></span>${esc(k.aktif)}`,
      },
      { judul: 'Sisa', rata: 'tengah', html: (k) => `<span class="${k.sisa <= 0 ? 'font-bold text-rose-600' : 'font-semibold text-slate-800'}">${esc(teksSisa(k.sisa))}</span>` },
      { judul: 'Masuk (periode)', rata: 'tengah', nilai: (k) => k.masuk_periode },
    ],
  })
}

function tabelDaftar(lap) {
  return tabel({
    kartu: false,
    idKey: 'no',
    baris: lap.daftar,
    kosong: {
      judul: 'Belum ada siswa masuk',
      teks: 'Belum ada siswa masuk pada ' + lap.periode.label + '. Ubah periode di atas untuk melihat bulan atau tahun ajaran lain.',
    },
    kolom: [
      { judul: 'No', rata: 'tengah', nilai: (m) => m.no },
      { judul: 'Nama siswa', isi: 'kiri', html: (m) => `<b class="font-bold text-slate-900">${esc(m.nama_siswa)}</b>` },
      { judul: 'NISN/NIS', rata: 'tengah', nilai: (m) => atauStrip(m.nisn_nis) },
      { judul: 'Jenis Kelamin', rata: 'tengah', nilai: (m) => namaJenisKelamin(m.jenis_kelamin) },
      { judul: 'Kelas', rata: 'tengah', nilai: (m) => m.nama_kelas },
      { judul: 'Tanggal masuk', rata: 'tengah', nilai: (m) => tanggalIndonesia(m.tanggal) },
      { judul: 'Sekolah asal', isi: 'kiri', nilai: (m) => atauStrip(m.sekolah) },
      { judul: 'Alasan', isi: 'kiri', nilai: (m) => atauStrip(m.alasan) },
    ],
  })
}

function tampil(lap) {
  const r = lap.ringkasan
  const p = lap.periode
  const baris = (label, nilai) => `<div class="flex justify-between gap-4 border-t border-slate-100 py-2.5 first:border-t-0"><dt class="text-slate-500 font-medium">${esc(label)}</dt><dd class="font-bold text-slate-900">${esc(nilai)}</dd></div>`
  return `<section class="mt-6 grid gap-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:grid-cols-[1.2fr_1fr] sm:items-center" aria-label="Ringkasan periode">
      <div class="flex items-center gap-5">
        <div class="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span class="text-3xl font-extrabold text-blue-600">${esc(r.total_masuk)}</span>
        </div>
        <span class="flex flex-col font-bold text-slate-900 text-lg">Siswa Masuk, ${esc(p.label)}
          <small class="mt-1 text-xs font-semibold text-slate-400">${esc(tanggalIndonesia(p.dari))} s/d ${esc(tanggalIndonesia(p.sampai))}</small></span>
      </div>
      <dl class="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-sm">${baris('Siswa aktif (TA ' + p.tahun_ajaran + ')', r.siswa_aktif)}${baris('Jumlah kelas', r.jumlah_kelas)}${baris('Total kuota', r.total_kuota)}</dl>
    </section>
    <section class="mt-8" aria-labelledby="lp-kelas">
      <h3 id="lp-kelas" class="text-lg font-bold text-slate-900">Keterisian Kelas</h3>
      <p class="mb-3 text-sm font-medium text-slate-500">Kelas mana yang sudah penuh dan berapa siswa masuk di tiap kelas.</p>
      ${tabelKelas(lap)}
    </section>
    <section class="mt-8" aria-labelledby="lp-daftar">
      <h3 id="lp-daftar" class="mb-3 text-lg font-bold text-slate-900">Daftar Siswa Masuk</h3>
      ${tabelDaftar(lap)}
    </section>
    <p class="mt-6 text-xs font-medium text-slate-400 text-right">Data per ${esc(lap.dicetak)}</p>`
}

export function render(wadah) {
  wadah.innerHTML = `<div class="mx-auto max-w-5xl">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-4 border-b border-slate-200 pb-6">
      <div class="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center shrink-0">
        <img src="assets/logo-sekolah.png" alt="Logo sekolah" width="48" height="48" class="h-10 w-10 object-contain" onerror="this.src='assets/favicon.svg'">
      </div>
      <div class="min-w-0 flex-1 basis-40">
        <p data-sekolah class="text-xs font-bold uppercase tracking-wider text-blue-600"></p>
        <h2 class="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Laporan Rekapitulasi</h2>
        <p class="text-sm font-medium text-slate-500">Data siswa masuk yang telah disetujui Kepala Sekolah</p>
      </div>
      <div class="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center shrink-0">
        <img src="assets/logo-bonbol.png" alt="Logo Bonbol" width="48" height="48" class="h-10 w-10 object-contain" onerror="this.closest('div').style.display='none'">
      </div>
      <div class="grid w-full grid-cols-3 gap-2 sm:flex sm:w-full sm:justify-end sm:gap-2.5 print:hidden">
        <button type="button" data-pdf class="${KELAS.utama} !px-2 sm:!px-4" disabled>Unduh PDF</button>
        <button type="button" data-excel class="${KELAS.tombol} !px-2 sm:!px-4" disabled>Unduh Excel</button>
        <button type="button" data-cetak class="${KELAS.tombol} !px-2 sm:!px-4" disabled>Cetak</button>
      </div>
    </div>
    <section class="mt-6 print:hidden" aria-labelledby="lp-periode"><h3 id="lp-periode" class="mb-3 font-bold text-slate-900">Filter Periode Laporan</h3><div data-periode></div></section>
    <div data-isi></div></div>`

  const isi = wadah.querySelector('[data-isi]')
  const tPdf = wadah.querySelector('[data-pdf]')
  const tExcel = wadah.querySelector('[data-excel]')
  const tCetak = wadah.querySelector('[data-cetak]')
  const periode = pengendaliPeriode(wadah.querySelector('[data-periode]'), () => muat())
  periode.gambar()

  let lap = null
  let urutan = 0
  let sibuk = false

  function aturTombol(sedangPdf = false) {
    const mati = !lap || sibuk
    tPdf.disabled = mati
    tExcel.disabled = mati
    tCetak.disabled = mati
    tPdf.textContent = sedangPdf ? 'Memproses...' : 'Unduh PDF'
  }

  async function muat() {
    const saya = ++urutan
    lap = null
    sibuk = true
    aturTombol()
    isi.innerHTML = memuat('Mengambil data laporan dari server...')
    try {
      const hasil = await panggilApi('laporanRekap', parameterPeriode(periode.s.filter))
      if (saya !== urutan || !isi.isConnected) return
      hasil.per_kelas = [...(hasil.per_kelas || [])].sort(urutKelas)
      lap = hasil
      periode.setDaftar(hasil.daftar_tahun_ajaran, hasil.periode.tahun_ajaran)
      wadah.querySelector('[data-sekolah]').textContent = hasil.sekolah.nama
      isi.innerHTML = tampil(hasil)
    } catch (err) {
      if (saya !== urutan || !isi.isConnected) return
      isi.innerHTML = galatMuat('Laporan tidak bisa dimuat. ' + err.message + ' Periksa koneksi internet, lalu coba lagi.')
    } finally {
      if (saya === urutan) { sibuk = false; aturTombol() }
    }
  }

  async function unduh(jenis) {
    if (!lap || sibuk) return
    sibuk = true
    aturTombol(jenis === 'pdf')
    try {
      if (jenis === 'pdf') {
        const nama = await unduhPdfRekap(lap)
        notif.sukses('PDF berhasil diunduh: ' + nama)
      } else {
        await unduhExcel('Rekap-Mutasi-' + lap.periode.label.replace(/[^A-Za-z0-9]+/g, '-') + '.xlsx', barisExcel(lap))
      }
    } catch (err) {
      notif.galat((jenis === 'pdf' ? 'PDF' : 'Excel') + ' gagal dibuat. ' + err.message)
    } finally {
      sibuk = false
      if (wadah.isConnected) aturTombol()
    }
  }

  pasangAksi(isi, { 'muat-ulang': () => muat() })
  tPdf.addEventListener('click', () => unduh('pdf'))
  tExcel.addEventListener('click', () => unduh('excel'))
  tCetak.addEventListener('click', () => window.print())
  muat()
}