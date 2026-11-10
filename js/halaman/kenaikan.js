import { panggilApi } from '../api.js'
import { esc, KELAS, memuat, judulHalaman, medan, pasangAksi, tampilPesan, sibukTombol } from '../ui.js'
import { uraiKelas, urutKelas } from '../urutKelas.js'

export function kabarkanPeriode(periode) {
  if (periode) window.dispatchEvent(new CustomEvent('periode-berubah', { detail: periode }))
}

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

export function tampilKenaikan(wadah, tahun, { kembali, masihAktif, batal = false }) {
  let urutan = 0
  let pratinjau = null
  let pilihan = null
  let siap = false
  let menulis = false
  let konfirmasi = false
  let pemulihan = false
  let pesan = ''
  let buat = null
  const aktif = () => wadah.isConnected && masihAktif()
  const tombol = (aksi, label, nonaktif = false, bahaya = false, tambah = '') => `<button type="button" data-aksi="${aksi}" class="${bahaya ? KELAS.bahaya : tambah ? KELAS.tombol + ' ' + tambah : KELAS.tombol}"${nonaktif ? ' disabled' : ''}>${label}</button>`
  const daftarPesan = (judul, daftar, bahaya) => daftar?.length ? `<section role="${bahaya ? 'alert' : 'status'}" class="my-4 rounded-xl border p-4 ${bahaya ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}"><h3 class="font-bold">${judul}</h3><ul class="list-disc pl-5">${daftar.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''

  const kelasUrut = () => [...(pratinjau?.kelas || [])].sort(urutKelas)
  const tujuanUrut = () => [...(pratinjau?.tujuan || [])].sort(urutKelas)
  const tingkatDari = (k) => uraiKelas(k.nama_kelas).tingkat
  const labelTingkat = (t) => String(pratinjau?.awalan_saran?.[t] || t).replace(/-$/, '')

  function kelompok(daftar) {
    const peta = new Map()
    for (const k of daftar) {
      const u = uraiKelas(k.nama_kelas)
      const kunci = String(u.tingkat)
      if (!peta.has(kunci)) peta.set(kunci, { tingkat: u.tingkat, label: u.label, isi: [] })
      peta.get(kunci).isi.push(k)
    }
    return [...peta.values()]
  }

  const pilih = (nama, label, nilai, tingkat, atribut) => {
    const opsi = tujuanUrut().filter((t) => tingkat !== null && Number(t.tingkat) === tingkat)
      .map((t) => `<option value="${esc(t.id)}"${String(t.id) === String(nilai) ? ' selected' : ''}>${esc(t.nama_kelas)} (${esc(t.jumlah_aktif)}/${esc(t.kuota)})</option>`).join('')
    return `<select name="${esc(nama)}" aria-label="${esc(label)}" ${atribut} class="${KELAS.input}"><option value="">Pilih kelas tujuan</option>${opsi}</select>`
  }

  function barisKelas(k, i) {
    const tingkat = tingkatDari(k)
    const kosong = Number(k.jumlah) === 0
    let kanan
    if (k.lulus) kanan = '<span class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Lulus</span>'
    else {
      const belum = !kosong && !pilihan.peta[k.id]
      kanan = pilih('naik_' + i, 'Tujuan naik dari ' + k.nama_kelas, pilihan.peta[k.id] || '', tingkat === null ? null : tingkat + 1, `data-peta="${esc(k.id)}"`)
        + (belum ? '<p class="mt-1 text-xs font-semibold text-rose-600">Belum dipilih</p>' : '')
    }
    return `<div class="grid items-start gap-2 border-t border-slate-100 py-3 sm:grid-cols-2 sm:gap-4${kosong ? ' opacity-60' : ''}">
      <div><strong>${esc(k.nama_kelas)}</strong><span class="ml-2 text-sm text-slate-500">${esc(k.jumlah)} siswa</span></div>
      <div>${kanan}</div></div>`
  }

  function bagianBuat(p) {
    const tersedia = p.tingkat_tersedia || []
    if (!tersedia.length) return ''
    const per = kelompok(tujuanUrut())
    if (!buat) {
      const t = tersedia.find((x) => !per.some((g) => g.tingkat === x)) ?? tersedia[0]
      buat = { tingkat: String(t), awalan: p.awalan_saran?.[t] || '', dari: '', sampai: '', kuota: String((p.tujuan || [])[0]?.kuota || 32) }
    }
    const ringkas = tersedia.map((t) => {
      const g = per.find((x) => x.tingkat === t)
      return `<li><strong>Kelas ${esc(labelTingkat(t))}:</strong> ${g ? g.isi.map((k) => esc(k.nama_kelas)).join(', ') : '<span class="font-semibold text-rose-600">belum ada</span>'}</li>`
    }).join('')
    return `<section class="rounded-xl border border-slate-200 p-4">
      <h3 class="font-bold">1. Siapkan kelas tujuan ${esc(tahun.tahun_ajaran)}</h3>
      <p class="mt-1 text-sm text-slate-600">Kelas yang sudah ada. Siapkan juga kelas tingkat paling awal untuk siswa baru.</p>
      <ul class="mt-3 space-y-1 text-sm">${ringkas}</ul>
      <details class="mt-4"${per.length ? '' : ' open'}><summary class="cursor-pointer font-semibold">Buat kelas sekaligus</summary>
        <form data-buat novalidate class="mt-3 grid gap-4 sm:grid-cols-2">
          ${medan({ label: 'Tingkat', nama: 'buat_tingkat', nilai: buat.tingkat, pilihan: tersedia.map((t) => ({ nilai: String(t), label: 'Kelas ' + labelTingkat(t) })) })}
          ${medan({ label: 'Awalan nama', nama: 'buat_awalan', nilai: buat.awalan, catatan: 'Contoh: VIII- atau IX-', atribut: { autocomplete: 'off' } })}
          ${medan({ label: 'Dari', nama: 'buat_dari', nilai: buat.dari, catatan: 'Angka (1) atau satu huruf (A)', atribut: { autocomplete: 'off' } })}
          ${medan({ label: 'Sampai', nama: 'buat_sampai', nilai: buat.sampai, catatan: 'Angka (7) atau satu huruf (G)', atribut: { autocomplete: 'off' } })}
          ${medan({ label: 'Kuota per kelas', nama: 'buat_kuota', nilai: buat.kuota, tipe: 'number', atribut: { min: '0', max: '1000' } })}
          <div class="grid content-end gap-2"><p class="text-sm text-slate-600" data-contoh>${esc(contohBuat())}</p>
            <button type="submit" class="${KELAS.utama}"${menulis ? ' disabled' : ''}>Buat kelas</button></div>
        </form></details></section>`
  }

  function contohBuat() {
    const dari = buat.dari.trim().toUpperCase()
    const sampai = buat.sampai.trim().toUpperCase() || dari
    if (!buat.awalan.trim() || !dari) return 'Isi awalan dan rentang untuk melihat nama kelas yang dibuat.'
    return `Akan dibuat: ${buat.awalan.trim()}${dari}${sampai !== dari ? ' sampai ' + buat.awalan.trim() + sampai : ''}`
  }

  function bagianTinggal(p, terbukaLuar, terbuka) {
    const berisi = kelasUrut().filter((k) => Number(k.jumlah) > 0)
    if (!berisi.length) return ''
    return `<details data-tinggal-luar${terbukaLuar ? ' open' : ''} class="rounded-xl border border-slate-200 p-4">
      <summary class="cursor-pointer font-bold">3. Tandai siswa tinggal kelas (opsional) — ${pilihan.tinggal.length} dipilih</summary>
      <div class="mt-3 space-y-3">${berisi.map((k, i) => {
        const tingkat = tingkatDari(k)
        const siswa = (p.siswa || []).filter((s) => String(s.kelas_id) === String(k.id))
        const tanda = siswa.filter((s) => pilihan.tinggal.includes(String(s.id))).length
        return `<details data-kelas="${esc(k.id)}"${terbuka.has(String(k.id)) ? ' open' : ''} class="rounded-lg border border-slate-200 p-3">
          <summary class="cursor-pointer font-semibold">${esc(k.nama_kelas)} — ${tanda}/${siswa.length} tinggal</summary>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">${siswa.map((s) => `<label class="flex items-center gap-2 rounded-lg border border-slate-200 p-3"><input type="checkbox" data-siswa="${esc(s.id)}"${pilihan.tinggal.includes(String(s.id)) ? ' checked' : ''}><span>${esc(s.nama)}</span></label>`).join('')}</div>
          ${tanda ? `<div class="mt-3 max-w-md"><p class="mb-1 text-sm font-semibold">Siswa tinggal ditempatkan di (tingkat ${esc(tingkat ?? '?')})</p>${pilih('tinggal_' + i, 'Tujuan tinggal dari ' + k.nama_kelas, pilihan.peta_tinggal[k.id] || '', tingkat, `data-peta-tinggal="${esc(k.id)}"`)}</div>` : ''}
        </details>`
      }).join('')}</div></details>`
  }

  function saranTinggal(kelasId) {
    const kelas = kelasUrut()
    const k = kelas.find((x) => String(x.id) === String(kelasId))
    if (!k) return ''
    const tingkat = tingkatDari(k)
    const calon = tujuanUrut().filter((t) => Number(t.tingkat) === tingkat)
    const sisa = uraiKelas(k.nama_kelas).sisa.toLowerCase()
    const cocok = calon.filter((t) => uraiKelas(t.nama_kelas).sisa.toLowerCase() === sisa)
    if (cocok.length === 1) return cocok[0].id
    const urut = kelas.filter((x) => tingkatDari(x) === tingkat).findIndex((x) => String(x.id) === String(kelasId))
    return calon[urut]?.id || (calon.length === 1 ? calon[0].id : '')
  }

  function cocokkan(mode) {
    if (!pratinjau || menulis || pemulihan || pratinjau.berjalan || batal) return
    const tujuan = tujuanUrut()
    const peta = {}
    const tinggal = {}
    for (const g of kelompok(kelasUrut())) {
      g.isi.forEach((k, i) => {
        if (g.tingkat === null) { peta[k.id] = ''; tinggal[k.id] = ''; return }
        const sisa = uraiKelas(k.nama_kelas).sisa.toLowerCase()
        const ambil = (t) => {
          const calon = tujuan.filter((x) => Number(x.tingkat) === t)
          if (mode === 'urutan') return calon[i]?.id || ''
          const cocok = calon.filter((x) => uraiKelas(x.nama_kelas).sisa.toLowerCase() === sisa)
          return cocok.length === 1 ? cocok[0].id : ''
        }
        peta[k.id] = k.lulus ? '' : ambil(g.tingkat + 1)
        tinggal[k.id] = ambil(g.tingkat)
      })
    }
    pilihan = { ...pilihan, peta, peta_tinggal: tinggal }
    konfirmasi = false
    return muat(false)
  }

  function gambar() {
    if (!aktif()) return
    const terbuka = new Set([...wadah.querySelectorAll('details[open][data-kelas]')].map((el) => el.dataset.kelas))
    const terbukaLuar = Boolean(wadah.querySelector('details[open][data-tinggal-luar]'))
    const fokus = wadah.contains(document.activeElement) ? { nama: document.activeElement.name, siswa: document.activeElement.dataset.siswa } : null
    const p = pratinjau
    const terkunci = Boolean(p?.berjalan)
    const galat = p?.galat || []
    const boleh = siap && !pemulihan && (batal ? p?.bisa_batal : !galat.length && Boolean(p?.token))
    const bisaUbah = !batal && !terkunci && !pemulihan
    const perlu = batal || terkunci || pemulihan || Boolean(pesan) || !p
    wadah.innerHTML = judulHalaman({ judul: batal ? 'Batalkan Kenaikan Kelas' : 'Naikkan Kelas', sub: `Tahun ajaran tujuan ${tahun.tahun_ajaran}`, aksi: tombol('kembali', 'Kembali') })
      + `<div data-status aria-live="polite">${pesan ? `<p role="alert" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">${esc(pesan)}</p>` : ''}${!siap && !pesan ? memuat('Memperbarui pratinjau...') : ''}</div>`
      + (p ? `<section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p>Dari ${esc(p.tahun_asal?.tahun_ajaran || p.tahun_asal || '-')} ke ${esc(tahun.tahun_ajaran)}. Backup otomatis dibuat sebelum data diubah.</p>
        ${terkunci ? '<p role="status" class="rounded-xl bg-amber-50 p-4">Proses sebelumnya belum selesai. Rencana tersimpan dikunci; lanjutkan proses yang sama tanpa mengubah pilihan.</p>' : ''}
        ${tautanBackup(p.backup_url || tahun.backup_url)}
        ${daftarPesan('Perlu diperbaiki', galat, true)}${daftarPesan('Peringatan', p.peringatan, false)}
        ${bisaUbah ? bagianBuat(p) : ''}
        ${!batal ? `<form data-pilihan><fieldset ${terkunci || pemulihan ? 'disabled' : ''} class="space-y-4">
          <section class="rounded-xl border border-slate-200 p-4">
            <h3 class="font-bold">2. Cocokkan kelas</h3>
            <p class="mt-1 text-sm text-slate-600">Pilih kelas tujuan untuk tiap kelas asal, atau cocokkan otomatis lalu koreksi seperlunya. Angka dalam kurung: siswa aktif/kuota.</p>
            <div class="mt-3 flex flex-wrap gap-2">${tombol('cocok-urutan', 'Cocokkan berdasarkan urutan', false, false, KELAS.kecil)}${tombol('cocok-nama', 'Cocokkan berdasarkan nama', false, false, KELAS.kecil)}</div>
            ${kelompok(kelasUrut()).map((g) => `<h4 class="mt-4 text-sm font-bold uppercase tracking-wide text-slate-500">${g.tingkat === null ? 'Nama kelas tidak dikenali' : 'Kelas ' + esc(g.label)} — ${g.isi.length} kelas, ${g.isi.reduce((n, k) => n + Number(k.jumlah || 0), 0)} siswa</h4>${g.isi.map((k) => barisKelas(k, (p.kelas || []).findIndex((x) => x.id === k.id))).join('')}`).join('')}
          </section>
          ${bagianTinggal(p, terbukaLuar, terbuka)}
        </fieldset></form>` : '<p>Pembatalan mengembalikan data sesuai riwayat dan rencana tersimpan. Server menolak bila ada mutasi masuk atau perubahan data yang tidak terkait.</p>'}
        <p class="font-bold" data-ringkasan>Ringkasan server: ${esc(p.ringkasan?.naik ?? 0)} naik, ${esc(p.ringkasan?.tinggal ?? 0)} tinggal, ${esc(p.ringkasan?.lulus ?? 0)} lulus.</p>
        ${batal && !p.bisa_batal ? '<p role="alert">Pembatalan tidak tersedia untuk tahun ajaran ini.</p>' : ''}
        <div class="flex flex-wrap gap-3">${perlu ? tombol('segar', 'Muat ulang pratinjau') : ''}${tombol('konfirmasi', batal ? 'Periksa pembatalan' : terkunci ? 'Periksa dan lanjutkan proses' : '4. Lanjut ke konfirmasi', !boleh, batal)}</div>
        ${konfirmasi && boleh ? `<form data-konfirmasi class="space-y-4 border-t border-slate-200 pt-4"><h3 class="font-bold">Konfirmasi ${batal ? 'pembatalan' : 'kenaikan'}</h3><p>Perubahan mencakup seluruh siswa pada rencana di atas. Ketik persis <strong>${esc(tahun.tahun_ajaran)}</strong> untuk ${batal ? 'membatalkan kenaikan' : 'menjalankan kenaikan'}.</p>${medan({ label: 'Konfirmasi tahun ajaran tujuan', nama: 'konfirmasi', wajib: true, atribut: { autocomplete: 'off' } })}<button type="submit" class="${batal ? KELAS.bahaya : KELAS.utama}">${batal ? 'Batalkan kenaikan sekarang' : terkunci ? 'Lanjutkan proses tersimpan' : 'Naikkan sekarang'}</button><p data-galat-konfirmasi role="alert"></p></form>` : ''}
      </section>` : tombol('segar', 'Muat ulang pratinjau'))
    pasangAksi(wadah, {
      kembali: () => { if (!menulis) { urutan++; kembali() } },
      segar: () => { if (!menulis) return muat(pemulihan || Boolean(pratinjau?.berjalan)) },
      konfirmasi: () => { if (boleh && !menulis) { konfirmasi = true; gambar(); wadah.querySelector('[name="konfirmasi"]')?.focus() } },
      'cocok-nama': () => cocokkan('nama'),
      'cocok-urutan': () => cocokkan('urutan'),
    })
    wadah.querySelector('[data-pilihan]')?.addEventListener('change', (e) => {
      if (menulis || pemulihan || pratinjau.berjalan) return
      const el = e.target
      if (el.hasAttribute('data-peta')) pilihan.peta[el.dataset.peta] = el.value
      else if (el.hasAttribute('data-peta-tinggal')) pilihan.peta_tinggal[el.dataset.petaTinggal] = el.value
      else if (el.hasAttribute('data-siswa')) {
        const ids = new Set(pilihan.tinggal)
        if (el.checked) {
          ids.add(el.dataset.siswa)
          const kelasId = el.closest('details[data-kelas]')?.dataset.kelas
          if (kelasId && !pilihan.peta_tinggal[kelasId]) pilihan.peta_tinggal[kelasId] = saranTinggal(kelasId)
        } else ids.delete(el.dataset.siswa)
        pilihan.tinggal = [...ids]
      } else return
      konfirmasi = false
      muat(false)
    })
    wadah.querySelector('[data-pilihan]')?.addEventListener('submit', (e) => e.preventDefault())
    const formBuat = wadah.querySelector('[data-buat]')
    if (formBuat) {
      const baca = () => {
        buat = { tingkat: formBuat.elements.buat_tingkat.value, awalan: formBuat.elements.buat_awalan.value, dari: formBuat.elements.buat_dari.value, sampai: formBuat.elements.buat_sampai.value, kuota: formBuat.elements.buat_kuota.value }
        formBuat.querySelector('[data-contoh]').textContent = contohBuat()
      }
      formBuat.addEventListener('input', baca)
      formBuat.elements.buat_tingkat.addEventListener('change', (e) => {
        formBuat.elements.buat_awalan.value = pratinjau.awalan_saran?.[e.target.value] || formBuat.elements.buat_awalan.value
        baca()
      })
      formBuat.addEventListener('submit', buatKelas)
    }
    wadah.querySelector('[data-konfirmasi]')?.addEventListener('submit', jalankan)
    if (fokus?.siswa) [...wadah.querySelectorAll('[data-siswa]')].find((el) => el.dataset.siswa === fokus.siswa)?.focus()
    else if (fokus?.nama) [...wadah.querySelectorAll('[name]')].find((el) => el.name === fokus.nama)?.focus()
  }

  async function buatKelas(e) {
    e.preventDefault()
    if (menulis || !siap || pemulihan || pratinjau?.berjalan) return
    if (!buat.awalan.trim() || !buat.dari.trim()) {
      tampilPesan({ jenis: 'galat', teks: 'Isi awalan nama dan nilai Dari terlebih dahulu.' })
      return
    }
    const tombolBuat = e.currentTarget.querySelector('button[type="submit"]')
    menulis = true
    ++urutan
    sibukTombol(tombolBuat, true)
    let berhasil = false
    try {
      const hasil = await panggilApi('kenaikanBuatKelas', { id: tahun.id, tingkat: Number(buat.tingkat), awalan: buat.awalan.trim(), dari: buat.dari.trim(), sampai: buat.sampai.trim(), kuota: Number(buat.kuota) })
      kabarkanPeriode(hasil.periode)
      tampilPesan({ jenis: 'sukses', teks: hasil.pesan })
      buat = { ...buat, dari: '', sampai: '' }
      for (const kunci of ['peta', 'peta_tinggal']) {
        Object.keys(pilihan[kunci] || {}).forEach((id) => { if (!pilihan[kunci][id]) delete pilihan[kunci][id] })
      }
      berhasil = true
    } catch (err) {
      tampilPesan({ jenis: 'galat', teks: err.message })
    } finally { menulis = false; sibukTombol(tombolBuat, false) }
    if (!aktif()) return
    if (berhasil) muat(false)
    else gambar()
  }

  async function muat(dariServer = false) {
    const nomor = ++urutan
    siap = false
    konfirmasi = false
    pesan = ''
    const status = wadah.querySelector('[data-status]')
    if (status) status.innerHTML = memuat('Memperbarui pratinjau...')
    wadah.querySelector('[data-konfirmasi]')?.remove()
    const lanjut = wadah.querySelector('[data-aksi="konfirmasi"]')
    if (lanjut) lanjut.disabled = true
    try {
      const hasil = await panggilApi('kenaikanPratinjau', { id: tahun.id, ...(!dariServer && pilihan ? { peta: { ...pilihan.peta }, peta_tinggal: { ...pilihan.peta_tinggal }, tinggal: [...pilihan.tinggal] } : {}) })
      if (!aktif() || nomor !== urutan) return
      pratinjau = hasil
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
    const tombolJalan = e.currentTarget.querySelector('button[type="submit"]')
    menulis = true
    ++urutan
    sibukTombol(tombolJalan, true)
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
    } finally { menulis = false; sibukTombol(tombolJalan, false) }
  }

  gambar()
  muat()
}
