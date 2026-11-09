import { panggilApi } from '../api.js'
import { esc, KELAS, memuat, judulHalaman, medan, pasangAksi, tampilPesan } from '../ui.js'
import { uraiKelas } from '../urutKelas.js'

export function kabarkanPeriode(periode) {
  if (periode) window.dispatchEvent(new CustomEvent('periode-berubah', { detail: periode }))
}

// Semua penulisan periode menahan kontrol dan navigasi; kegagalan jaringan harus dimuat ulang sebelum mencoba lagi.
export async function tulisPeriode(kerja) {
  if (document.documentElement.dataset.periodeMenulis === '1') throw new Error('Penulisan periode masih berlangsung.')
  const kontrol = [...document.querySelectorAll('button, input, select, textarea')].filter((el) => !el.disabled)
  const cegah = (e) => { e.preventDefault(); e.stopImmediatePropagation() }
  const tutup = (e) => { e.preventDefault(); e.returnValue = '' }
  document.documentElement.dataset.periodeMenulis = '1'
  kontrol.forEach((el) => { el.disabled = true })
  document.addEventListener('click', cegah, true)
  document.addEventListener('submit', cegah, true)
  window.addEventListener('beforeunload', tutup)
  window.dispatchEvent(new CustomEvent('periode-menulis', { detail: true }))
  try { return await kerja() } finally {
    delete document.documentElement.dataset.periodeMenulis
    kontrol.forEach((el) => { el.disabled = false })
    document.removeEventListener('click', cegah, true)
    document.removeEventListener('submit', cegah, true)
    window.removeEventListener('beforeunload', tutup)
    window.dispatchEvent(new CustomEvent('periode-menulis', { detail: false }))
  }
}

export function tautanBackup(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return ''
    return `<a class="font-semibold text-blue-700 underline" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">Buka backup spreadsheet</a>`
  } catch { return '' }
}

// Pratinjau server selalu menjadi sumber token/ringkasan. Respons lama tidak boleh menimpa pilihan baru.
export function tampilKenaikan(wadah, tahun, { kembali, masihAktif, batal = false }) {
  let urutan = 0
  let pratinjau = null
  let pilihan = null
  let siap = false
  let menulis = false
  let konfirmasi = false
  let pemulihan = false
  let pesan = ''
  const aktif = () => wadah.isConnected && masihAktif()
  const tombol = (aksi, label, nonaktif = false, bahaya = false) => `<button type="button" data-aksi="${aksi}" class="${bahaya ? KELAS.bahaya : KELAS.tombol}"${nonaktif ? ' disabled' : ''}>${label}</button>`
  const daftarPesan = (judul, daftar, bahaya) => daftar?.length ? `<section role="${bahaya ? 'alert' : 'status'}" class="my-4 rounded-xl border p-4 ${bahaya ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}"><h3 class="font-bold">${judul}</h3><ul class="list-disc pl-5">${daftar.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''

  function gambar() {
    if (!aktif()) return
    const terbuka = new Set([...wadah.querySelectorAll('details[open][data-kelas]')].map((el) => el.dataset.kelas))
    const fokus = wadah.contains(document.activeElement) ? { nama: document.activeElement.name, siswa: document.activeElement.dataset.siswa } : null
    const p = pratinjau
    const terkunci = Boolean(p?.berjalan)
    const galat = p?.galat || []
    const boleh = siap && !pemulihan && (batal ? p?.bisa_batal : !galat.length && Boolean(p?.token))
    wadah.innerHTML = judulHalaman({ judul: batal ? 'Batalkan Kenaikan Kelas' : 'Pratinjau Kenaikan Kelas', sub: `Tahun ajaran tujuan ${tahun.tahun_ajaran}`, aksi: tombol('kembali', 'Kembali') })
      + `<div data-status aria-live="polite">${pesan ? `<p role="alert" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">${esc(pesan)}</p>` : ''}${!siap && !pesan ? memuat('Memperbarui pratinjau...') : ''}</div>`
      + (p ? `<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p>Dari ${esc(p.tahun_asal?.tahun_ajaran || p.tahun_asal || '-')} ke ${esc(tahun.tahun_ajaran)}. Backup otomatis dibuat sebelum data diubah.</p>
        ${terkunci ? '<p role="status" class="rounded-xl bg-amber-50 p-4">Proses sebelumnya belum selesai. Rencana tersimpan dikunci; lanjutkan proses yang sama tanpa mengubah pilihan.</p>' : ''}
        ${tautanBackup(p.backup_url || tahun.backup_url)}
        ${daftarPesan('Perlu diperbaiki', galat, true)}${daftarPesan('Peringatan', p.peringatan, false)}
        ${!batal ? `<form data-pilihan><fieldset ${terkunci || pemulihan ? 'disabled' : ''}><legend class="mb-3 font-bold">1. Periksa tujuan dan siswa tinggal kelas</legend>
          <p class="mb-4 text-sm">Kelas tingkat awal dibuat manual di Kelola Kelas. Tujuan tinggal kelas harus bertingkat sama, termasuk siswa tingkat akhir.</p>
          ${(p.kelas || []).map((k, i) => {
            const tingkat = uraiKelas(k.nama_kelas).tingkat
            const opsi = (level) => [{ nilai: '', label: 'Pilih kelas tujuan' }, ...(p.tujuan || []).filter((t) => level !== null && Number(t.tingkat) === level).map((t) => ({ nilai: t.id, label: `${t.nama_kelas} — aktif ${t.jumlah_aktif}, kuota ${t.kuota}` }))]
            const siswa = (p.siswa || []).filter((s) => String(s.kelas_id) === String(k.id))
            return `<section class="mb-5 rounded-xl border border-slate-200 p-4"><h3 class="mb-3 font-bold">${esc(k.nama_kelas)} — ${esc(k.jumlah)} siswa</h3><div class="grid gap-4 sm:grid-cols-2">
              ${k.lulus ? '<p>Siswa tingkat akhir lulus, kecuali yang ditandai tinggal kelas.</p>' : medan({ label: 'Tujuan naik dari ' + k.nama_kelas, nama: 'naik_' + i, nilai: pilihan.peta[k.id] || '', pilihan: opsi(tingkat === null ? null : tingkat + 1), atribut: { 'data-peta': k.id } })}
              ${medan({ label: 'Tujuan tinggal di tingkat ' + (tingkat ?? '?'), nama: 'tinggal_' + i, nilai: pilihan.peta_tinggal[k.id] || '', pilihan: opsi(tingkat), atribut: { 'data-peta-tinggal': k.id } })}</div>
              <details data-kelas="${esc(k.id)}"${terbuka.has(String(k.id)) ? ' open' : ''} class="mt-4"><summary class="cursor-pointer font-semibold">Tandai siswa tinggal kelas (${siswa.filter((s) => pilihan.tinggal.includes(String(s.id))).length}/${siswa.length})</summary><div class="mt-3 grid gap-2 sm:grid-cols-2">${siswa.map((s) => `<label class="flex items-center gap-2 rounded-lg border border-slate-200 p-3"><input type="checkbox" data-siswa="${esc(s.id)}"${pilihan.tinggal.includes(String(s.id)) ? ' checked' : ''}><span>${esc(s.nama)}</span></label>`).join('')}</div></details></section>`
          }).join('')}</fieldset></form>` : '<p>Pembatalan mengembalikan data sesuai riwayat dan rencana tersimpan. Server menolak bila ada mutasi masuk atau perubahan data yang tidak terkait.</p>'}
        <p class="font-bold" data-ringkasan>Ringkasan server: ${esc(p.ringkasan?.naik ?? 0)} naik, ${esc(p.ringkasan?.tinggal ?? 0)} tinggal, ${esc(p.ringkasan?.lulus ?? 0)} lulus.</p>
        ${batal && !p.bisa_batal ? '<p role="alert">Pembatalan tidak tersedia untuk tahun ajaran ini.</p>' : ''}
        <div class="flex flex-wrap gap-3">${tombol('segar', 'Muat ulang pratinjau')}${tombol('konfirmasi', batal ? 'Periksa pembatalan' : terkunci ? 'Periksa dan lanjutkan proses' : 'Pratinjau sudah benar', !boleh, batal)}</div>
        ${konfirmasi && boleh ? `<form data-konfirmasi class="space-y-4 border-t border-slate-200 pt-4"><h3 class="font-bold">2. Konfirmasi ${batal ? 'pembatalan' : 'kenaikan'}</h3><p>Perubahan mencakup seluruh siswa pada rencana di atas. Ketik persis <strong>${esc(tahun.tahun_ajaran)}</strong> untuk ${batal ? 'membatalkan kenaikan' : 'menjalankan kenaikan'}.</p>${medan({ label: 'Konfirmasi tahun ajaran tujuan', nama: 'konfirmasi', wajib: true, atribut: { autocomplete: 'off' } })}<button type="submit" class="${batal ? KELAS.bahaya : KELAS.utama}">${batal ? 'Batalkan kenaikan sekarang' : terkunci ? 'Lanjutkan proses tersimpan' : 'Naikkan sekarang'}</button><p data-galat-konfirmasi role="alert"></p></form>` : ''}
      </section>` : tombol('segar', 'Muat ulang pratinjau'))
    pasangAksi(wadah, {
      kembali: () => { if (!menulis) { urutan++; kembali() } },
      segar: () => { if (!menulis) muat(pemulihan || Boolean(pratinjau?.berjalan)) },
      konfirmasi: () => { if (boleh && !menulis) { konfirmasi = true; gambar(); wadah.querySelector('[name="konfirmasi"]')?.focus() } },
    })
    wadah.querySelector('[data-pilihan]')?.addEventListener('change', (e) => {
      if (menulis || pemulihan || pratinjau.berjalan) return
      const el = e.target
      if (el.hasAttribute('data-peta')) pilihan.peta[el.dataset.peta] = el.value
      else if (el.hasAttribute('data-peta-tinggal')) pilihan.peta_tinggal[el.dataset.petaTinggal] = el.value
      else if (el.hasAttribute('data-siswa')) {
        const ids = new Set(pilihan.tinggal)
        if (el.checked) ids.add(el.dataset.siswa); else ids.delete(el.dataset.siswa)
        pilihan.tinggal = [...ids]
      } else return
      konfirmasi = false
      muat(false)
    })
    wadah.querySelector('[data-pilihan]')?.addEventListener('submit', (e) => e.preventDefault())
    wadah.querySelector('[data-konfirmasi]')?.addEventListener('submit', jalankan)
    if (fokus?.siswa) [...wadah.querySelectorAll('[data-siswa]')].find((el) => el.dataset.siswa === fokus.siswa)?.focus()
    else if (fokus?.nama) [...wadah.querySelectorAll('[name]')].find((el) => el.name === fokus.nama)?.focus()
  }

  async function muat(dariServer = false) {
    const nomor = ++urutan
    siap = false
    konfirmasi = false
    pesan = ''
    // Jangan mengganti formulir saat permintaan berjalan: perubahan berikutnya tetap dapat dibuat.
    const status = wadah.querySelector('[data-status]')
    if (status) status.innerHTML = memuat('Memperbarui pratinjau...')
    wadah.querySelector('[data-konfirmasi]')?.remove()
    const lanjut = wadah.querySelector('[data-aksi="konfirmasi"]')
    if (lanjut) lanjut.disabled = true
    try {
      const hasil = await panggilApi('kenaikanPratinjau', { id: tahun.id, ...(!dariServer && pilihan ? { peta: { ...pilihan.peta }, peta_tinggal: { ...pilihan.peta_tinggal }, tinggal: [...pilihan.tinggal] } : {}) })
      if (!aktif() || nomor !== urutan) return
      pratinjau = hasil
      // Pemulihan pembatalan harus memanggil kenaikanBatal, bukan melanjutkan kenaikan.
      if (hasil.membatalkan) batal = true
      pilihan = { peta: { ...hasil.peta }, peta_tinggal: { ...hasil.peta_tinggal }, tinggal: (hasil.tinggal || []).map(String) }
      siap = true
      pemulihan = false
    } catch (err) {
      if (!aktif() || nomor !== urutan) return
      pesan = err.message + ' Muat ulang pratinjau sebelum melanjutkan.'
    }
    gambar()
  }

  async function jalankan(e) {
    e.preventDefault()
    if (menulis || !siap || pemulihan || !konfirmasi) return
    if (batal ? !pratinjau.bisa_batal : pratinjau.galat?.length || !pratinjau.token) return
    const teks = e.currentTarget.elements.konfirmasi.value
    if (teks !== tahun.tahun_ajaran) {
      e.currentTarget.querySelector('[data-galat-konfirmasi]').textContent = 'Tahun ajaran harus sama persis.'
      e.currentTarget.elements.konfirmasi.focus()
      return
    }
    menulis = true
    ++urutan
    try {
      const hasil = await tulisPeriode(() => panggilApi(batal ? 'kenaikanBatal' : 'kenaikanJalankan', { id: tahun.id, konfirmasi: teks, ...(!batal ? { ...pilihan, token: pratinjau.token } : {}) }))
      kabarkanPeriode(hasil.periode)
      tampilPesan({ jenis: 'sukses', teks: hasil.pesan })
      if (aktif()) kembali()
    } catch (err) {
      if (!aktif()) return
      siap = false
      konfirmasi = false
      pemulihan = true
      pesan = err.message + ' Status server mungkin sudah berubah. Muat ulang pratinjau untuk memeriksa backup dan melanjutkan proses tersimpan; jangan menjalankan rencana lama.'
      gambar()
    } finally { menulis = false }
  }

  gambar()
  muat()
}
