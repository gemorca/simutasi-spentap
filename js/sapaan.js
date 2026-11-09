/* Sapaan menurut jam. Memakai jam perangkat, jadi otomatis sesuai zona waktu pengguna (WIB, WITA, WIT).
 * 04.00-10.59 pagi, 11.00-14.59 siang, 15.00-17.59 sore, selebihnya malam. */
export function sapaanWaktu(tanggal = new Date()) {
  const jam = tanggal.getHours()
  if (jam >= 4 && jam < 11) return 'Selamat Pagi'
  if (jam >= 11 && jam < 15) return 'Selamat Siang'
  if (jam >= 15 && jam < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}
