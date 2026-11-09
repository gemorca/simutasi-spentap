import { panggilApi } from '../api.js'
import {
  KELAS, memuat, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm,
  sibukSimpan, galatMuat, pasangAksi, notif,
} from '../ui.js'

const LABEL = {
  nama_sekolah: 'Nama sekolah',
  npsn: 'NPSN (8 digit)',
  alamat_sekolah: 'Alamat sekolah',
  nama_kepala_sekolah: 'Nama Kepala Sekolah',
  nip_kepala_sekolah: 'NIP Kepala Sekolah',
  tahun_ajaran_aktif: 'Tahun ajaran aktif (contoh 2026/2027)',
}
const KOLOM = Object.keys(LABEL)
const PENUH = ['nama_sekolah', 'alamat_sekolah']

function htmlProfil(profil) {
  const kolom = KOLOM.map((k) => medan({
    label: LABEL[k], nama: k, nilai: profil[k], penuh: PENUH.includes(k),
    atribut: k === 'npsn' ? { inputmode: 'numeric' } : {},
  })).join('')
  return `<h3 class="mb-4 text-lg font-bold text-slate-900">Profil Sekolah</h3>
    <form data-profil novalidate>
      <div class="grid gap-5 sm:grid-cols-2">${kolom}</div>
      <div class="mt-8 flex justify-end border-t border-slate-100 pt-5">
        <button type="submit" data-simpan class="${KELAS.utama}">Simpan Profil</button></div>
    </form>`
}

export function render(wadah) {
  wadah.innerHTML = `<div class="mx-auto max-w-4xl">
    ${judulHalaman({ judul: 'Pengaturan Sistem', sub: 'Atur profil sekolah (tercetak di laporan).' })}
    <div data-isi>${memuat('Memuat pengaturan...')}</div></div>`
  const isi = wadah.querySelector('[data-isi]')

  let urutan = 0

  function gambar(profil) {
    isi.innerHTML = `<section class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm" aria-label="Profil sekolah" data-panel-profil>${htmlProfil(profil)}</section>`
    pasangForm(isi.querySelector('[data-profil]'))
  }

  function pasangForm(form) {
    form.addEventListener('input', (e) => { if (e.target.name) bersihkanGalat(form, e.target.name) })
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      tandaiGalat(form, {})
      const profil = bacaForm(form, KOLOM)
      sibukSimpan(form, true)
      try {
        const hasil = await panggilApi('pengaturanSimpan', { profil })
        notif.sukses(hasil.pesan || 'Pengaturan berhasil disimpan.')
      } catch (err) {
        notif.galat(err.message)
      } finally {
        if (form.isConnected) sibukSimpan(form, false)
      }
    })
  }

  async function muat() {
    const saya = ++urutan
    try {
      const hasil = await panggilApi('pengaturanAmbil')
      if (saya !== urutan || !isi.isConnected) return
      gambar(hasil.profil)
    } catch (err) {
      if (saya !== urutan || !isi.isConnected) return
      isi.innerHTML = galatMuat('Pengaturan tidak dapat dimuat. ' + err.message)
    }
  }

  pasangAksi(isi, { 'muat-ulang': () => { isi.innerHTML = memuat('Memuat pengaturan...'); muat() } })
  muat()
}
