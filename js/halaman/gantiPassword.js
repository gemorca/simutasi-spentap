import { panggilApi } from '../api.js'
import { KELAS, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm, sibukSimpan, notif, tampilPesan } from '../ui.js'
import { periksa, wajib, minPanjang } from '../validasi.js'

const ATURAN = {
  lama: [wajib('Password lama wajib diisi')],
  baru: [wajib('Password baru wajib diisi'), minPanjang(8, 'Password baru minimal 8 karakter')],
  ulang: [wajib('Ulangi password baru'), (v, n) => (v === n.baru ? '' : 'Password baru dan ulangannya tidak sama')],
}

export function render(wadah) {
  wadah.innerHTML = `<div class="mx-auto max-w-xl">
    ${judulHalaman({ judul: 'Ganti Password', sub: 'Gunakan kombinasi password yang kuat dan unik.' })}
    <form data-form novalidate class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div class="grid gap-5">
        ${medan({ label: 'Password lama', nama: 'lama', tipe: 'password', wajib: true, placeholder: 'Masukkan password lama', atribut: { autocomplete: 'current-password' } })}
        ${medan({ label: 'Password baru', nama: 'baru', tipe: 'password', wajib: true, placeholder: 'Masukkan password baru', catatan: 'Minimal 8 karakter.', atribut: { autocomplete: 'new-password' } })}
        ${medan({ label: 'Ulangi password baru', nama: 'ulang', tipe: 'password', wajib: true, placeholder: 'Ulangi password baru', atribut: { autocomplete: 'new-password' } })}
      </div>
      <div class="mt-8 flex justify-end border-t border-slate-100 pt-5">
        <button type="submit" data-simpan class="${KELAS.utama}">Simpan Password</button></div>
    </form></div>`

  const form = wadah.querySelector('[data-form]')
  form.addEventListener('input', (e) => {
    if (!e.target.name) return
    bersihkanGalat(form, e.target.name)
    if (e.target.name === 'baru') bersihkanGalat(form, 'ulang')
  })
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (form.querySelector('[data-simpan]').disabled) return
    const isian = bacaForm(form, ['lama', 'baru', 'ulang'])
    const galat = periksa(isian, ATURAN)
    if (Object.keys(galat).length) { tandaiGalat(form, galat); notif.kolomGalat(); return }
    sibukSimpan(form, true)
    try {
      const hasil = await panggilApi('gantiPassword', { passwordLama: isian.lama, passwordBaru: isian.baru })
      if (!wadah.isConnected) return
      form.reset()
      tampilPesan({ jenis: 'sukses', teks: hasil.pesan || 'Password berhasil diganti.' })
    } catch (err) {
      if (wadah.isConnected) tampilPesan({ jenis: 'galat', teks: err.message })
    } finally {
      if (form.isConnected) { sibukSimpan(form, false); form.querySelector('[name="lama"]').focus() }
    }
  })
  form.querySelector('[name="lama"]').focus()
}
