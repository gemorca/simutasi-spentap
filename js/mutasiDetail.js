import { panggilApi } from './api.js'
import { unduhPdfSurat } from './pdf.js'
import { fileKeBase64, base64KeUrl, persen, kompresGambar } from './util.js'
import {
  esc, KELAS, spinner, barProgres, namaJenisKelamin, memuat, judulHalaman, lencana, banner, galatMuat, isiUlang, pasangAksi,
  dialogKonfirmasi, dialogTanya, tampilPesan,
} from './ui.js'

const NAMA_AKSI = {
  MUTASI_TAMBAH: 'Dibuat',
  MUTASI_UBAH: 'Data diubah',
  MUTASI_AJUKAN: 'Diajukan',
  MUTASI_SETUJUI: 'Disetujui',
  MUTASI_TOLAK: 'Ditolak',
  MUTASI_BATAL_SETUJU: 'Persetujuan dibatalkan',
  MUTASI_NOMOR_SURAT: 'Nomor surat diubah',
  MUTASI_SURAT_TERBIT: 'Surat diterbitkan',
  MUTASI_ARSIP_IMPOR: 'Diimpor sebagai arsip',
  MUTASI_ARSIP_LENGKAPI: 'Data arsip dilengkapi',
  LAMPIRAN_UNGGAH: 'Lampiran diunggah',
  LAMPIRAN_HAPUS: 'Lampiran dihapus',
}
const BATAS_RIWAYAT = 5
const FOTO = 'Pas Foto'
const EKSTENSI_FOTO = /\.(jpe?g|png)$/i
const TAB_ID = ['data', 'lampiran', 'riwayat']
const KOTAK_STATUS = {
  Ditolak: 'border-rose-200 bg-rose-50 text-rose-900',
  Diajukan: 'border-blue-200 bg-blue-50 text-blue-900',
  Disetujui: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

/* Simpan detail yang sedang dibuka di localStorage, supaya refresh halaman kembali ke detail yang sama. */
const KUNCI_TERBUKA = 'sim_mutasi_terbuka'
let sudahPulih = false

export function pulihkanTerbuka(pemilik) {
  if (sudahPulih) return null
  sudahPulih = true
  try {
    const x = JSON.parse(localStorage.getItem(KUNCI_TERBUKA))
    return x && x.pemilik === pemilik && x.id ? x : null
  } catch { return null }
}
export function hapusTerbuka() {
  try { localStorage.removeItem(KUNCI_TERBUKA) } catch { /* penyimpanan tidak tersedia */ }
}
function tulisTerbuka(pemilik, id, tab) {
  try { localStorage.setItem(KUNCI_TERBUKA, JSON.stringify({ pemilik, id, tab })) } catch { /* penyimpanan penuh/diblokir */ }
}

export function renderDetail(wadah, { id, pemilik = '', tabAwal = 'data', hanyaBaca = false, bisaPutuskan = false, bisaBatalkan = false, bisaHapusMutasi = false, bisaUbahNomor = false, onKembali, onUbah }) {
  const akar = document.createElement('div')
  akar.className = 'mut-detail'
  wadah.innerHTML = ''
  wadah.appendChild(akar)

  let detail = null
  let riwayat = []
  let catatan = ''
  let info = ''
  let sibuk = false
  let tab = TAB_ID.includes(tabAwal) ? tabAwal : 'data'
  let semuaRiwayat = false
  let fotoUrl = { id: '', url: '' }
  let fotoMemuat = ''

  const simpan = () => { if (pemilik) tulisTerbuka(pemilik, id, tab) }
  const keluar = () => { hapusTerbuka(); onKembali() }
  simpan()

  const tombolKembali = `<p class="mb-4"><button type="button" data-aksi="kembali" class="${KELAS.tombol}">Kembali ke daftar</button></p>`

  const ambil = async () => {
    const [d, r] = await Promise.all([panggilApi('mutasiDetail', { id }), panggilApi('mutasiRiwayat', { id })])
    if (!akar.isConnected) return false
    detail = d
    riwayat = r
    return true
  }

  async function muatAwal() {
    akar.innerHTML = tombolKembali + memuat()
    try {
      if (await ambil()) gambar()
    } catch (err) {
      if (/tidak ditemukan/i.test(err.message)) hapusTerbuka()
      if (akar.isConnected) akar.innerHTML = tombolKembali + galatMuat(err.message)
    }
  }

  async function segarkan() {
    try {
      if (await ambil()) gambar()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  function setSibuk(b) {
    sibuk = b
    akar.querySelectorAll('[data-sibuk]').forEach((el) => { el.disabled = b })
    akar.querySelectorAll('[data-unggah]').forEach((el) => el.classList.toggle('pointer-events-none', b))
    akar.querySelectorAll('[data-unggah]').forEach((el) => el.classList.toggle('opacity-50', b))
  }

  function setInfo(teks) {
    info = teks
    const el = akar.querySelector('[data-pesan]')
    if (el) el.innerHTML = info ? banner({ teks: info }) : ''
  }

  const tombol = (aksi, teks, kelas = KELAS.tombol) =>
    `<button type="button" data-aksi="${aksi}" data-sibuk class="${kelas}"${sibuk ? ' disabled' : ''}>${esc(teks)}</button>`

  function kotakStatus(m) {
    const oleh = m.disetujui_oleh ? ' oleh Kepala Sekolah' : ''
    const tgl = m.tanggal_persetujuan ? ' (' + m.tanggal_persetujuan + ')' : ''
    let judul = ''
    let baris = ''
    if (m.status === 'Ditolak') {
      judul = 'Ditolak' + oleh + tgl
      if (m.catatan_persetujuan) baris += `<p class="mt-1">Alasan: &ldquo;${esc(m.catatan_persetujuan)}&rdquo;</p>`
      if (!hanyaBaca) baris += '<p class="mt-1">Perbaiki data atau lampiran, lalu ajukan lagi.</p>'
    } else if (m.status === 'Diajukan') {
      judul = 'Menunggu keputusan Kepala Sekolah'
      if (m.diajukan_oleh) baris += `<p class="mt-1">Diajukan oleh ${esc(m.diajukan_oleh)} (${esc(m.tanggal_diajukan)})</p>`
    } else if (m.status === 'Disetujui' && m.sumber === 'arsip') {
      judul = 'Data arsip (diimpor Admin)' + (m.tanggal_persetujuan ? ' (' + m.tanggal_persetujuan + ')' : '')
      baris += '<p class="mt-1">Dicatat dari data manual lama. Biodata dan lampiran dapat dilengkapi kapan saja. Tanpa surat keterangan di sistem.</p>'
    } else if (m.status === 'Disetujui') {
      judul = 'Disetujui' + oleh + tgl
      baris += m.nomor_surat
        ? `<p class="mt-1">Nomor surat: <strong>${esc(m.nomor_surat)}</strong> &middot; ${m.tanggal_terbit ? 'diterbitkan ' + esc(m.tanggal_terbit) : 'belum diterbitkan (nomor masih bisa diubah)'}</p>`
        : '<p class="mt-1">Nomor surat belum diisi. Petugas TU mengetiknya saat mencetak surat.</p>'
      if (m.catatan_persetujuan) baris += `<p class="mt-1">Catatan: &ldquo;${esc(m.catatan_persetujuan)}&rdquo;</p>`
    } else {
      return ''
    }
    return `<div role="status" class="mb-5 rounded-2xl border p-4 text-sm font-medium ${KOTAK_STATUS[m.status]}"><strong class="font-bold text-base block">${esc(judul)}</strong>${baris}</div>`
  }

  function fotoLampiran() {
    return detail.lampiran.find((l) => l.jenis_dokumen === FOTO && EKSTENSI_FOTO.test(String(l.nama_file))) || null
  }

  function isiFoto(m) {
    const f = fotoLampiran()
    if (f && fotoUrl.id === f.id && fotoUrl.url) {
      return `<img src="${esc(fotoUrl.url)}" alt="${esc('Pas foto ' + m.nama_siswa)}" class="h-full w-full object-cover">`
    }
    const inisial = String(m.nama_siswa || '?').trim().charAt(0).toUpperCase()
    return `<span class="text-3xl font-bold text-slate-400" aria-hidden="true">${esc(inisial)}</span>`
  }

  async function muatFoto() {
    const f = fotoLampiran()
    if (!f || fotoUrl.id === f.id || fotoMemuat === f.id) return
    fotoMemuat = f.id
    try {
      const data = await panggilApi('lampiranAmbil', { id: f.id })
      if (!akar.isConnected) return
      if (fotoUrl.url) URL.revokeObjectURL(fotoUrl.url)
      fotoUrl = { id: f.id, url: base64KeUrl(data.mime, data.base64) }
      const el = akar.querySelector('[data-foto]')
      if (el) el.innerHTML = isiFoto(detail.mutasi)
    } catch (err) {
      /* foto gagal dimuat: tetap tampilkan inisial */
    } finally {
      fotoMemuat = ''
    }
  }

  function kartuHeader(m) {
    const arsip = m.sumber === 'arsip'
    const { lampiran, wajib } = detail
    const ada = (jd) => lampiran.some((l) => l.jenis_dokumen === jd)
    const lengkap = wajib.filter(ada).length
    const pers = persen(lengkap, wajib.length)
    const semua = wajib.length > 0 && lengkap === wajib.length
    const chip = (jd) => {
      const ok = ada(jd)
      return `<li class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : arsip ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-rose-200 bg-rose-50 text-rose-700'}">`
        + `<span aria-hidden="true">${ok ? '&#10003;' : '&#10007;'}</span>${esc(jd)}<span class="sr-only">${ok ? ' (lengkap)' : ' (belum ada)'}</span></li>`
    }
    return `<section aria-label="Ringkasan siswa dan kelengkapan berkas" class="mb-5 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div data-foto class="flex h-32 w-24 shrink-0 items-center justify-center self-start overflow-hidden rounded-xl border border-slate-200 bg-slate-100">${isiFoto(m)}</div>
      <div class="min-w-0 flex-1">
        <dl class="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt class="text-xs font-semibold text-slate-400">NISN/NIS</dt><dd class="font-semibold text-slate-800">${esc(m.nisn_nis || '-')}</dd></div>
          <div><dt class="text-xs font-semibold text-slate-400">Kelas tujuan</dt><dd class="font-semibold text-slate-800">${esc(m.nama_kelas || '-')}</dd></div>
          <div><dt class="text-xs font-semibold text-slate-400">Tanggal masuk</dt><dd class="font-semibold text-slate-800">${esc(m.tanggal || '-')}</dd></div>
        </dl>
        <div class="mb-2 flex items-center justify-between gap-2 text-sm">
          <span class="font-bold text-slate-900">Kelengkapan berkas${arsip ? ' (opsional)' : ''}</span>
          <span class="flex items-center gap-2"><span class="font-semibold text-slate-500">${lengkap} dari ${wajib.length}</span>${lencana(semua ? 'Disetujui' : arsip ? 'Diajukan' : 'Ditolak', semua ? 'Lengkap' : 'Belum lengkap')}</span></div>
        <div class="mb-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin="0" aria-valuemax="${wajib.length}" aria-valuenow="${lengkap}" aria-label="Kelengkapan berkas wajib">
          <div class="h-full min-w-[2px] rounded-full bg-blue-600" style="width:${pers}%"></div></div>
        <ul class="flex flex-wrap gap-2">${wajib.map(chip).join('')}</ul>
      </div></section>`
  }

  function panelData(m) {
    const jk = m.jenis_kelamin === 'L' ? 'Laki-laki' : m.jenis_kelamin === 'P' ? 'Perempuan' : m.jenis_kelamin
    const kelompok = [
      ['Siswa', [
        ['Nama siswa', m.nama_siswa],
        ['NISN/NIS', m.nisn_nis || '-'],
        ['Jenis kelamin', jk],
        ['Tempat, tanggal lahir', (m.tempat_lahir || '-') + ', ' + (m.tanggal_lahir || '-')],
        ['Alamat', m.alamat],
      ]],
      ['Penempatan', [
        ['Kelas tujuan', m.nama_kelas],
        ['Tanggal masuk', m.tanggal],
      ]],
      ['Asal dan alasan pindah', [
        ['Sekolah asal', m.sekolah],
        ['Alasan', m.alasan],
        ['Catatan petugas', m.catatan || '-'],
      ]],
    ]
    return `<div role="tabpanel" id="panel-data" aria-labelledby="tab-data" class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">${kelompok.map(([judul, baris]) =>
      `<section aria-label="${esc(judul)}" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="mb-4 font-bold text-slate-900 border-b border-slate-100 pb-2">${esc(judul)}</h3>
        <dl class="grid gap-3.5 text-sm">${baris.map(([label, nilai]) =>
          `<div><dt class="text-xs font-semibold text-slate-400">${esc(label)}</dt><dd class="break-words font-semibold text-slate-800 mt-0.5">${esc(nilai)}</dd></div>`).join('')}</dl></section>`).join('')}</div>`
  }

  function panelLampiran(bisaUbah) {
    const arsip = detail.mutasi.sumber === 'arsip'
    const { lampiran, wajib, maks_mb: maksMb } = detail
    const lengkap = wajib.filter((jd) => lampiran.some((l) => l.jenis_dokumen === jd)).length
    const daftar = wajib.concat(['Lainnya']).map((jd) => {
      const files = lampiran.filter((l) => l.jenis_dokumen === jd)
      const wajibIni = wajib.includes(jd)
      return `<li class="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="min-w-0">
          <div class="mb-3 flex items-center justify-between gap-2"><span class="font-bold text-slate-900">${esc(jd)}</span>
            ${wajibIni && !arsip ? lencana(files.length ? 'Disetujui' : 'Ditolak', files.length ? 'Lengkap' : 'Belum') : '<span class="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Opsional</span>'}</div>
          ${files.length === 0 ? '<p class="text-sm font-medium text-slate-400">Belum ada file terunggah</p>' : ''}
          ${files.map((l) => `<div class="flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 py-1.5 text-sm">
            <span class="min-w-0 flex-1 truncate font-semibold text-slate-700" title="${esc(l.nama_file)}">${esc(l.nama_file)}</span>
            <span class="flex shrink-0 gap-1.5">
              <button type="button" data-aksi="lihat" data-id="${esc(l.id)}" class="${KELAS.tombol} ${KELAS.kecil}">Lihat File</button>
              ${bisaUbah && bisaHapusMutasi ? `<button type="button" data-aksi="hapus-lampiran" data-id="${esc(l.id)}" data-sibuk class="${KELAS.tombol} ${KELAS.kecil} text-rose-600 hover:bg-rose-50 border-rose-200"${sibuk ? ' disabled' : ''}>Hapus</button>` : ''}
            </span></div>`).join('')}
        </div>
        ${bisaUbah ? `<label data-unggah class="${KELAS.tombol} ${KELAS.kecil} mt-4 cursor-pointer justify-center ${sibuk ? ' pointer-events-none opacity-50' : ''}">
          ${esc(files.length ? 'Unggah file lain' : 'Unggah ' + jd)}
          <input type="file" data-jenis="${esc(jd)}" class="sr-only" accept="${jd === FOTO ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}" data-sibuk${sibuk ? ' disabled' : ''}></label>` : ''}</li>`
    }).join('')
    return `<div role="tabpanel" id="panel-lampiran" aria-labelledby="tab-lampiran">
      <p class="mb-4 text-sm font-medium text-slate-500">${arsip ? 'Data arsip: lampiran bersifat opsional, boleh dilengkapi bertahap. ' : `<strong class="text-slate-900 font-bold">${lengkap} dari ${wajib.length}</strong> dokumen wajib lengkap. `}Format PDF, JPG, atau PNG, maksimal ${esc(maksMb)} MB per file.${wajib.includes(FOTO) ? ' Pas Foto hanya JPG atau PNG.' : ''}</p>
      <ul class="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">${daftar}</ul></div>`
  }

  function panelRiwayat(m) {
    if (riwayat.length === 0) return '<div role="tabpanel" id="panel-riwayat" aria-labelledby="tab-riwayat"><p class="text-sm font-medium text-slate-400">Belum ada riwayat aktivitas</p></div>'
    const urut = riwayat.slice().reverse()
    const tampil = semuaRiwayat ? urut : urut.slice(0, BATAS_RIWAYAT)
    const detailRiwayat = (r) => (r.detail && !r.detail.endsWith(m.nama_siswa) ? r.detail : '')
    return `<div role="tabpanel" id="panel-riwayat" aria-labelledby="tab-riwayat">
      <ol class="grid min-w-0 grid-cols-1 gap-4 border-l-2 border-slate-200 pl-5">${tampil.map((r) =>
        `<li class="text-sm"><strong class="block font-bold text-slate-900">${esc(NAMA_AKSI[r.aksi] || r.aksi)}</strong>
          <small class="block text-xs font-semibold text-slate-400 mt-0.5">${esc(r.waktu)} (WITA) &middot; ${esc(r.pengguna)}</small>
          ${detailRiwayat(r) ? `<span class="block text-slate-600 mt-1">${esc(detailRiwayat(r))}</span>` : ''}</li>`).join('')}</ol>
      ${urut.length > BATAS_RIWAYAT ? `<button type="button" data-aksi="semua-riwayat" class="${KELAS.tombol} ${KELAS.kecil} mt-4">${semuaRiwayat ? 'Tampilkan lebih sedikit' : 'Lihat semua (' + urut.length + ')'}</button>` : ''}</div>`
  }

  function gambar() {
    const { mutasi: m, lampiran, wajib, peringatan } = detail
    const bisaUbah = !hanyaBaca && (m.status === 'Draft' || m.status === 'Ditolak')
    const arsip = m.sumber === 'arsip'
    const bisaLengkapi = !hanyaBaca && arsip
    const bisaHapus = !hanyaBaca && bisaHapusMutasi && (m.status !== 'Disetujui' || arsip) // hapus: Admin saja (sama dengan backend)
    const tampilPutusan = bisaPutuskan && m.status === 'Diajukan'
    const tampilBatal = bisaBatalkan && m.status === 'Disetujui' && !arsip
    const tampilSurat = m.status === 'Disetujui' && !arsip
    const bisaNomor = tampilSurat && bisaUbahNomor && !m.tanggal_terbit && Boolean(m.nomor_surat)
    const lengkap = wajib.filter((jd) => lampiran.some((l) => l.jenis_dokumen === jd)).length

    const aksiJudul = [
      bisaUbah ? tombol('ubah', 'Ubah data') : '',
      bisaLengkapi ? tombol('ubah', 'Lengkapi data', KELAS.utama + ' mut-utama') : '',
      bisaUbah ? tombol('ajukan', m.status === 'Ditolak' ? 'Ajukan ulang' : 'Ajukan ke Kepala Sekolah', KELAS.utama + ' mut-utama') : '',
      bisaNomor ? tombol('ubah-nomor', 'Ubah nomor surat') : '',
      tampilSurat ? tombol('cetak-surat', 'Cetak Surat Keterangan', KELAS.utama + ' mut-utama') : '',
      tampilBatal ? tombol('batalkan', 'Batalkan persetujuan', KELAS.bahaya) : '',
      bisaHapus ? `<details class="relative" data-menu-aksi>
        <summary aria-label="Aksi lainnya" class="${KELAS.tombol} cursor-pointer list-none [&::-webkit-details-marker]:hidden"><span aria-hidden="true">&#8943;</span><span class="mut-menu-teks">Aksi lainnya</span></summary>
        <div class="absolute right-0 z-10 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <button type="button" data-aksi="hapus-mutasi" data-sibuk class="w-full whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"${sibuk ? ' disabled' : ''}>Hapus permanen</button></div></details>` : '',
    ].join('')

    const tabs = [
      { id: 'data', label: 'Data Siswa' },
      arsip
        ? { id: 'lampiran', label: 'Lampiran Berkas', badge: String(lampiran.length) }
        : { id: 'lampiran', label: 'Lampiran Berkas', badge: lengkap + '/' + wajib.length, kurang: lengkap < wajib.length },
      { id: 'riwayat', label: 'Riwayat Log', badge: String(riwayat.length) },
    ]
    const barTab = `<div role="tablist" aria-label="Bagian detail" class="mut-tabs mb-6 flex gap-2 overflow-x-auto border-b border-slate-200">${tabs.map((t) =>
      `<button type="button" role="tab" id="tab-${t.id}" data-aksi="tab" data-id="${t.id}" aria-selected="${tab === t.id}" aria-controls="panel-${t.id}" tabindex="${tab === t.id ? 0 : -1}"
        class="-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-bold transition-all ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}">${esc(t.label)}${t.badge
          ? `<span class="rounded-full px-2.5 py-0.5 text-xs font-bold ${t.kurang ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}">${esc(t.badge)}</span>` : ''}</button>`).join('')}</div>`

    const putusan = tampilPutusan ? `<section aria-labelledby="mut-putusan" class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 id="mut-putusan" class="mb-3 text-lg font-bold text-slate-900">Form Keputusan Kepala Sekolah</h3>
      <label class="block text-sm font-semibold text-slate-800">Catatan
        <textarea name="catatan" rows="3" aria-describedby="catatan-petunjuk" class="${KELAS.input} mt-1.5 font-normal">${esc(catatan)}</textarea></label>
      <p id="catatan-petunjuk" data-petunjuk-catatan class="mt-1.5 text-xs font-medium text-slate-500">Wajib diisi jika menolak pengajuan.</p>
      <div class="mut-putusan-aksi mt-4 flex gap-3">${tombol('setujui', 'Setujui Pengajuan', KELAS.utama)}${tombol('tolak', 'Tolak Pengajuan', KELAS.bahaya)}</div></section>` : ''

    isiUlang(akar, tombolKembali
      + judulHalaman({
        judul: 'Detail Siswa Masuk',
        subHtml: `<span class="text-slate-900 font-bold text-lg">${esc(m.nama_siswa)}</span> &middot; ${lencana(m.status)}`,
        aksi: aksiJudul,
        kelasAksi: 'mut-aksi',
      })
      + `<div data-pesan>${info ? banner({ teks: info }) : ''}</div>`
      + (peringatan ? `<p role="alert" class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">${esc(peringatan)}</p>` : '')
      + kartuHeader(m)
      + kotakStatus(m)
      + putusan
      + barTab
      + (tab === 'data' ? panelData(m) : tab === 'lampiran' ? panelLampiran(bisaUbah || bisaLengkapi) : panelRiwayat(m)))
    muatFoto()
  }

  async function jalankan(kerja) {
    setSibuk(true)
    try {
      await kerja()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    } finally {
      if (akar.isConnected) setSibuk(false)
    }
  }

  async function unggah(jenisDokumen, input) {
    let file = input.files[0]
    input.value = ''
    if (!file) return
    const { mutasi: m, maks_mb: maksMb } = detail
    if (jenisDokumen === FOTO && !EKSTENSI_FOTO.test(file.name)) {
      tampilPesan({ jenis: 'galat', teks: 'Pas Foto harus berformat JPG atau PNG' })
      return
    }
    if (/^image\//.test(file.type)) {
      setInfo('Memperkecil gambar...')
      file = await kompresGambar(file)
      setInfo('')
    }
    if (file.size > maksMb * 1024 * 1024) {
      tampilPesan({ jenis: 'galat', teks: 'Ukuran file melebihi ' + maksMb + ' MB' })
      return
    }
    setSibuk(true)
    setInfo('Mengunggah ' + file.name + '...')
    // Bar progres tampil di bawah tombol unggah pada kartu dokumen terkait (hanya tampilan).
    const kartu = akar.querySelector('input[data-jenis="' + CSS.escape(jenisDokumen) + '"]')
    const bar = kartu && kartu.closest('li') ? barProgres(kartu.closest('li'), 'Membaca file...') : null
    try {
      const base64 = await fileKeBase64(file)
      if (bar) bar.naik(5, 'Mengunggah...')
      await panggilApi('lampiranUnggah', { mutasi_id: m.id, jenis_dokumen: jenisDokumen, nama_file: file.name, base64 },
        { saatProgres: bar ? (p) => bar.api(p) : undefined })
      if (bar) {
        bar.selesai('Berhasil diunggah')
        await new Promise((tunggu) => setTimeout(tunggu, 800))
      }
      setInfo('')
      tampilPesan({ jenis: 'sukses', teks: 'Lampiran ' + file.name + ' berhasil diunggah' })
      await segarkan()
    } catch (err) {
      if (bar) {
        bar.galat('Gagal mengunggah')
        setTimeout(() => bar.hapus(), 2500)
      }
      setInfo('')
      tampilPesan({ jenis: 'galat', teks: err.message })
    } finally {
      if (akar.isConnected) setSibuk(false)
    }
  }

  /* Penampil berkas: kemudahan memeriksa berkas tanpa pindah tab, bukan pengaman (penampil PDF peramban tetap punya tombol unduh). */
  function lihat(idLampiran) {
    const berkas = detail.lampiran
    if (!berkas.some((l) => String(l.id) === String(idLampiran))) return
    const m = detail.mutasi
    const d = document.createElement('dialog')
    d.className = 'dlg dlg-penuh rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm shadow-2xl'
    d.setAttribute('aria-label', 'Penampil berkas')
    const baris = (label, nilai) => `<div><dt class="text-xs font-semibold text-slate-400">${esc(label)}</dt><dd class="mt-0.5 break-words text-sm font-semibold text-slate-800">${esc(nilai || '-')}</dd></div>`
    d.innerHTML = `<div class="flex h-full flex-col">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div class="min-w-0"><h2 data-judul class="truncate text-base font-bold text-slate-900"></h2>
          <p data-sub class="truncate text-xs font-medium text-slate-500"></p></div>
        <div class="flex shrink-0 gap-2">
          <button type="button" data-tab-baru class="${KELAS.tombol} ${KELAS.kecil}" disabled>Buka di tab baru</button>
          <button type="button" data-tutup class="${KELAS.tombol} ${KELAS.kecil}" aria-label="Tutup penampil">Tutup</button></div>
      </header>
      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav aria-label="Daftar berkas" class="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 p-3 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">${berkas.map((l) =>
          `<button type="button" data-file="${esc(l.id)}" class="min-w-[9rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 aria-[current=true]:border-blue-600 aria-[current=true]:bg-blue-50 md:min-w-0">
            <strong class="block truncate font-bold text-slate-900">${esc(l.jenis_dokumen)}</strong>
            <span class="block truncate text-xs text-slate-500">${esc(l.nama_file)}</span></button>`).join('')}</nav>
        <div data-area class="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-2"></div>
        <aside aria-label="Data siswa" class="hidden w-64 shrink-0 overflow-y-auto border-l border-slate-200 p-4 lg:block">
          <h3 class="mb-3 text-sm font-bold text-slate-900">Data untuk dicocokkan</h3>
          <dl class="grid gap-3">${baris('Nama siswa', m.nama_siswa)}${baris('NISN/NIS', m.nisn_nis)}${baris('Jenis kelamin', namaJenisKelamin(m.jenis_kelamin))}
            ${baris('Tempat, tanggal lahir', (m.tempat_lahir || '-') + ', ' + (m.tanggal_lahir || '-'))}${baris('Alamat', m.alamat)}
            ${baris('Sekolah asal', m.sekolah)}${baris('Kelas tujuan', m.nama_kelas)}</dl></aside>
      </div></div>`
    document.body.appendChild(d)

    const area = d.querySelector('[data-area]')
    const tombolBaru = d.querySelector('[data-tab-baru]')
    const blobs = new Map() // id -> { url, mime }
    let urutan = 0
    let aktifUrl = ''
    // iframe PDF hanya dipakai di layar lebar dengan penunjuk presisi; di HP sering kosong/halaman 1 saja.
    const bisaIframePdf = () => window.matchMedia('(min-width: 768px) and (pointer: fine)').matches

    async function tampil(id) {
      const saya = ++urutan
      const l = berkas.find((x) => String(x.id) === String(id))
      if (!l) return
      d.querySelectorAll('[data-file]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.file === String(id))))
      d.querySelector('[data-judul]').textContent = l.jenis_dokumen
      d.querySelector('[data-sub]').textContent = l.nama_file
      tombolBaru.disabled = true
      aktifUrl = ''
      area.innerHTML = `<div role="status" class="flex items-center gap-2 text-sm font-semibold text-slate-600">${spinner('h-5 w-5')}<span>Memuat berkas...</span></div>`
      try {
        let b = blobs.get(String(id))
        if (!b) {
          const data = await panggilApi('lampiranAmbil', { id: l.id })
          b = { url: base64KeUrl(data.mime, data.base64), mime: data.mime }
          if (!d.isConnected) { URL.revokeObjectURL(b.url); return }
          blobs.set(String(id), b)
        }
        if (saya !== urutan) return
        aktifUrl = b.url
        tombolBaru.disabled = false
        if (/^image\//.test(b.mime)) {
          area.innerHTML = `<img src="${esc(b.url)}" alt="${esc(l.jenis_dokumen + ' ' + m.nama_siswa)}" class="max-h-full max-w-full object-contain">`
        } else if (bisaIframePdf()) {
          area.innerHTML = `<iframe src="${esc(b.url)}" title="${esc(l.nama_file)}" class="h-full w-full border-0 bg-white"></iframe>`
        } else {
          area.innerHTML = `<div class="grid max-w-xs justify-items-center gap-3 p-6 text-center">
            <p class="text-sm font-medium text-slate-600">PDF tidak ditampilkan di perangkat ini. Buka di tab baru untuk membacanya.</p>
            <button type="button" data-tab-baru-isi class="${KELAS.utama}">Buka di tab baru</button></div>`
        }
      } catch (err) {
        if (saya !== urutan || !d.isConnected) return
        area.innerHTML = `<div role="alert" class="grid max-w-sm justify-items-center gap-3 p-6 text-center">
          <p class="text-sm font-medium text-rose-700">${esc(err.message)}</p>
          <button type="button" data-ulang="${esc(id)}" class="${KELAS.tombol}">Coba lagi</button></div>`
      }
    }

    const bukaTabBaru = () => { if (aktifUrl) window.open(aktifUrl, '_blank', 'noopener') }
    d.addEventListener('click', (e) => {
      const t = e.target
      if (!t.closest) return
      if (t.closest('[data-tutup]')) d.close()
      else if (t.closest('[data-tab-baru], [data-tab-baru-isi]')) bukaTabBaru()
      else if (t.closest('[data-ulang]')) tampil(t.closest('[data-ulang]').dataset.ulang)
      else if (t.closest('[data-file]')) tampil(t.closest('[data-file]').dataset.file)
      else if (t === d) d.close() // klik di luar kotak
    })
    d.addEventListener('close', () => {
      blobs.forEach((b) => URL.revokeObjectURL(b.url)) // lepas memori
      blobs.clear()
      d.remove()
    }, { once: true })

    d.showModal()
    tampil(idLampiran)
  }

  async function hapusLampiran(idLampiran) {
    const l = detail.lampiran.find((x) => String(x.id) === String(idLampiran))
    if (!l) return
    const ya = await dialogKonfirmasi({ judul: 'Hapus lampiran?', pesan: l.nama_file, ya: 'Hapus', bahaya: true })
    if (!ya || !akar.isConnected) return
    try {
      await panggilApi('lampiranHapus', { id: l.id })
      tampilPesan({ jenis: 'sukses', teks: 'Lampiran ' + l.nama_file + ' berhasil dihapus' })
      await segarkan()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  async function ajukan() {
    const ya = await dialogKonfirmasi({
      judul: 'Ajukan ke Kepala Sekolah?',
      pesan: 'Mutasi ini akan dikirim untuk diputuskan Kepala Sekolah.',
      ya: 'Ajukan',
    })
    if (!ya || !akar.isConnected) return
    await jalankan(async () => {
      const hasil = await panggilApi('mutasiAjukan', { id: detail.mutasi.id })
      tampilPesan({ jenis: 'sukses', teks: 'Mutasi diajukan.' + (hasil.peringatan ? ' ' + hasil.peringatan : '') })
      await segarkan()
    })
  }

  async function hapusMutasi() {
    const ya = await dialogKonfirmasi({
      judul: 'Hapus permanen?',
      pesan: detail.mutasi.sumber === 'arsip'
        ? 'Mutasi arsip ini akan dihapus permanen dari laporan masuk. Data siswa di menu Siswa tidak ikut terhapus.'
        : 'Mutasi ini beserta lampirannya akan dihapus permanen. Data tidak dapat dikembalikan.',
      ya: 'Hapus permanen',
      bahaya: true,
    })
    if (!ya || !akar.isConnected) return
    try {
      await panggilApi('mutasiHapus', { id: detail.mutasi.id })
      tampilPesan({ jenis: 'sukses', teks: 'Data siswa masuk berhasil dihapus' })
      keluar()
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    }
  }

  async function setujui() {
    const ya = await dialogKonfirmasi({
      judul: 'Setujui mutasi?',
      pesan: 'Siswa akan terdaftar aktif di ' + detail.mutasi.nama_kelas + ' dan kuota kelas diperbarui.',
      ya: 'Setujui',
    })
    if (!ya || !akar.isConnected) return
    await jalankan(async () => {
      const hasil = await panggilApi('mutasiSetujui', { id: detail.mutasi.id, catatan })
      tampilPesan({ jenis: 'sukses', teks: 'Mutasi disetujui.' + (hasil.peringatan ? ' ' + hasil.peringatan : '') })
      window.dispatchEvent(new Event('notif-segarkan'))
      catatan = ''
      await segarkan()
    })
  }

  // Petunjuk di bawah kolom Catatan berubah merah bila kosong saat menolak (tanpa kartu/toast).
  function tandaiCatatan(galat) {
    const kolom = akar.querySelector('textarea[name="catatan"]')
    const petunjuk = akar.querySelector('[data-petunjuk-catatan]')
    if (!kolom || !petunjuk) return
    petunjuk.classList.toggle('text-rose-600', galat)
    petunjuk.classList.toggle('font-semibold', galat)
    petunjuk.classList.toggle('text-slate-500', !galat)
    petunjuk.classList.toggle('font-medium', !galat)
    kolom.classList.toggle('!border-rose-500', galat)
    if (galat) { kolom.setAttribute('aria-invalid', 'true'); kolom.focus() }
    else kolom.removeAttribute('aria-invalid')
  }

  async function tolak() {
    if (!catatan.trim()) {
      tandaiCatatan(true)
      return
    }
    const ya = await dialogKonfirmasi({
      judul: 'Tolak pengajuan?',
      pesan: 'Pengajuan akan dikembalikan ke petugas TU dengan catatan Anda.',
      ya: 'Tolak',
      bahaya: true,
    })
    if (!ya || !akar.isConnected) return
    await jalankan(async () => {
      await panggilApi('mutasiTolak', { id: detail.mutasi.id, catatan })
      tampilPesan({ jenis: 'sukses', teks: 'Pengajuan ditolak' })
      window.dispatchEvent(new Event('notif-segarkan'))
      catatan = ''
      await segarkan()
    })
  }

  async function cetakSurat() {
    const m = detail.mutasi
    let nomor = ''
    if (!m.nomor_surat) {
      if (!bisaUbahNomor) {
        tampilPesan({ jenis: 'galat', teks: 'Nomor surat belum diisi. Minta Petugas TU mengetik nomor surat dulu.' })
        return
      }
      const isi = await dialogTanya({
        judul: 'Nomor surat',
        pesan: 'Ketik nomor surat, contoh 001/422/XI/2026. Surat diterbitkan dengan tanggal hari ini, lalu nomor terkunci.',
        label: 'Nomor surat',
        ya: 'Terbitkan dan cetak',
      })
      if (!isi || !isi.trim() || !akar.isConnected) return
      nomor = isi.trim()
    } else if (!m.tanggal_terbit) {
      const ya = await dialogKonfirmasi({
        judul: 'Terbitkan surat keterangan?',
        pesan: 'Surat diterbitkan dengan tanggal hari ini. Setelah itu nomor surat terkunci dan cetak ulang memakai tanggal yang sama.',
        ya: 'Terbitkan dan cetak',
      })
      if (!ya || !akar.isConnected) return
    }
    await jalankan(async () => {
      const data = await panggilApi('suratData', { id: m.id, nomor })
      const nama = await unduhPdfSurat(data)
      tampilPesan({ jenis: 'sukses', teks: 'Surat diunduh: ' + nama })
      await segarkan()
    })
  }

  async function ubahNomor() {
    const m = detail.mutasi
    const nomor = await dialogTanya({
      judul: 'Ubah nomor surat',
      pesan: 'Nomor saat ini: ' + (m.nomor_surat || '(belum dibuat)') + '. Setelah surat dicetak, nomor terkunci.',
      label: 'Nomor surat baru',
      ya: 'Simpan nomor',
    })
    if (!nomor || !nomor.trim() || !akar.isConnected) return
    await jalankan(async () => {
      await panggilApi('suratNomorUbah', { id: m.id, nomor: nomor.trim() })
      tampilPesan({ jenis: 'sukses', teks: 'Nomor surat diperbarui' })
      await segarkan()
    })
  }

  async function batalkan() {
    const alasan = await dialogTanya({
      judul: 'Batalkan persetujuan?',
      pesan: 'Siswa yang dibuat dari mutasi ini akan dihapus dan mutasi kembali ke Draft.',
      label: 'Alasan pembatalan',
      ya: 'Batalkan persetujuan',
      bahaya: true,
    })
    if (!alasan || !alasan.trim() || !akar.isConnected) return
    await jalankan(async () => {
      const hasil = await panggilApi('mutasiBatalSetuju', { id: detail.mutasi.id, alasan })
      tampilPesan({ jenis: 'sukses', teks: hasil.pesan })
      await segarkan()
    })
  }

  const tutupMenu = (el) => { const d = el && el.closest('details'); if (d) d.open = false }

  pasangAksi(akar, {
    kembali: keluar,
    'muat-ulang': muatAwal,
    ubah: () => onUbah(),
    ajukan,
    batalkan,
    'cetak-surat': cetakSurat,
    'ubah-nomor': ubahNomor,
    setujui,
    tolak,
    lihat,
    'hapus-lampiran': hapusLampiran,
    'hapus-mutasi': (_, el) => { tutupMenu(el); return hapusMutasi() },
    tab: (idTab) => { tab = idTab; simpan(); gambar() },
    'semua-riwayat': () => { semuaRiwayat = !semuaRiwayat; gambar() },
  })
  const tutupSemuaMenu = (kecuali) => akar.querySelectorAll('details[data-menu-aksi][open]').forEach((m) => { if (m !== kecuali) m.open = false })
  const saatKlikLuar = (e) => {
    if (!akar.isConnected) { document.removeEventListener('click', saatKlikLuar); return }
    tutupSemuaMenu(e.target.closest && e.target.closest('details[data-menu-aksi]'))
  }
  document.addEventListener('click', saatKlikLuar)
  akar.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutupSemuaMenu(null) })
  akar.addEventListener('input', (e) => { if (e.target.name === 'catatan') { catatan = e.target.value; if (catatan.trim()) tandaiCatatan(false) } })
  akar.addEventListener('keydown', (e) => {
    if (!e.target.closest || !e.target.closest('[role="tab"]')) return
    const i = TAB_ID.indexOf(tab)
    let baru = ''
    if (e.key === 'ArrowRight') baru = TAB_ID[(i + 1) % TAB_ID.length]
    else if (e.key === 'ArrowLeft') baru = TAB_ID[(i + TAB_ID.length - 1) % TAB_ID.length]
    else if (e.key === 'Home') baru = TAB_ID[0]
    else if (e.key === 'End') baru = TAB_ID[TAB_ID.length - 1]
    if (!baru) return
    e.preventDefault()
    tab = baru
    simpan()
    gambar()
    const el = akar.querySelector('#tab-' + baru)
    if (el) el.focus()
  })
  akar.addEventListener('change', (e) => {
    if (e.target.matches('input[type="file"][data-jenis]')) unggah(e.target.dataset.jenis, e.target)
  })

  muatAwal()
}
