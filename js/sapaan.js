
const SLOT = [
  { nama: 'dini', dari: 0, sapaan: ['Begadang ya', 'Masih terjaga', 'Larut malam'] },
  { nama: 'subuh', dari: 4, sapaan: ['Subuh yang tenang', 'Pagi buta', 'Selamat pagi'] },
  { nama: 'pagi', dari: 6, sapaan: ['Pagi yang cerah', 'Awali hari dengan semangat', 'Selamat pagi', 'Pagi yang segar'] },
  {
    nama: 'siang', dari: 11, sapaan: [
      'Siang yang produktif', 'Selamat siang', 'Semangat siang ini',
      { teks: 'Jangan lupa makan siang', bila: (t) => t.getHours() >= 12 && t.getHours() < 14 },
    ],
  },
  { nama: 'sore', dari: 15, sapaan: ['Sore yang indah', 'Sore yang tenang', 'Selamat sore', 'Sore yang hangat'] },
  { nama: 'malam', dari: 18, sapaan: ['Malam yang tenang', 'Selamat malam', 'Malam yang nyaman'] },
  { nama: 'larut', dari: 21, sapaan: ['Malam semakin larut', 'Jangan lupa istirahat', 'Selamat malam'] },
]

const SEPANJANG_KERJA = (t) => t.getHours() >= 6 && t.getHours() < 18
const HARI = [
  { teks: 'Semangat awal pekan', bila: (t) => t.getDay() === 1 && SEPANJANG_KERJA(t) },
  { teks: 'Jumat berkah', bila: (t) => t.getDay() === 5 && SEPANJANG_KERJA(t) },
  { teks: 'Akhir pekan, masih bekerja', bila: (t) => (t.getDay() === 0 || t.getDay() === 6) && SEPANJANG_KERJA(t) },
]

function slotUntuk(jam) {
  let hasil = SLOT[0]
  for (const s of SLOT) if (jam >= s.dari) hasil = s
  return hasil
}

function kandidat(slot, tanggal) {
  return [...slot.sapaan, ...HARI]
    .map((e) => (typeof e === 'string' ? { teks: e } : e))
    .filter((e) => !e.bila || e.bila(tanggal))
    .map((e) => e.teks)
}

const kunciHari = (t) => t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate()

let terpilih = null

export function sapaanWaktu(tanggal = new Date(), acak) {
  const slot = slotUntuk(tanggal.getHours())
  const daftar = kandidat(slot, tanggal)
  const kunci = slot.nama + '|' + kunciHari(tanggal)
  const pakaiSimpanan = !acak
  if (pakaiSimpanan && terpilih && terpilih.kunci === kunci) return terpilih.teks

  const undi = acak || Math.random
  const sebelumnya = pakaiSimpanan && terpilih ? terpilih.teks : null
  const pilihan = daftar.length > 1 ? daftar.filter((s) => s !== sebelumnya) : daftar
  const teks = pilihan[Math.min(pilihan.length - 1, Math.floor(undi() * pilihan.length))]
  if (pakaiSimpanan) terpilih = { kunci, teks }
  return teks
}
