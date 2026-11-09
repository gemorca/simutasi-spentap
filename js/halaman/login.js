import { panggilApi, simpanToken } from '../api.js'
import { spinner } from '../ui.js'
import { sapaanWaktu } from '../sapaan.js'

const MATA_BUKA = '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>'
const MATA_TUTUP = '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>'

const KELAS_INPUT = 'w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'

const HERO_JUDUL = 'Sistem Informasi Mutasi Siswa'
const HERO_ISI = 'Kelola pendaftaran, seleksi, serta rekapitulasi siswa pindahan secara terpadu, cepat, dan akurat.'

const LAMA_SAMBUT = 7500 // ms sambutan tampil (bar progres selesai sekitar 7200 ms) (jika terlalu lama, ubah disini dan di login.css nomor 169)
const CENTANG = '<svg class="login-centang h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'

/* Layar sambutan sesudah login berhasil: "Selamat pagi, <nama>" sesuai jam perangkat. */
function buatSambut(pengguna) {
  const el = document.createElement('div')
  el.className = 'login-sambut'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.innerHTML = `
    <div class="login-sambut-logo"><img src="assets/logo-sekolah.png" alt="" width="64" height="64" class="h-12 w-12 object-contain" onerror="this.src='assets/favicon.svg'"></div>
    <p class="login-sambut-salam"></p>
    <h2 class="login-sambut-nama gradien-teks"></h2>
    <div class="login-sambut-bar" aria-hidden="true"><span></span></div>
    <p class="login-sambut-info">Menyiapkan aplikasi...</p>`
  el.querySelector('.login-sambut-salam').textContent = sapaanWaktu() + ','
  el.querySelector('.login-sambut-nama').textContent = pengguna.nama
  return el
}

/* Urutan: tombol jadi centang, kartu naik keluar, latar memburam, sambutan muncul, lalu masuk aplikasi.
   Klik atau Enter/Esc/Spasi melewati sambutan. Tidak pernah melempar galat. */
function animasiSukses(wadah, tombol, pengguna) {
  return new Promise((selesai) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { selesai(); return }
    const pewaktu = []
    const nanti = (fn, ms) => pewaktu.push(setTimeout(fn, ms))
    const kartu = wadah.querySelector('.login-kartu')
    let sambut = null
    let berakhir = false

    const saatTombol = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); akhiri() } }
    function akhiri() {
      if (berakhir) return
      berakhir = true
      pewaktu.forEach(clearTimeout)
      document.removeEventListener('keydown', saatTombol)
      if (!sambut) { selesai(); return }
      sambut.classList.add('keluar')
      setTimeout(selesai, 700)
    }

    tombol.classList.add('login-kirim-ok')
    tombol.innerHTML = CENTANG + '<span>Berhasil</span>'
    nanti(() => { wadah.classList.add('login-sukses'); if (kartu) kartu.classList.add('login-keluar') }, 600)
    nanti(() => {
      sambut = buatSambut(pengguna)
      sambut.addEventListener('click', akhiri)
      document.addEventListener('keydown', saatTombol)
      wadah.appendChild(sambut)
    }, 1150)
    nanti(akhiri, 1150 + LAMA_SAMBUT)
  })
}

export function render(wadah, onBerhasil) {
  wadah.classList.remove('login-sukses')
  wadah.innerHTML = `
    <div class="login-kartu grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-2xl md:grid-cols-[1.1fr_1.2fr]">
      <div class="relative flex flex-col gap-6 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 md:justify-between md:gap-0 md:border-r md:border-slate-800 md:p-10">
        <div class="login-orb login-orb-1" aria-hidden="true"></div>
        <div class="login-orb login-orb-2" aria-hidden="true"></div>
        <div class="login-titik" aria-hidden="true"></div>
        <div class="z-10 flex items-center gap-3.5 text-white">
          <div class="login-logo grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-500/30 bg-blue-600/20 md:h-12 md:w-12">
            <img src="assets/logo-sekolah.png" alt="Logo sekolah" width="48" height="48" class="h-8 w-8 object-contain md:h-9 md:w-9" onerror="this.src='assets/favicon.svg'">
          </div>
          <div class="login-nama leading-tight"><strong class="block text-lg font-bold tracking-tight md:text-xl">SMP Negeri 1</strong><span class="block text-sm font-medium text-slate-400">Tapa</span></div>
        </div>
        <div class="z-10 md:my-auto">
          <span class="login-lencana mb-4 inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400"><span class="login-denyut" aria-hidden="true"></span>Sistem Resmi</span>
          <h2 class="login-judul gradien-teks text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">${HERO_JUDUL}</h2>
          <p class="login-isi mt-3 text-sm leading-relaxed text-slate-400">${HERO_ISI}</p>
        </div>
        <p class="z-10 hidden text-xs font-medium text-slate-500 md:block">&copy; 2026 SMP Negeri 1 Tapa. All rights reserved.</p>
      </div>
      <div class="p-8 sm:p-12 flex flex-col justify-center">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang!</h1>
          <p class="mt-2 text-sm text-slate-500 font-medium">Masukkan akun Anda untuk melanjutkan ke aplikasi SIM Mutasi Siswa.</p>
        </div>
        <form id="form-login" class="grid gap-5" novalidate>
          <div data-medan="peran" class="grid gap-1.5">
            <label for="login-peran" class="text-sm font-semibold text-slate-800">Jenis pengguna</label>
            <select id="login-peran" name="peran" class="${KELAS_INPUT} pr-3">
              <option value="" selected disabled>Pilih jenis pengguna</option>
              <option value="admin">Administrator Utama</option>
              <option value="kepala_sekolah">Kepala Sekolah</option>
              <option value="petugas_tu">Petugas TU</option>
            </select>
            <p data-galat hidden class="text-xs font-semibold text-rose-600"></p>
          </div>
          <div data-medan="username" class="grid gap-1.5">
            <label for="login-username" class="text-sm font-semibold text-slate-800">Username</label>
            <input id="login-username" name="username" class="${KELAS_INPUT}" autocomplete="username" placeholder="Username" autocapitalize="none" spellcheck="false">
            <p data-galat hidden class="text-xs font-semibold text-rose-600"></p>
          </div>
          <div data-medan="password" class="grid gap-1.5">
            <label for="login-password" class="text-sm font-semibold text-slate-800">Password</label>
            <div class="relative">
              <input id="login-password" name="password" type="password" class="${KELAS_INPUT} pr-12" autocomplete="current-password" placeholder="Password">
              <button type="button" id="lihat" aria-label="Tampilkan password" aria-pressed="false" class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors">${MATA_BUKA}</button>
            </div>
            <p data-galat hidden class="text-xs font-semibold text-rose-600"></p>
          </div>
          <p id="galat" role="alert" class="hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"></p>
          <button type="submit" id="kirim" class="btn login-kirim relative mt-1 inline-flex min-h-[2.875rem] overflow-hidden items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">Masuk Aplikasi</button>
        </form>
        <p class="mt-6 text-center text-xs font-medium text-slate-400 md:hidden">&copy; 2026 SMP Negeri 1 Tapa. All rights reserved.</p>
      </div>
    </div>`

  const form = wadah.querySelector('#form-login')
  const inPeran = form.elements.peran
  const inUser = form.elements.username
  const inPass = form.elements.password
  const tombolLihat = wadah.querySelector('#lihat')
  const kotakGalat = wadah.querySelector('#galat')
  const tombolKirim = wadah.querySelector('#kirim')

  const KELAS_ERR = ['!border-rose-500', '!bg-rose-50/60', '!ring-2', '!ring-rose-500/20']
  function galatKolom(nama, pesan) {
    const el = form.querySelector(`[data-medan="${nama}"]`)
    const p = el.querySelector('[data-galat]')
    const label = el.querySelector('label')
    const kontrol = el.querySelector('input, select')
    p.textContent = pesan || ''
    p.hidden = !pesan
    label.classList.toggle('!text-rose-600', Boolean(pesan))
    KELAS_ERR.forEach((k) => kontrol.classList.toggle(k, Boolean(pesan)))
    if (pesan) kontrol.setAttribute('aria-invalid', 'true')
    else kontrol.removeAttribute('aria-invalid')
    return kontrol
  }
  form.addEventListener('input', (e) => { if (e.target.name) galatKolom(e.target.name, '') })
  form.addEventListener('change', (e) => { if (e.target.name) galatKolom(e.target.name, '') })

  function tampilGalat(teks) {
    kotakGalat.textContent = teks
    kotakGalat.classList.toggle('hidden', !teks)
  }

  tombolLihat.addEventListener('click', () => {
    const tampak = inPass.type === 'password'
    inPass.type = tampak ? 'text' : 'password'
    tombolLihat.innerHTML = tampak ? MATA_TUTUP : MATA_BUKA
    tombolLihat.setAttribute('aria-pressed', String(tampak))
    tombolLihat.setAttribute('aria-label', tampak ? 'Sembunyikan password' : 'Tampilkan password')
  })

  let sudahMasuk = false
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (sudahMasuk) return
    tampilGalat('')
    const galat = {}
    if (!inPeran.value) galat.peran = 'Jenis pengguna wajib dipilih'
    if (!inUser.value.trim()) galat.username = 'Username wajib diisi'
    if (!inPass.value) galat.password = 'Password wajib diisi'
    let pertama = null
    ;['peran', 'username', 'password'].forEach((nama) => {
      const k = galatKolom(nama, galat[nama] || '')
      if (galat[nama] && !pertama) pertama = k
    })
    if (pertama) { pertama.focus(); return }
    tombolKirim.disabled = true
    tombolKirim.setAttribute('aria-busy', 'true')
    tombolKirim.innerHTML = spinner('h-5 w-5') + '<span>Memproses...</span>'
    try {
      const hasil = await panggilApi('login', { peran: inPeran.value, username: inUser.value, password: inPass.value })
      simpanToken(hasil.token)
      sudahMasuk = true
      tombolKirim.disabled = false
      tombolKirim.setAttribute('aria-busy', 'false')
      await animasiSukses(wadah, tombolKirim, hasil.pengguna)
      onBerhasil(hasil.pengguna)
    } catch (err) {
      // Pulihkan kartu bila galat terjadi setelah animasi sukses dimulai.
      sudahMasuk = false
      wadah.classList.remove('login-sukses')
      wadah.querySelectorAll('.login-sambut').forEach((el) => el.remove())
      const kartu = wadah.querySelector('.login-kartu')
      if (kartu) kartu.classList.remove('login-keluar')
      tombolKirim.classList.remove('login-kirim-ok')
      tombolKirim.disabled = false
      tombolKirim.setAttribute('aria-busy', 'false')
      tombolKirim.textContent = 'Masuk Aplikasi'
      tampilGalat(err.message)
    }
  })

  inPeran.focus({ preventScroll: true })
}
