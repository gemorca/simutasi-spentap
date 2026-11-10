import { NAMA_BULAN } from './periode.js'
import { muatJspdf } from './pustaka.js'
import { urutKelas } from './urutKelas.js'

const PDF_FONT = 'times'
const PDF_MARGIN = 15
const PDF_KOTA = 'Tapa'
const PDF_LOGO_KOTAK = 20
const PDF_TIMEOUT_GAMBAR = 6000
const LOGO_SEKOLAH = ['assets/logo-sekolah.png']
const LOGO_BONBOL = ['assets/logo-bonbol.png']
const PDF_MAKS_KOLOM_PORTRAIT = 8
const PDF_UKURAN = { judul: 13, isi: 10, tabel: 9, tabelPadat: 8.5, kecil: 8 }
const PDF_WARNA = {
  navy: [18, 53, 95],
  zebra: [243, 246, 250],
  garis: [190, 200, 214],
  teks: [22, 32, 46],
  redup: [74, 90, 112],
}
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MM_PER_PT = 0.3528

const cacheGambar = new Map()

function bersihkan(v) {
  if (v === null || v === undefined) return '-'
  const t = String(v).replace(/\s+/g, ' ').trim()
  return t === '' ? '-' : t
}

function dua(n) {
  return String(n).padStart(2, '0')
}

function angka(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('id-ID') : '-'
}

function aman(v) {
  return bersihkan(v).replace(/[<>]/g, '')
}

function uraiTanggal(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t || ''))
  if (!m) return null
  const k = { th: Number(m[1]), bl: Number(m[2]), tg: Number(m[3]) }
  return k.bl >= 1 && k.bl <= 12 ? k : null
}

export function tanggalIndonesia(t) {
  const k = uraiTanggal(t)
  return k ? `${dua(k.tg)} ${NAMA_BULAN[k.bl - 1]} ${k.th}` : bersihkan(t)
}

function tanggalSingkat(t) {
  const k = uraiTanggal(t)
  return k ? `${dua(k.tg)} ${BULAN_SINGKAT[k.bl - 1]} ${k.th}` : bersihkan(t)
}

function waktuCetak(dicetak) {
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})\s*(\S+)?/.exec(String(dicetak || ''))
  if (!m) return bersihkan(dicetak)
  return `${tanggalIndonesia(m[1])}, ${m[2]}.${m[3]}${m[4] ? ' ' + m[4] : ''}`
}

function tanggalHariIni() {
  const s = new Date()
  return `${s.getFullYear()}-${dua(s.getMonth() + 1)}-${dua(s.getDate())}`
}

function slug(teks) {
  return String(teks || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function namaFilePdf(jenis, konteks) {
  const bagian = [slug(jenis), slug(konteks), tanggalHariIni()].filter(Boolean)
  return bagian.join('-') + '.pdf'
}

function muatSatuGambar(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.onload = null
      img.onerror = null
      reject(new Error('Waktu habis memuat gambar'))
    }, PDF_TIMEOUT_GAMBAR)
    img.onload = () => {
      clearTimeout(timer)
      try {
        const kanvas = document.createElement('canvas')
        kanvas.width = img.naturalWidth
        kanvas.height = img.naturalHeight
        kanvas.getContext('2d').drawImage(img, 0, 0)
        resolve({ data: kanvas.toDataURL('image/png'), lebar: img.naturalWidth, tinggi: img.naturalHeight })
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Gambar tidak ditemukan'))
    }
    img.crossOrigin = 'anonymous'
    img.src = src
  })
}

export async function muatGambar(daftarSumber) {
  const kunci = daftarSumber.join('|')
  if (cacheGambar.has(kunci)) return cacheGambar.get(kunci)
  let hasil = null
  for (const src of daftarSumber) {
    try {
      hasil = await muatSatuGambar(src)
      break
    } catch {
      hasil = null
    }
  }
  if (hasil) cacheGambar.set(kunci, hasil)
  return hasil
}

function halaman(doc) {
  return { lebar: doc.internal.pageSize.getWidth(), tinggi: doc.internal.pageSize.getHeight() }
}

function tulisTeksCampuran(doc, html, x, y, lebar, opsi = {}) {
  const { rata = 'left', ukuran = PDF_UKURAN.isi, warna = PDF_WARNA.teks } = opsi
  const tinggiBaris = ukuran * MM_PER_PT * 1.35
  doc.setFontSize(ukuran)
  doc.setTextColor(...warna)

  const ukurKata = (kata, tebal) => {
    doc.setFont(PDF_FONT, tebal ? 'bold' : 'normal')
    return doc.getTextWidth(kata)
  }
  const ukurSpasi = (tebal) => ukurKata(' ', tebal)

  const potongan = String(html).split(/(<\/?(?:b|strong)>|<br\s*\/?>)/i)
  const baris = [{ bagian: [], lebar: 0 }]
  let tebal = false

  potongan.forEach((p) => {
    if (/^<(b|strong)>$/i.test(p)) {
      tebal = true
    } else if (/^<\/(b|strong)>$/i.test(p)) {
      tebal = false
    } else if (/^<br\s*\/?>$/i.test(p)) {
      baris.push({ bagian: [], lebar: 0 })
    } else {
      p.split(/\s+/).filter(Boolean).forEach((kata) => {
        const lebarKata = ukurKata(kata, tebal)
        const sekarang = baris[baris.length - 1]
        const jarak = sekarang.bagian.length ? ukurSpasi(tebal) : 0
        if (sekarang.bagian.length && sekarang.lebar + jarak + lebarKata > lebar) {
          baris.push({ bagian: [{ kata, tebal, lebar: lebarKata }], lebar: lebarKata })
        } else {
          sekarang.bagian.push({ kata, tebal, lebar: lebarKata, jarak })
          sekarang.lebar += jarak + lebarKata
        }
      })
    }
  })

  let yy = y
  baris.forEach((b) => {
    let xx = rata === 'center' ? x + (lebar - b.lebar) / 2 : x
    b.bagian.forEach((bg) => {
      xx += bg.jarak || 0
      doc.setFont(PDF_FONT, bg.tebal ? 'bold' : 'normal')
      doc.text(bg.kata, xx, yy, { baseline: 'top' })
      xx += bg.lebar
    })
    yy += tinggiBaris
  })
  doc.setFont(PDF_FONT, 'normal')
  return yy
}

function pastikanRuang(doc, y, tinggi) {
  const { tinggi: tp } = halaman(doc)
  if (y + tinggi > tp - PDF_MARGIN - 8) {
    doc.addPage()
    return PDF_MARGIN
  }
  return y
}

function gambarLogo(doc, logo, x, y) {
  if (!logo) return
  const skala = Math.min(PDF_LOGO_KOTAK / logo.lebar, PDF_LOGO_KOTAK / logo.tinggi)
  const w = logo.lebar * skala
  const h = logo.tinggi * skala
  doc.addImage(logo.data, 'PNG', x + (PDF_LOGO_KOTAK - w) / 2, y + (PDF_LOGO_KOTAK - h) / 2, w, h)
}

/* Kop surat: dua logo di kiri dan kanan, teks di tengah. Posisi logo diatur di dalam fungsi ini. */
function gambarKop(doc, sekolah, logoSekolah, logoBonbol) {
  const { lebar } = halaman(doc)
  const xTeks = PDF_MARGIN + PDF_LOGO_KOTAK + 4
  const lebarTeks = lebar - 2 * xTeks
  const pusat = lebar / 2
  let y = PDF_MARGIN

  // Pilih SATU pasang di bawah. Aktifkan dengan menghapus tanda // di depannya, lalu beri // pada pasangan lain.

  // kalau mau logo-sekolah kiri, logo-bonbol kanan, pakai ini:
  // gambarLogo(doc, logoSekolah, PDF_MARGIN, y)
  // gambarLogo(doc, logoBonbol, lebar - PDF_MARGIN - PDF_LOGO_KOTAK, y)

  // kalau mau logo-bonbol kiri, logo-sekolah kanan, pakai ini:
  gambarLogo(doc, logoBonbol, PDF_MARGIN, y)
  gambarLogo(doc, logoSekolah, lebar - PDF_MARGIN - PDF_LOGO_KOTAK, y)

  doc.setTextColor(...PDF_WARNA.navy)
  doc.setFont(PDF_FONT, 'bold')
  doc.setFontSize(15)
  const nama = doc.splitTextToSize(aman(sekolah.nama).toUpperCase(), lebarTeks)
  let yTeks = y + 4
  nama.forEach((b) => {
    doc.text(b, pusat, yTeks, { align: 'center', baseline: 'top' })
    yTeks += 6.4
  })

  doc.setTextColor(...PDF_WARNA.teks)
  doc.setFont(PDF_FONT, 'normal')
  if (sekolah.npsn) {
    doc.setFontSize(10)
    doc.text('NPSN ' + aman(sekolah.npsn), pusat, yTeks, { align: 'center', baseline: 'top' })
    yTeks += 4.8
  }
  doc.setFontSize(9)
  doc.splitTextToSize(aman(sekolah.alamat), lebarTeks).forEach((b) => {
    doc.text(b, pusat, yTeks, { align: 'center', baseline: 'top' })
    yTeks += 4.2
  })

  const bawah = Math.max(y + PDF_LOGO_KOTAK, yTeks) + 2
  doc.setDrawColor(...PDF_WARNA.navy)
  doc.setLineWidth(0.9)
  doc.line(PDF_MARGIN, bawah, lebar - PDF_MARGIN, bawah)
  doc.setLineWidth(0.25)
  doc.line(PDF_MARGIN, bawah + 1.5, lebar - PDF_MARGIN, bawah + 1.5)
  return bawah + 7
}

function gambarJudul(doc, y, teks) {
  const { lebar } = halaman(doc)
  doc.setFont(PDF_FONT, 'bold')
  doc.setFontSize(PDF_UKURAN.judul)
  doc.setTextColor(...PDF_WARNA.teks)
  let yy = y
  doc.splitTextToSize(teks.toUpperCase(), lebar - 2 * PDF_MARGIN).forEach((b) => {
    doc.text(b, lebar / 2, yy, { align: 'center', baseline: 'top' })
    yy += 5.8
  })
  doc.setFont(PDF_FONT, 'normal')
  return yy + 2
}

function gambarKeterangan(doc, y, baris) {
  const { lebar } = halaman(doc)
  const xLabel = PDF_MARGIN
  const xNilai = PDF_MARGIN + 38
  let yy = y
  baris.forEach(([label, nilai]) => {
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(PDF_UKURAN.isi)
    doc.setTextColor(...PDF_WARNA.teks)
    doc.text(label, xLabel, yy, { baseline: 'top' })
    doc.text(':', xNilai - 3, yy, { baseline: 'top' })
    yy = tulisTeksCampuran(doc, nilai, xNilai, yy, lebar - PDF_MARGIN - xNilai)
  })
  return yy + 2
}

function gambarSubjudul(doc, y, teks) {
  const yy = pastikanRuang(doc, y, 26)
  doc.setFont(PDF_FONT, 'bold')
  doc.setFontSize(PDF_UKURAN.isi)
  doc.setTextColor(...PDF_WARNA.navy)
  doc.text(teks, PDF_MARGIN, yy, { baseline: 'top' })
  doc.setFont(PDF_FONT, 'normal')
  return yy + 6
}

function skalakan(lebar, total) {
  const jumlah = lebar.reduce((a, b) => a + b, 0)
  return lebar.map((w) => (w * total) / jumlah)
}

function bangunTabel(doc, { y, kepala, isi, lebar, rata, ukuran = PDF_UKURAN.tabel, kosong = 'Tidak ada data' }) {
  const { lebar: lp } = halaman(doc)
  const area = lp - 2 * PDF_MARGIN
  const lebarKolom = skalakan(lebar, area)
  const kolom = {}
  lebarKolom.forEach((w, i) => {
    kolom[i] = { cellWidth: w, halign: rata[i] }
  })
  const badan = isi.length
    ? isi
    : [[{
        content: kosong,
        colSpan: kepala.length,
        styles: { halign: 'center', fontStyle: 'italic', textColor: PDF_WARNA.redup },
      }]]

  doc.autoTable({
    startY: y,
    head: [kepala],
    body: badan,
    theme: 'grid',
    tableWidth: area,
    margin: { top: PDF_MARGIN, left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_MARGIN + 8 },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    columnStyles: kolom,
    styles: {
      font: PDF_FONT,
      fontSize: ukuran,
      cellPadding: 1.8,
      textColor: PDF_WARNA.teks,
      lineColor: PDF_WARNA.garis,
      lineWidth: 0.1,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: PDF_WARNA.navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: PDF_WARNA.navy,
    },
    alternateRowStyles: { fillColor: PDF_WARNA.zebra },
  })
  return doc.lastAutoTable.finalY + 7
}

function gambarTandaTangan(doc, y, sekolah, tanggalCetak, kotaTtd = PDF_KOTA) {
  const { lebar } = halaman(doc)
  const tinggiBlok = 46
  const yy = pastikanRuang(doc, y, tinggiBlok)
  const lebarBlok = 70
  const xBlok = lebar - PDF_MARGIN - lebarBlok
  const pusat = xBlok + lebarBlok / 2
  const kota = kotaTtd ? aman(kotaTtd) + ', ' : ''

  doc.setFont(PDF_FONT, 'normal')
  doc.setFontSize(PDF_UKURAN.isi)
  doc.setTextColor(...PDF_WARNA.teks)
  doc.text(kota + tanggalIndonesia(tanggalCetak), pusat, yy, { align: 'center', baseline: 'top' })
  doc.text('Kepala Sekolah,', pusat, yy + 5.5, { align: 'center', baseline: 'top' })

  const yNama = yy + 5.5 + 25
  const nama = sekolah.kepala ? aman(sekolah.kepala) : '(nama belum diisi)'
  doc.setFont(PDF_FONT, 'bold')
  doc.text(nama, pusat, yNama, { align: 'center', baseline: 'top' })
  if (sekolah.kepala) {
    const w = doc.getTextWidth(nama)
    doc.setLineWidth(0.25)
    doc.setDrawColor(...PDF_WARNA.teks)
    doc.line(pusat - w / 2, yNama + 4.6, pusat + w / 2, yNama + 4.6)
  }
  doc.setFont(PDF_FONT, 'normal')
  if (sekolah.nip) {
    doc.text('NIP. ' + aman(sekolah.nip), pusat, yNama + 6, { align: 'center', baseline: 'top' })
  }
  return yNama + 12
}

function nomorHalaman(doc, kiri) {
  const { lebar, tinggi } = halaman(doc)
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...PDF_WARNA.garis)
    doc.setLineWidth(0.2)
    doc.line(PDF_MARGIN, tinggi - PDF_MARGIN + 2, lebar - PDF_MARGIN, tinggi - PDF_MARGIN + 2)
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(PDF_UKURAN.kecil)
    doc.setTextColor(...PDF_WARNA.redup)
    doc.text(kiri, PDF_MARGIN, tinggi - PDF_MARGIN + 4, { baseline: 'top' })
    doc.text(`Halaman ${i} dari ${total}`, lebar - PDF_MARGIN, tinggi - PDF_MARGIN + 4, { align: 'right', baseline: 'top' })
  }
}

function orientasiOtomatis(jumlahKolom) {
  return jumlahKolom > PDF_MAKS_KOLOM_PORTRAIT ? 'landscape' : 'portrait'
}

export async function unduhPdfRekap(lap) {
  const sekolah = lap.sekolah || {}
  const periode = lap.periode || {}
  const ringkasan = lap.ringkasan || {}
  const perKelas = [...(lap.per_kelas || [])].sort(urutKelas)
  const daftar = lap.daftar || []

  const kepalaDaftar = ['No', 'Nama Siswa', 'NISN/NIS', 'JK', 'Kelas', 'Tanggal Masuk', 'Sekolah Asal', 'Alasan']

  const [jsPDF, logoSekolah, logoBonbol] = await Promise.all([
    muatJspdf(),
    muatGambar(LOGO_SEKOLAH),
    muatGambar(LOGO_BONBOL),
  ])

  const doc = new jsPDF({ orientation: orientasiOtomatis(kepalaDaftar.length), unit: 'mm', format: 'a4' })
  doc.setProperties({ title: 'Rekapitulasi Mutasi Siswa Masuk ' + bersihkan(periode.label) })

  let y = gambarKop(doc, sekolah, logoSekolah, logoBonbol)
  y = gambarJudul(doc, y, 'Rekapitulasi Mutasi Siswa Masuk')
  y = gambarKeterangan(doc, y, [
    ['Periode', `<b>${aman(periode.label)}</b>`],
    ['Rentang tanggal', `${tanggalIndonesia(periode.dari)} s/d ${tanggalIndonesia(periode.sampai)}`],
    ['Tahun ajaran', aman(periode.tahun_ajaran)],
    ['Dicetak', waktuCetak(lap.dicetak)],
  ])

  y = gambarSubjudul(doc, y + 2, 'A. Ringkasan')
  y = bangunTabel(doc, {
    y,
    kepala: ['Keterangan', 'Jumlah'],
    isi: [
      ['Total siswa masuk', angka(ringkasan.total_masuk)],
      [`Siswa aktif (TA ${bersihkan(periode.tahun_ajaran)})`, angka(ringkasan.siswa_aktif)],
      ['Jumlah kelas', angka(ringkasan.jumlah_kelas)],
      ['Total kuota', angka(ringkasan.total_kuota)],
    ],
    lebar: [120, 60],
    rata: ['left', 'center'],
  })

  y = gambarSubjudul(doc, y, 'B. Jumlah per Kelas')
  y = bangunTabel(doc, {
    y,
    kepala: ['Kelas', 'Kuota', 'Aktif', 'Sisa', 'Masuk (periode)'],
    isi: perKelas.map((k) => [
      bersihkan(k.nama_kelas), angka(k.kuota), angka(k.aktif), angka(k.sisa), angka(k.masuk_periode),
    ]),
    lebar: [50, 28, 28, 28, 46],
    rata: ['left', 'center', 'center', 'center', 'center'],
    kosong: 'Tidak ada kelas pada tahun ajaran ini',
  })

  y = gambarSubjudul(doc, y, 'C. Daftar Mutasi Siswa Masuk')
  y = bangunTabel(doc, {
    y,
    kepala: kepalaDaftar,
    isi: daftar.map((m, i) => [
      angka(m.no || i + 1),
      bersihkan(m.nama_siswa),
      bersihkan(m.nisn_nis),
      bersihkan(m.jenis_kelamin),
      bersihkan(m.nama_kelas),
      tanggalSingkat(m.tanggal),
      bersihkan(m.sekolah),
      bersihkan(m.alasan),
    ]),
    lebar: [9, 34, 22, 8, 14, 22, 35, 36],
    rata: ['center', 'left', 'center', 'center', 'center', 'center', 'left', 'left'],
    ukuran: PDF_UKURAN.tabelPadat,
    kosong: 'Tidak ada mutasi pada periode ini',
  })

  const tanggalCetak = uraiTanggal(lap.dicetak) ? lap.dicetak : tanggalHariIni()
  gambarTandaTangan(doc, y + 2, sekolah, tanggalCetak)
  nomorHalaman(doc, 'Rekapitulasi Mutasi Siswa Masuk, ' + bersihkan(periode.label))

  const nama = namaFilePdf('rekap-mutasi', periode.label)
  doc.save(nama)
  return nama
}

/* Surat Keterangan siswa masuk. Data dari aksi suratData: nomor dan tanggal terbit tetap,
 * jadi cetak ulang menghasilkan surat yang sama. */
export async function unduhPdfSurat(data) {
  const sekolah = data.sekolah || {}
  const surat = data.surat || {}
  const siswa = data.siswa || {}
  const tempat = data.penempatan || {}
  const jk = String(siswa.jenis_kelamin).toUpperCase() === 'L' ? 'Laki-laki'
    : String(siswa.jenis_kelamin).toUpperCase() === 'P' ? 'Perempuan' : bersihkan(siswa.jenis_kelamin)

  const [jsPDF, logoSekolah, logoBonbol] = await Promise.all([
    muatJspdf(),
    muatGambar(LOGO_SEKOLAH),
    muatGambar(LOGO_BONBOL),
  ])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setProperties({ title: 'Surat Keterangan ' + bersihkan(siswa.nama) })
  const { lebar } = halaman(doc)
  const area = lebar - 2 * PDF_MARGIN

  let y = gambarKop(doc, sekolah, logoSekolah, logoBonbol)
  y = gambarJudul(doc, y + 2, 'Surat Keterangan')
  doc.setFont(PDF_FONT, 'normal')
  doc.setFontSize(PDF_UKURAN.isi)
  doc.setTextColor(...PDF_WARNA.teks)
  doc.text('Nomor: ' + aman(surat.nomor), lebar / 2, y, { align: 'center', baseline: 'top' })
  y += 10

  y = tulisTeksCampuran(doc,
    `Yang bertanda tangan di bawah ini, Kepala <b>${aman(sekolah.nama)}</b>, menerangkan bahwa:`,
    PDF_MARGIN, y, area) + 3

  y = gambarKeterangan(doc, y, [
    ['Nama', `<b>${aman(siswa.nama)}</b>`],
    ['NISN/NIS', aman(siswa.nisn_nis)],
    ['Tempat, tanggal lahir', `${aman(siswa.tempat_lahir)}, ${tanggalIndonesia(siswa.tanggal_lahir)}`],
    ['Jenis kelamin', jk],
    ['Alamat', aman(siswa.alamat)],
    ['Kelas', aman(tempat.nama_kelas)],
  ])
  y += 2

  y = tulisTeksCampuran(doc,
    `adalah benar telah diterima sebagai siswa pindahan dari <b>${aman(tempat.sekolah_asal)}</b> `
    + `dan terdaftar sebagai siswa <b>${aman(sekolah.nama)}</b> kelas <b>${aman(tempat.nama_kelas)}</b> `
    + `tahun ajaran ${aman(tempat.tahun_ajaran)}, terhitung mulai tanggal ${tanggalIndonesia(tempat.tanggal_masuk)}.`,
    PDF_MARGIN, y, area) + 3
  y = tulisTeksCampuran(doc,
    'Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.',
    PDF_MARGIN, y, area) + 6

  gambarTandaTangan(doc, y, sekolah, surat.tanggal_terbit, sekolah.kota)

  const nama = namaFilePdf('surat-keterangan', siswa.nama)
  doc.save(nama)
  return nama
}