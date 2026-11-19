export const ENTITAS = ['kelas', 'siswa', 'mutasi', 'dashboard']

const isi = new Map()
const versi = {}
ENTITAS.forEach((e) => { versi[e] = 0 })

const SEMUA = ENTITAS
const DAMPAK = {
    login: SEMUA,
    logout: SEMUA,

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
    mutasiArsipLengkapi: ['mutasi', 'dashboard'],
    mutasiImporArsip: ['mutasi', 'dashboard'],
    lampiranUnggah: ['mutasi', 'dashboard'],
    lampiranHapus: ['mutasi', 'dashboard'],
    suratNomorUbah: ['mutasi'],

    mutasiSetujui: ['mutasi', 'siswa', 'kelas', 'dashboard'],
    mutasiBatalSetuju: ['mutasi', 'siswa', 'kelas', 'dashboard'],

    penggunaSimpan: ['mutasi'],
    penggunaHapus: ['mutasi'],
    penggunaBulkDestroy: ['mutasi'],
    profilSimpan: ['mutasi'],
    pengaturanSimpan: ['dashboard'],

    tahunAjaranSimpan: SEMUA,
    tahunAjaranHapus: SEMUA,
    kenaikanJalankan: SEMUA,
    kenaikanBatal: SEMUA,
}

const TIDAK_BERDAMPAK = new Set([
    'gantiPassword', 'profilFotoUnggah', 'profilFotoHapus',
    'penggunaAktif', 'penggunaResetPassword',
    'suratData', 'stafTuDaftar', 'stafTuAktivitas', 'tahunAjaranDaftar', 'kenaikanPratinjau',
])

function bekukan(nilai) {
    if (nilai && typeof nilai === 'object' && !Object.isFrozen(nilai)) {
        Object.freeze(nilai)
        Object.values(nilai).forEach(bekukan)
    }
    return nilai
}

export function versiSekarang(entitas) { return versi[entitas] || 0 }

export function simpan(entitas, data, versiAwal) {
    if (!ENTITAS.includes(entitas)) return false
    if (versiAwal !== undefined && versiAwal !== versiSekarang(entitas)) return false
    isi.set(entitas, { data: bekukan(data), waktu: Date.now() })
    return true
}

export function ambil(entitas) { return isi.get(entitas) || null }

export function umur(entitas) {
    const ada = isi.get(entitas)
    return ada ? Date.now() - ada.waktu : Infinity
}

export function buang(...daftar) {
    daftar.flat().forEach((e) => {
        if (!ENTITAS.includes(e)) return
        isi.delete(e)
        versi[e] = versiSekarang(e) + 1
    })
}

export function kosongkan() { buang(ENTITAS) }

export function buangUntukAksi(aksi) {
    if (TIDAK_BERDAMPAK.has(aksi)) return
    buang(DAMPAK[aksi] || SEMUA)
}