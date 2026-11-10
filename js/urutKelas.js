const NILAI_ROMAWI = { I: 1, V: 5, X: 10 }

function romawiKeAngka(teks) {
  let total = 0
  for (let i = 0; i < teks.length; i++) {
    const sekarang = NILAI_ROMAWI[teks[i]]
    const berikut = NILAI_ROMAWI[teks[i + 1]] || 0
    total += sekarang < berikut ? -sekarang : sekarang
  }
  return total
}

export function uraiKelas(nama) {
  const bersih = String(nama || '').trim().replace(/^kelas\s+/i, '')
  const m = /^(\d+|[IVX]+)/i.exec(bersih)
  if (!m) return { tingkat: null, label: '', sisa: bersih }
  const token = m[1].toUpperCase()
  const tingkat = /^\d+$/.test(token) ? Number(token) : romawiKeAngka(token)
  return { tingkat, label: token, sisa: bersih.slice(m[1].length).replace(/^[\s\-_.]+/, '') }
}

export function urutKelas(a, b) {
  const ua = uraiKelas(a.nama_kelas)
  const ub = uraiKelas(b.nama_kelas)
  if (ua.tingkat !== ub.tingkat) {
    if (ua.tingkat === null) return 1
    if (ub.tingkat === null) return -1
    return ua.tingkat - ub.tingkat
  }
  const sisa = ua.sisa.localeCompare(ub.sisa, 'id', { numeric: true, sensitivity: 'base' })
  if (sisa) return sisa
  if (ua.tingkat === null) {
    const nama = String(a.nama_kelas).localeCompare(String(b.nama_kelas), 'id', { numeric: true, sensitivity: 'base' })
    if (nama) return nama
  }
  return String(b.tahun_ajaran).localeCompare(String(a.tahun_ajaran), 'id', { numeric: true })
}
