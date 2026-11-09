const teks = (v) => String(v === undefined || v === null ? '' : v).trim()

export const wajib = (pesan = 'Wajib diisi') => (v) => (teks(v) ? '' : pesan)

export const minPanjang = (n, pesan) => (v) => (
  teks(v).length >= n ? '' : (pesan || 'Minimal ' + n + ' karakter')
)

export const angkaMin = (n, pesan) => (v) => {
  if (teks(v) === '') return ''
  const x = Number(v)
  return Number.isInteger(x) && x >= n ? '' : (pesan || 'Isi bilangan bulat, minimal ' + n)
}

export function periksa(nilai, aturan) {
  const galat = {}
  Object.keys(aturan).forEach((nama) => {
    for (const cek of aturan[nama]) {
      const pesan = cek(nilai[nama], nilai)
      if (pesan) { galat[nama] = pesan; break }
    }
  })
  return galat
}
