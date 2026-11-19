import { ambilCache, segarkan } from './api.js'
import { saringMutasi } from './saring.js'
import { memuat, galatMuat, tandaiMemuat } from './ui.js'

export function sumberMutasi(filter) {
    let semua = null
    let urutan = 0

    function saring(isi, gambar) {
        if (semua && isi && isi.isConnected) gambar(saringMutasi(semua, filter))
    }

    async function muat(isi, gambar) {
        const saya = ++urutan
        const cache = ambilCache('mutasi')
        if (cache) semua = cache.daftar
        const ada = semua !== null
        if (ada) {
            saring(isi, gambar)
            tandaiMemuat(isi, true)
        } else {
            isi.innerHTML = memuat()
        }
        try {
            const d = await segarkan('mutasi')
            if (saya !== urutan || !isi.isConnected) return
            semua = d.daftar
            saring(isi, gambar)
        } catch (err) {
            if (saya !== urutan || !isi.isConnected) return
            if (!ada) isi.innerHTML = galatMuat(err.message)
        } finally {
            if (saya === urutan) tandaiMemuat(isi, false)
        }
    }

    return { saring, muat }
}