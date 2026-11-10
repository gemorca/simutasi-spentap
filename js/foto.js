import { panggilApi } from './api.js'
import { base64KeUrl, fileKeBase64 } from './util.js'
import { inisial } from './ui.js'

const UKURAN = 512
const BATAS_ASAL_MB = 10

let url = ''
let muatan = null

function umumkan() {
  window.dispatchEvent(new CustomEvent('foto-berubah', { detail: { url } }))
}

function setUrl(baru) {
  if (url) URL.revokeObjectURL(url)
  url = baru
  umumkan()
}

export function urlFoto() { return url }

export function lupakanFoto() {
  muatan = null
  setUrl('')
}

export function muatFotoProfil() {
  if (muatan) return muatan
  muatan = (async () => {
    try {
      const data = await panggilApi('profilFotoAmbil')
      setUrl(data && data.ada ? base64KeUrl(data.mime, data.base64) : '')
    } catch {
    } finally {
      muatan = null
    }
  })()
  return muatan
}

async function siapkanFoto(file) {
  if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error('Foto harus berformat JPG atau PNG.')
  if (file.size > BATAS_ASAL_MB * 1024 * 1024) throw new Error('Ukuran foto melebihi ' + BATAS_ASAL_MB + ' MB.')

  let bmp
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { throw new Error('Foto tidak dapat dibaca. Pilih file JPG atau PNG lain.') }

  const sisi = Math.min(bmp.width, bmp.height)
  const ukuran = Math.min(UKURAN, sisi)
  const kanvas = document.createElement('canvas')
  kanvas.width = ukuran
  kanvas.height = ukuran
  const ctx = kanvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ukuran, ukuran)
  ctx.drawImage(bmp, (bmp.width - sisi) / 2, (bmp.height - sisi) / 2, sisi, sisi, 0, 0, ukuran, ukuran)
  bmp.close && bmp.close()

  const blob = await new Promise((selesai) => kanvas.toBlob(selesai, 'image/jpeg', 0.88))
  if (!blob) throw new Error('Foto gagal diproses. Coba file lain.')
  return blob
}

export async function unggahFotoProfil(file, { saatProgres } = {}) {
  const blob = await siapkanFoto(file)
  const base64 = await fileKeBase64(blob)
  const hasil = await panggilApi('profilFotoUnggah', { nama_file: 'foto-profil.jpg', base64 }, { saatProgres })
  setUrl(URL.createObjectURL(blob))
  return hasil
}

export async function hapusFotoProfil() {
  const hasil = await panggilApi('profilFotoHapus')
  setUrl('')
  return hasil
}

export function isiAvatar(el, nama) {
  if (!el) return
  if (url) {
    const img = document.createElement('img')
    img.src = url
    img.alt = ''
    img.className = 'h-full w-full object-cover'
    el.classList.add('overflow-hidden')
    el.replaceChildren(img)
  } else {
    el.classList.remove('overflow-hidden')
    el.textContent = inisial(nama)
  }
}
