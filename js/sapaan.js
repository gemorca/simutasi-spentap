/* Sapaan menurut jam, beragam, dipilih acak sekali per sesi per slot jam.
 * Memakai jam perangkat, jadi otomatis sesuai zona waktu pengguna (WIB, WITA, WIT).
 * Teks dikembalikan tanpa tanda baca. Pemanggil menambahkan koma dan nama:
 *   sapaanWaktu() + ', ' + nama   ->   "Pagi yang cerah, Budi"
 *
 * Slot: 00-03 dini, 04-05 subuh, 06-10 pagi, 11-14 siang, 15-17 sore, 18-20 malam, 21-23 larut.
 * Entri berupa string, atau { teks, bila(tanggal) } bila hanya boleh tampil pada kondisi tertentu. */

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

/* Bumbu hari, ikut masuk kandungan acak hanya pada jam 06.00-17.59. getDay(): 0 Minggu ... 6 Sabtu. */
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

let terpilih = null // { kunci, teks } pilihan sesi saat ini

/* Tanpa argumen acak: hasil disimpan per (hari + slot), jadi layar sambut login dan Beranda
 * menampilkan sapaan yang sama. Berganti saat slot jam berganti, hari berganti, atau halaman dimuat ulang.
 * Dengan argumen acak (fungsi mirip Math.random): tanpa simpanan, untuk pengujian. */
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