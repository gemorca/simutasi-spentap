import { panggilApi } from '../api.js'
import {
    esc, KELAS, spinner, judulHalaman, medan, tandaiGalat, bersihkanGalat, bacaForm, sibukSimpan, tampilPesan,
    dialogKonfirmasi, barProgres,
} from '../ui.js'
import { NAMA_PERAN } from '../menu.js'
import { periksa, wajib } from '../validasi.js'
import { isiAvatar, muatFotoProfil, urlFoto, unggahFotoProfil, hapusFotoProfil } from '../foto.js'

const POLA_USERNAME = /^[a-z0-9._-]{3,30}$/

const KETERANGAN_PERAN = {
    admin: 'Mengelola seluruh data, pengguna, pengaturan, dan log aktivitas.',
    petugas_tu: 'Menginput data siswa, membuat pengajuan siswa masuk, dan mengunggah lampiran.',
    kepala_sekolah: 'Memutuskan persetujuan mutasi siswa dan melihat laporan.',
}

const AVATAR = 'grid h-24 w-24 shrink-0 place-items-center self-start rounded-full bg-blue-600 text-2xl font-bold text-white ring-4 ring-slate-100'

export function render(wadah, pengguna) {
    const bisaUbahNama = pengguna.peran === 'admin'
    let adaFoto = Boolean(pengguna.ada_foto)

    const aturan = {
        nama: bisaUbahNama ? [wajib('Nama lengkap wajib diisi')] : [],
        username: [
            wajib('Username wajib diisi'),
            (v) => (POLA_USERNAME.test(String(v).trim().toLowerCase())
                ? '' : 'Username 3-30 karakter: huruf kecil, angka, titik, strip, garis bawah'),
        ],
        passwordBaru: [(v) => (v && v.length < 8 ? 'Password baru minimal 8 karakter' : '')],
        passwordUlang: [(v, n) => (v === n.passwordBaru ? '' : 'Password baru dan ulangannya tidak sama')],
        passwordLama: [wajib('Masukkan password saat ini untuk menyimpan perubahan')],
    }

    const saatFotoBerubah = () => {
        if (!wadah.isConnected) { window.removeEventListener('foto-berubah', saatFotoBerubah); return }
        wadah.querySelectorAll('[data-avatar]').forEach((el) => isiAvatar(el, pengguna.nama))
    }
    window.addEventListener('foto-berubah', saatFotoBerubah)

    function tampilLihat() {
        const peran = NAMA_PERAN[pengguna.peran] || pengguna.peran
        const baris = (label, isi) => `<div><dt class="text-xs font-semibold text-slate-400">${esc(label)}</dt><dd class="mt-0.5 text-sm font-semibold text-slate-800">${isi}</dd></div>`

        wadah.innerHTML = `<div class="mx-auto max-w-2xl">
    ${judulHalaman({ judul: 'Profil Saya', sub: 'Informasi akun yang sedang masuk.' })}
    <section aria-label="Informasi akun" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span data-avatar class="${AVATAR}" aria-hidden="true"></span>
        <div class="min-w-0 flex-1 leading-tight">
          <b class="block truncate text-lg font-bold text-slate-900">${esc(pengguna.nama)}</b>
          <span class="mt-1.5 inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">${esc(peran)}</span>
          <p class="mt-3 text-sm text-slate-500">${esc(KETERANGAN_PERAN[pengguna.peran] || '')}</p>
        </div>
      </div>

      <dl class="mt-6 grid gap-x-6 gap-y-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
        ${baris('Nama Lengkap', esc(pengguna.nama))}
        ${baris('Username', esc(pengguna.username))}
        ${baris('Peran', esc(peran))}
        ${baris('Password', '<span aria-label="Disembunyikan">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>')}
      </dl>

      <div class="mt-8 flex justify-end border-t border-slate-100 pt-5">
        <button type="button" data-edit class="${KELAS.utama}">Edit Profil</button>
      </div>
    </section></div>`

        isiAvatar(wadah.querySelector('[data-avatar]'), pengguna.nama)
        if (adaFoto && !urlFoto()) muatFotoProfil()
        const tombol = wadah.querySelector('[data-edit]')
        tombol.addEventListener('click', tampilUbah)
        tombol.focus()
    }

    function tampilUbah() {
        wadah.innerHTML = `<div class="mx-auto max-w-2xl">
    ${judulHalaman({ judul: 'Edit Profil', sub: 'Perubahan dikonfirmasi dengan password saat ini.' })}
    <div class="mb-5 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <span data-avatar class="${AVATAR}" aria-hidden="true"></span>
      <div class="min-w-0 flex-1 leading-tight">
        <b class="block truncate text-base font-bold text-slate-900">${esc(pengguna.nama)}</b>
        <span class="mt-1 inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">${esc(NAMA_PERAN[pengguna.peran] || pengguna.peran)}</span>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" data-ganti-foto class="${KELAS.tombol} ${KELAS.kecil}"></button>
          <button type="button" data-hapus-foto class="${KELAS.tombol} ${KELAS.kecil} hidden !text-rose-700 hover:!bg-rose-50">Hapus Foto</button>
          <input type="file" data-berkas-foto accept="image/jpeg,image/png" class="hidden" aria-label="Pilih foto profil">
        </div>
        <p class="mt-2 text-xs text-slate-500">JPG atau PNG..</p>
        <div data-bar-foto></div>
      </div>
    </div>
    <form data-form novalidate class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div class="grid gap-5">
        ${medan({
        label: 'Nama Lengkap', nama: 'nama', nilai: pengguna.nama, wajib: bisaUbahNama,
        catatan: bisaUbahNama ? '' : 'Nama hanya dapat diubah oleh Administrator Utama.',
        atribut: bisaUbahNama ? { autocomplete: 'name' } : { readonly: 'readonly', autocomplete: 'name' },
    })}
        ${medan({
        label: 'Username', nama: 'username', nilai: pengguna.username, wajib: true,
        catatan: 'Dipakai untuk masuk. Huruf kecil, angka, titik, strip, garis bawah.',
        atribut: { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' },
    })}
      </div>

      <div class="mt-8 border-t border-slate-100 pt-6">
        <h3 class="text-sm font-bold text-slate-900">Ubah Password</h3>
        <div class="mt-4 grid gap-5">
          ${medan({ label: 'Password saat ini', nama: 'passwordLama', tipe: 'password', wajib: true, placeholder: 'Masukkan password saat ini', catatan: 'Minimal 8 karakter.', atribut: { autocomplete: 'current-password' } })}
          ${medan({ label: 'Password baru', nama: 'passwordBaru', tipe: 'password', placeholder: 'Kosongkan bila tidak diganti', catatan: 'Minimal 8 karakter.', atribut: { autocomplete: 'new-password' } })}
          ${medan({ label: 'Ulangi password baru', nama: 'passwordUlang', tipe: 'password', placeholder: 'Ulangi password baru', catatan: 'Minimal 8 karakter.', atribut: { autocomplete: 'new-password' } })}
        </div>
      </div>

      <div class="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" data-batal class="${KELAS.tombol}">Batal</button>
        <button type="submit" data-simpan class="${KELAS.utama}">Simpan Perubahan</button>
      </div>
    </form></div>`

        const form = wadah.querySelector('[data-form]')
        const inNama = form.elements.nama
        if (!bisaUbahNama) inNama.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed')

        const avatar = wadah.querySelector('[data-avatar]')
        const tombolGanti = wadah.querySelector('[data-ganti-foto]')
        const tombolHapus = wadah.querySelector('[data-hapus-foto]')
        const berkas = wadah.querySelector('[data-berkas-foto]')
        const wadahBar = wadah.querySelector('[data-bar-foto]')

        function gambarFoto() {
            isiAvatar(avatar, pengguna.nama)
            tombolGanti.textContent = adaFoto ? 'Ganti Foto' : 'Unggah Foto'
            tombolHapus.classList.toggle('hidden', !adaFoto)
        }

        function sibukFoto(sibuk, teks = '') {
            tombolGanti.disabled = sibuk
            tombolHapus.disabled = sibuk
            tombolGanti.setAttribute('aria-busy', String(sibuk))
            if (sibuk) tombolGanti.innerHTML = spinner() + '<span>' + esc(teks) + '</span>'
            else gambarFoto()
        }

        gambarFoto()
        if (adaFoto && !urlFoto()) muatFotoProfil()

        tombolGanti.addEventListener('click', () => berkas.click())

        berkas.addEventListener('change', async () => {
            const file = berkas.files && berkas.files[0]
            berkas.value = ''
            if (!file) return
            sibukFoto(true, 'Memproses...')
            const bar = barProgres(wadahBar, 'Memproses foto...')
            bar.naik(3, 'Memproses foto...')
            try {
                const hasil = await unggahFotoProfil(file, { saatProgres: (p) => bar.api(p) })
                bar.selesai('Foto berhasil diunggah')
                setTimeout(() => bar.hapus(), 1200)
                adaFoto = true
                Object.assign(pengguna, hasil.pengguna)
                window.dispatchEvent(new CustomEvent('profil-berubah', { detail: hasil.pengguna }))
                if (!wadah.isConnected) return
                tampilPesan({ jenis: 'sukses', teks: hasil.pesan || 'Foto profil berhasil diperbarui.' })
            } catch (err) {
                bar.galat('Gagal mengunggah')
                setTimeout(() => bar.hapus(), 2500)
                if (wadah.isConnected) tampilPesan({ jenis: 'galat', teks: err.message })
            } finally {
                if (tombolGanti.isConnected) sibukFoto(false)
            }
        })

        tombolHapus.addEventListener('click', async () => {
            const ya = await dialogKonfirmasi({
                judul: 'Hapus foto profil?',
                pesan: 'Foto dihapus dan avatar kembali memakai inisial nama.',
                ya: 'Hapus',
                bahaya: true,
            })
            if (!ya) return
            sibukFoto(true, 'Memproses...')
            try {
                const hasil = await hapusFotoProfil()
                adaFoto = false
                Object.assign(pengguna, hasil.pengguna)
                window.dispatchEvent(new CustomEvent('profil-berubah', { detail: hasil.pengguna }))
                if (!wadah.isConnected) return
                tampilPesan({ jenis: 'sukses', teks: hasil.pesan || 'Foto profil dihapus.' })
            } catch (err) {
                if (wadah.isConnected) tampilPesan({ jenis: 'galat', teks: err.message })
            } finally {
                if (tombolGanti.isConnected) sibukFoto(false)
            }
        })

        wadah.querySelector('[data-batal]').addEventListener('click', tampilLihat)

        form.addEventListener('input', (e) => {
            if (!e.target.name) return
            bersihkanGalat(form, e.target.name)
            if (e.target.name === 'passwordBaru') bersihkanGalat(form, 'passwordUlang')
        })

        form.addEventListener('submit', async (e) => {
            e.preventDefault()
            if (form.querySelector('[data-simpan]').disabled) return

            const isian = bacaForm(form, ['nama', 'username', 'passwordBaru', 'passwordUlang', 'passwordLama'])
            isian.username = isian.username.trim().toLowerCase()
            const galat = periksa(isian, aturan)
            if (Object.keys(galat).length) { tandaiGalat(form, galat); return }

            sibukSimpan(form, true, 'Simpan Perubahan')
            try {
                const hasil = await panggilApi('profilSimpan', {
                    nama: isian.nama,
                    username: isian.username,
                    passwordLama: isian.passwordLama,
                    passwordBaru: isian.passwordBaru,
                })
                Object.assign(pengguna, hasil.pengguna)
                window.dispatchEvent(new CustomEvent('profil-berubah', { detail: hasil.pengguna }))
                if (!wadah.isConnected) return
                tampilLihat()
                tampilPesan({ jenis: 'sukses', teks: hasil.pesan || 'Profil berhasil diperbarui.' })
            } catch (err) {
                if (wadah.isConnected) tampilPesan({ jenis: 'galat', teks: err.message })
            } finally {
                if (form.isConnected) sibukSimpan(form, false, 'Simpan Perubahan')
            }
        })

        form.elements.username.focus()
    }

    tampilLihat()
}
