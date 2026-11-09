import { esc, KELAS, tunda } from './ui.js'

export function opsiKelas(kelas, nilai) {
  return '<option value="">Semua kelas</option>' + kelas.map((k) =>
    `<option value="${esc(k.id)}"${String(k.id) === String(nilai) ? ' selected' : ''}>${esc(k.nama_kelas + ' - ' + k.tahun_ajaran)}</option>`).join('')
}

export function formFilterMutasi(filter, kelas, opsiStatus, denganTanggal = true) {
  const lab = 'grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800'
  const isi = `${KELAS.kontrol} font-normal`
  return `<form data-filter role="search" class="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
    <label class="${lab} flt-cari min-w-[12rem] flex-1">Cari Data
      <input name="q" value="${esc(filter.q)}" placeholder="Nama siswa atau sekolah asal" autocomplete="off" class="${isi}"></label>
    <label class="${lab} flt-lain">Filter Kelas
      <select name="kelas_id" class="${isi}">${opsiKelas(kelas, filter.kelas_id)}</select></label>
    <label class="${lab} flt-lain">Status Mutasi
      <select name="status" class="${isi}">${opsiStatus.map((o) =>
        `<option value="${esc(o.nilai)}"${o.nilai === filter.status ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
    ${denganTanggal ? `<label class="${lab} flt-lain">Dari Tanggal
      <input name="dari" type="date" value="${esc(filter.dari)}" class="${isi}"></label>
    <label class="${lab} flt-lain">Sampai Tanggal
      <input name="sampai" type="date" value="${esc(filter.sampai)}" class="${isi}"></label>` : ''}</form>`
}

/* Filter berjalan otomatis (AJAX): teks dicari setelah berhenti mengetik, pilihan langsung diterapkan. */
export function pasangFilter(form, filter, onCari) {
  const baca = () => { for (const n of Object.keys(filter)) if (form.elements[n]) filter[n] = form.elements[n].value }
  let terakhir = JSON.stringify(filter)
  const terapkan = () => {
    baca()
    const tanda = JSON.stringify(filter)
    if (tanda === terakhir) return
    terakhir = tanda
    onCari()
  }
  const tundaCari = tunda(terapkan, 400)
  form.addEventListener('input', (e) => { baca(); if (e.target.name === 'q') tundaCari() })
  form.addEventListener('change', terapkan)
  form.addEventListener('submit', (e) => { e.preventDefault(); terapkan() })
}