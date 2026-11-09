import { panggilApi } from '../api.js'
import { esc, ikon, memuat, judulHalaman, statusKosong, tampilPesan } from '../ui.js'
import { NAMA_BULAN, parameterPeriode, pengendaliPeriode } from '../periode.js'
import { persen } from '../util.js'
import { sapaanWaktu } from '../sapaan.js'
import { urutKelas } from '../urutKelas.js'

const IK_MASUK = 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6'
const IK_AKTIF = 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'
const IK_KUOTA = 'M3 7l9-4 9 4-9 4-9-4ZM3 12l9 4 9-4M3 17l9 4 9-4'
const IK_TUNGGU = 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2'
const IK_GRAFIK = 'M3 3v18h18M7 16v-4M12 16V8M17 16v-7'
const IK_KELAS = 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6'

const labelBulan = (kunci) => NAMA_BULAN[Number(kunci.split('-')[1]) - 1].substring(0, 3)
const labelPanjang = (kunci) => { const [t, b] = kunci.split('-'); return NAMA_BULAN[Number(b) - 1] + ' ' + t }

function kartuStat(d, angka, label, sorot = false) {
  return `<div class="ringkas-k ${sorot ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300' : ''}">
    <div class="ikon-chip h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center shrink-0 border border-blue-100">
      ${ikon(d, 'h-6 w-6')}
    </div>
    <div class="min-w-0">
      <b class="block text-2xl font-extrabold text-slate-900 leading-tight">${esc(angka)}</b>
      <span class="ringkas-l text-xs font-semibold text-slate-500">${esc(label)}</span>
    </div>
  </div>`
}

function grafik(tren) {
  const n = tren.length
  const maks = Math.max(1, ...tren.map((t) => t.jumlah))
  const L = Math.max(n * 52, 280), T = 190, bawah = 26, atas = 24
  const plot = T - atas - bawah
  const ringkasan = tren.map((t) => labelPanjang(t.bulan) + ': ' + t.jumlah).join('; ')
  const kolom = tren.map((t, i) => {
    const tinggi = t.jumlah === 0 ? 0 : Math.max(3, (t.jumlah / maks) * plot)
    const x = (L / n) * (i + 0.5)
    const puncak = t.jumlah === maks && maks > 0
    return `<g>
      <rect class="bar-grafik ${puncak ? 'fill-blue-600' : 'fill-blue-300'}" x="${x - 14}" y="${T - bawah - tinggi}" width="28" height="${tinggi}" rx="6"/>
      <text class="fill-slate-800 text-xs font-bold" x="${x}" y="${T - bawah - tinggi - 6}" text-anchor="middle">${esc(t.jumlah)}</text>
      <text class="fill-slate-500 text-[11px] font-semibold" x="${x}" y="${T - 8}" text-anchor="middle">${esc(labelBulan(t.bulan))}</text></g>`
  }).join('')
  return `<div class="overflow-x-auto p-2" tabindex="0" role="region" aria-label="Grafik tren, dapat digeser"><svg class="block h-auto max-h-60 w-full" viewBox="0 0 ${L} ${T}" role="img" style="min-width:${Math.min(L, n * 40)}px"
    aria-label="${esc('Grafik siswa masuk per bulan. ' + ringkasan)}">
    <line class="stroke-slate-200" stroke-width="1.5" x1="0" x2="${L}" y1="${T - bawah}" y2="${T - bawah}"/>${kolom}</svg></div>`
}

function tingkat(aktif, kuota) {
  const p = kuota > 0 ? (aktif / kuota) * 100 : 0
  return p >= 100 ? 'penuh' : p >= 80 ? 'hampir' : 'biasa'
}
const WARNA = { biasa: ['text-blue-600', 'bg-blue-600'], hampir: ['text-amber-600', 'bg-amber-500'], penuh: ['text-rose-600', 'bg-rose-600'] }

function kartuKelas(k) {
  const t = tingkat(k.aktif, k.kuota)
  const [teks, bar] = WARNA[t]
  const p = Math.min(100, persen(k.aktif, k.kuota))
  const status = t === 'penuh' ? 'Penuh' : t === 'hampir' ? 'Hampir penuh' : 'Sisa ' + k.sisa
  return `<article class="kelas-kartu rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
    <div class="flex items-center justify-between gap-2">
      <h4 class="font-bold text-slate-900">${esc(k.nama_kelas)}</h4>
      <span class="text-xs font-bold ${teks} bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">${esc(status)}</span>
    </div>
    <div class="my-3.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin="0" aria-valuemax="${esc(k.kuota)}"
      aria-valuenow="${esc(k.aktif)}" aria-label="${esc('Keterisian kelas ' + k.nama_kelas)}"><div class="h-full min-w-[2px] ${bar} rounded-full" style="width:${p}%"></div></div>
    <p class="mb-3.5 text-sm font-medium text-slate-500"><strong class="text-slate-900 font-bold">${esc(k.aktif)}</strong> dari ${esc(k.kuota)} siswa</p>
    <dl class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm">
      <div><dt class="text-xs font-medium text-slate-400">Sisa Kuota</dt><dd class="font-bold ${k.sisa <= 0 ? 'text-rose-600' : 'text-slate-800'}">${esc(k.sisa)}</dd></div>
      <div><dt class="text-xs font-medium text-slate-400">Masuk Periode</dt><dd class="font-bold text-slate-800">${esc(k.masuk_periode)}</dd></div></dl></article>`
}

const judulSeksi = (id, d, teks, ta) =>
  `<h3 id="${id}" class="mb-4 flex flex-wrap items-center gap-2.5 text-lg font-bold text-slate-900">${ikon(d, 'h-5 w-5 text-blue-600')} ${esc(teks)} <small class="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">TA ${esc(ta)}</small></h3>`

function tampil(d) {
  const k = d.kartu, p = d.periode
  const adaTren = d.tren.some((t) => t.jumlah > 0)
  return `<p class="mb-5 text-sm font-medium text-slate-500">Periode Aktif: <strong class="text-slate-900 font-bold">${esc(p.label)}</strong> (${esc(p.dari)} s/d ${esc(p.sampai)})</p>
    <div class="ringkas">
      ${kartuStat(IK_MASUK, k.total_masuk, 'Siswa masuk (periode ini)')}
      ${kartuStat(IK_AKTIF, k.total_aktif, 'Siswa aktif (TA ' + p.tahun_ajaran + ')')}
      ${kartuStat(IK_KUOTA, k.sisa_kuota, 'Sisa kuota (' + k.kelas_penuh + ' kelas penuh)')}
      ${kartuStat(IK_TUNGGU, k.menunggu, 'Menunggu persetujuan', k.menunggu > 0)}
    </div>
    <section class="ringkas-seksi mb-8 rounded-2xl border border-slate-200/80 bg-white shadow-sm" aria-labelledby="dash-tren">
      ${judulSeksi('dash-tren', IK_GRAFIK, 'Tren siswa masuk per bulan', p.tahun_ajaran)}
      ${adaTren ? grafik(d.tren) : statusKosong({ ikon: IK_GRAFIK, judul: 'Belum ada siswa masuk', teks: 'Grafik muncul setelah ada mutasi siswa masuk pada tahun ajaran ini.' })}
    </section>
    <section aria-labelledby="dash-kelas">
      ${judulSeksi('dash-kelas', IK_KELAS, 'Rekapitulasi per Kelas', p.tahun_ajaran)}
      ${d.per_kelas.length === 0
        ? statusKosong({ ikon: IK_KELAS, judul: 'Belum ada kelas', teks: 'Tambahkan kelas pada menu Kelas agar rekap kuota tampil di sini.' })
        : `<div class="stagger grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16rem),1fr))]">${[...d.per_kelas].sort(urutKelas).map(kartuKelas).join('')}</div>`}
    </section>`
}

export function render(wadah, pengguna) {
  wadah.innerHTML = judulHalaman({
    judul: 'Beranda Utama',
    subHtml: esc(sapaanWaktu() + ', ') + '<strong class="sapaan-nama">' + esc(pengguna.nama) + '</strong>.',
  }) + '<div data-periode></div><div data-isi></div>'
  const isi = wadah.querySelector('[data-isi]')
  const periode = pengendaliPeriode(wadah.querySelector('[data-periode]'), () => muat())
  periode.gambar()

  let urutan = 0
  async function muat() {
    const saya = ++urutan
    isi.innerHTML = memuat('Memuat dashboard...')
    try {
      const d = await panggilApi('dashboard', parameterPeriode(periode.s.filter))
      if (saya !== urutan || !isi.isConnected) return
      periode.setDaftar(d.daftar_tahun_ajaran, d.periode.tahun_ajaran)
      isi.innerHTML = tampil(d)
    } catch (err) {
      if (saya !== urutan || !isi.isConnected) return
      isi.innerHTML = ''
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }
  muat()
}