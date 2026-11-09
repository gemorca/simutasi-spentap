import { muatXlsx } from './pustaka.js'

const dua = (n) => String(n).padStart(2, '0')

export async function unduhExcel(namaFile, lembar) {
  const XLSX = await muatXlsx()
  const buku = XLSX.utils.book_new()
  lembar.forEach((l) => {
    const ws = XLSX.utils.aoa_to_sheet(l.baris)
    if (l.lebar) ws['!cols'] = l.lebar.map((w) => ({ wch: w }))
    XLSX.utils.book_append_sheet(buku, ws, l.nama)
  })
  XLSX.writeFile(buku, namaFile)
}

export async function bacaExcel(file) {
  const XLSX = await muatXlsx()
  const buku = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = buku.Sheets[buku.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
}

export async function tanggalKeTeks(v) {
  if (v === '' || v == null) return ''
  if (typeof v === 'number') {
    const XLSX = await muatXlsx()
    const k = XLSX.SSF.parse_date_code(v)
    return k ? `${k.y}-${dua(k.m)}-${dua(k.d)}` : ''
  }
  const t = String(v).trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  if (m) return `${m[1]}-${dua(m[2])}-${dua(m[3])}`
  m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(t)
  if (m) return `${m[3]}-${dua(m[2])}-${dua(m[1])}`
  return t
}
