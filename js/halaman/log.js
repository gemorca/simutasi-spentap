import { panggilApi } from '../api.js'
import { esc, KELAS, IKON, memuat, judulHalaman, tabel, galatMuat, pasangAksi, tandaiMemuat } from '../ui.js'
import { pasangFilter } from '../mutasiFilter.js'

const LAB = 'grid gap-1.5 text-sm font-semibold text-slate-800'

function formFilter() {
  const isi = `${KELAS.kontrol} font-normal`
  return `<form data-filter role="search" class="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
    <label class="${LAB} min-w-[12rem] flex-1">Cari Log
      <input name="q" placeholder="Pengguna, aksi, atau detail" autocomplete="off" class="${KELAS.input} font-normal"></label>
    <label class="${LAB}">Aksi
      <select name="aksi" class="${isi}"><option value="">Semua aksi</option></select></label>
    <label class="${LAB}">Dari Tanggal
      <input name="dari" type="date" class="${isi}"></label>
    <label class="${LAB}">Sampai Tanggal
      <input name="sampai" type="date" class="${isi}"></label></form>`
}

export function render(wadah) {
  const filter = { q: '', aksi: '', dari: '', sampai: '' }
  let urutan = 0

  wadah.innerHTML = judulHalaman({
    judul: 'Log Aktivitas',
    sub: 'Jejak aktivitas pengguna. Menampilkan hingga 3000 log terbaru.',
  }) + formFilter() + '<div data-isi></div>'

  const form = wadah.querySelector('[data-filter]')
  const isi = wadah.querySelector('[data-isi]')

  function isiPilihanAksi(daftar) {
    const sel = form.elements.aksi
    const dipilih = filter.aksi
    sel.innerHTML = '<option value="">Semua aksi</option>' + daftar.map((a) =>
      `<option value="${esc(a)}"${a === dipilih ? ' selected' : ''}>${esc(a)}</option>`).join('')
  }

  function gambar(hasil) {
    isi.innerHTML = `<p class="mb-3 text-sm font-semibold text-slate-500">Total Data: <strong class="text-slate-900 font-bold">${esc(hasil.total)}</strong>${hasil.dipotong ? ' (ditampilkan 300 terbaru, persempit pencarian)' : ''}</p>`
      + tabel({
        kolom: [
          { judul: 'Waktu (WITA)', nilai: (l) => l.waktu },
          { judul: 'Pengguna', nilai: (l) => l.pengguna },
          { judul: 'Aksi', html: (l) => `<strong class="text-slate-900 font-bold">${esc(l.aksi)}</strong>` },
          { judul: 'Objek', nilai: (l) => l.objek },
          { judul: 'Detail', isi: 'kiri', nilai: (l) => l.detail },
        ],
        baris: hasil.daftar,
        kosong: { ikon: IKON.info, judul: 'Tidak ada log ditemukan', teks: 'Ubah kata kunci, aksi, atau rentang tanggal.' },
      })
  }

  async function muat(senyap = false) {
    const saya = ++urutan
    if (senyap && isi.firstElementChild) tandaiMemuat(isi, true)
    else isi.innerHTML = memuat()
    try {
      const hasil = await panggilApi('logDaftar', filter)
      if (saya !== urutan || !isi.isConnected) return
      isiPilihanAksi(hasil.daftar_aksi)
      gambar(hasil)
    } catch (err) {
      if (saya !== urutan || !isi.isConnected) return
      isi.innerHTML = galatMuat(err.message)
    } finally {
      if (saya === urutan) tandaiMemuat(isi, false)
    }
  }

  pasangAksi(wadah, { 'muat-ulang': () => muat() })
  pasangFilter(form, filter, () => muat(true))
  muat()
}
