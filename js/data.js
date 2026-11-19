const NAMA = ['kelas', 'siswa', 'mutasi', 'dashboard']

const SEMUA_ENTITAS = [...NAMA]

const DAMPAK = {
    siswaSimpan: ['siswa', 'kelas', 'dashboard'],
    siswaHapus: ['siswa', 'kelas', 'dashboard'],
    siswaBulkDestroy: ['siswa', 'kelas', 'dashboard'],
    siswaImpor: ['siswa', 'kelas', 'dashboard'],

    kelasSimpan: ['kelas', 'siswa', 'mutasi', 'dashboard'],
    kelasHapus: ['kelas', 'siswa', 'mutasi', 'dashboard'],
    kelasBulkDestroy: ['kelas', 'siswa', 'mutasi', 'dashboard'],
    tahunAjaranSalinKelas: ['kelas', 'siswa', 'mutasi', 'dashboard'],
    kenaikanBuatKelas: ['kelas', 'siswa', 'mutasi', 'dashboard'],

    mutasiSimpan: ['mutasi', 'dashboard'],
    mutasiAjukan: ['mutasi', 'dashboard'],
    mutasiHapus: ['mutasi', 'dashboard'],
    mutasiTolak: ['mutasi', 'dashboard'],
    lampiranUnggah: ['mutasi', 'dashboard'],
    lampiranHapus: ['mutasi', 'dashboard'],
    suratNomorUbah: ['mutasi'],

    mutasiSetujui: ['mutasi', 'siswa', 'kelas', 'dashboard'],
    mutasiBatalSetuju: ['mutasi', 'siswa', 'kelas', 'dashboard'],
    mutasiArsipLengkapi: ['mutasi', 'siswa', 'kelas', 'dashboard'],
    mutasiImporArsip: ['mutasi', 'siswa', 'kelas', 'dashboard'],

    penggunaSimpan: ['mutasi'],
    penggunaHapus: ['mutasi'],
    penggunaBulkDestroy: ['mutasi'],
    profilSimpan: ['mutasi'],

    kenaikanJalankan: SEMUA_ENTITAS,
    kenaikanBatal: SEMUA_ENTITAS,
    tahunAjaranSimpan: SEMUA_ENTITAS,
    tahunAjaranHapus: SEMUA_ENTITAS,
    pengaturanSimpan: SEMUA_ENTITAS,

    login: [],
    logout: [],
    gantiPassword: [],
    penggunaAktif: [],
    penggunaResetPassword: [],
    profilFotoUnggah: [],
    profilFotoHapus: [],
}

let isi = {}
const versi = { kelas: 0, siswa: 0, mutasi: 0, dashboard: 0 }

export function versiSekarang() {
    return { ...versi }
}

export function simpan(nama, nilai, versiAwal) {
    if (!NAMA.includes(nama)) return false
    if (versiAwal !== undefined && versiAwal !== versi[nama]) return false
    isi[nama] = { json: JSON.stringify(nilai), waktu: Date.now() }
    return true
}

export function ada(nama) {
    return Boolean(isi[nama])
}

export function umur(nama) {
    return isi[nama] ? Date.now() - isi[nama].waktu : null
}

export function ambil(nama, { maksUmurMs } = {}) {
    const e = isi[nama]
    if (!e) return undefined
    if (maksUmurMs !== undefined && Date.now() - e.waktu >= maksUmurMs) return undefined
    return JSON.parse(e.json)
}

export function buang(...daftar) {
    daftar.forEach((nama) => {
        if (!NAMA.includes(nama)) return
        delete isi[nama]
        versi[nama]++
    })
}

export function kosongkan() {
    buang(...SEMUA_ENTITAS)
}

export function terapkanDampak(aksi) {
    const daftar = DAMPAK[aksi]
    if (daftar) buang(...daftar)
    else kosongkan()
}

export function ringkas() {
    const hasil = {}
    NAMA.forEach((nama) => {
        const e = isi[nama]
        hasil[nama] = e ? { ada: true, umurDetik: Math.round((Date.now() - e.waktu) / 1000), byte: e.json.length } : { ada: false }
    })
    return hasil
}