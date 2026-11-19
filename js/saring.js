const teks = (v) => String(v == null ? '' : v).trim()

export function saringSiswa(daftar, f = {}) {
    const q = teks(f.q).toLowerCase()
    const kelasId = teks(f.kelas_id)
    const status = teks(f.status)
    const hasil = daftar.filter((s) => {
        if (kelasId && String(s.kelas_id) !== kelasId) return false
        if (status && s.status !== status) return false
        if (q && (String(s.nama) + ' ' + String(s.nisn_nis)).toLowerCase().indexOf(q) < 0) return false
        return true
    })
    hasil.sort((a, b) => String(a.nama).localeCompare(String(b.nama)))
    return { total: hasil.length, dipotong: false, daftar: hasil }
}

export function saringMutasi(daftar, f = {}) {
    const jenis = teks(f.jenis)
    const status = teks(f.status)
    const q = teks(f.q).toLowerCase()
    const kelasId = teks(f.kelas_id)
    const dari = teks(f.dari)
    const sampai = teks(f.sampai)
    const hasil = daftar.filter((m) => {
        if (jenis && m.jenis !== jenis) return false
        if (status && m.status !== status) return false
        if (kelasId && String(m.kelas_id) !== kelasId) return false
        if (dari && String(m.tanggal) < dari) return false
        if (sampai && String(m.tanggal) > sampai) return false
        if (q && (String(m.nama_siswa) + ' ' + String(m.sekolah) + ' ' + String(m.nisn_nis)).toLowerCase().indexOf(q) < 0) return false
        return true
    })
    hasil.sort((a, b) => String(b.dibuat_pada || '').localeCompare(String(a.dibuat_pada || '')))
    return { total: hasil.length, dipotong: false, daftar: hasil }
}