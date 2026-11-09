import { esc, KELAS, tunda } from './ui.js'

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function filterAwal() {
  const sekarang = new Date()
  return {
    mode: 'tahun',
    tahun_ajaran: '',
    semester: '1',
    bulanNo: String(sekarang.getMonth() + 1),
    tahunBulan: String(sekarang.getFullYear()),
  }
}

export function parameterPeriode(f) {
  return {
    mode: f.mode,
    tahun_ajaran: f.tahun_ajaran,
    semester: f.semester,
    bulan: f.tahunBulan + '-' + f.bulanNo.padStart(2, '0'),
  }
}

const opsi = (nilai, label, pilih) => `<option value="${esc(nilai)}"${String(nilai) === String(pilih) ? ' selected' : ''}>${esc(label)}</option>`

export function formPeriode(f, daftarTA = []) {
  const sel = KELAS.kontrol
  return `<form class="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm print:hidden">
    <div class="flex flex-wrap items-center gap-3 flex-1">
      <select name="mode" aria-label="Jenis periode" class="${sel}">${opsi('tahun', 'Tahun ajaran', f.mode)}${opsi('semester', 'Semester', f.mode)}${opsi('bulan', 'Bulan', f.mode)}</select>
      ${f.mode !== 'bulan' ? `<select name="tahun_ajaran" aria-label="Tahun ajaran" class="${sel}">${daftarTA.map((t) => opsi(t, t, f.tahun_ajaran)).join('')}</select>` : ''}
      ${f.mode === 'semester' ? `<select name="semester" aria-label="Semester" class="${sel}">${opsi('1', 'Semester 1 (Jul-Des)', f.semester)}${opsi('2', 'Semester 2 (Jan-Jun)', f.semester)}</select>` : ''}
      ${f.mode === 'bulan' ? `<select name="bulanNo" aria-label="Bulan" class="${sel}">${NAMA_BULAN.map((b, i) => opsi(String(i + 1), b, f.bulanNo)).join('')}</select>
        <input name="tahunBulan" type="number" value="${esc(f.tahunBulan)}" aria-label="Tahun" class="${sel} w-28">` : ''}
    </div></form>`
}

/* Periode diterapkan otomatis (AJAX) setiap pilihan berubah; tidak ada tombol terpisah. */
export function pengendaliPeriode(wadah, saatTampil) {
  const s = { filter: filterAwal(), daftarTA: [] }
  const tanda = () => JSON.stringify(s.filter)
  let terakhir = tanda()

  function gambar(fokus) {
    wadah.innerHTML = formPeriode(s.filter, s.daftarTA)
    if (fokus) { const el = wadah.querySelector(`[name="${fokus}"]`); if (el) el.focus() }
  }
  function baca() {
    const form = wadah.querySelector('form')
    if (!form) return
    for (const el of form.elements) if (el.name && el.name in s.filter) s.filter[el.name] = el.value
  }
  function terapkan() {
    baca()
    const f = s.filter
    if (f.mode === 'bulan' && !/^\d{4}$/.test(String(f.tahunBulan))) return
    if (f.mode !== 'bulan' && !f.tahun_ajaran) return
    const t = tanda()
    if (t === terakhir) return
    terakhir = t
    saatTampil(s.filter)
  }
  const tundaTerapkan = tunda(terapkan, 500)

  wadah.addEventListener('input', (e) => {
    if (e.target.name === 'tahunBulan') { baca(); tundaTerapkan() }
  })
  wadah.addEventListener('change', (e) => {
    baca()
    if (e.target.name === 'mode') gambar('mode')
    terapkan()
  })
  wadah.addEventListener('submit', (e) => { e.preventDefault(); terapkan() })

  return {
    s,
    gambar,
    setDaftar(daftarTA, tahunAjaran) {
      const tampilTA = s.filter.mode !== 'bulan'
      const berubah = tampilTA && (JSON.stringify(daftarTA) !== JSON.stringify(s.daftarTA)
        || Boolean(tahunAjaran && s.filter.tahun_ajaran !== tahunAjaran))
      s.daftarTA = daftarTA
      if (tahunAjaran) s.filter.tahun_ajaran = tahunAjaran
      terakhir = tanda()
      // Gambar ulang hanya bila isi pilihan benar-benar berubah, supaya fokus pengguna tidak hilang.
      if (berubah || !wadah.querySelector('form')) {
        const aktif = wadah.contains(document.activeElement) ? document.activeElement.name : ''
        gambar(aktif)
      }
    },
  }
}