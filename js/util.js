export function fileKeBase64(file) {
  return new Promise((resolve, reject) => {
    const pembaca = new FileReader()
    pembaca.onload = () => resolve(String(pembaca.result).split(',')[1])
    pembaca.onerror = () => reject(new Error('Gagal membaca file'))
    pembaca.readAsDataURL(file)
  })
}

export function base64KeUrl(mime, base64) {
  const biner = atob(base64)
  const larik = new Uint8Array(biner.length)
  for (let i = 0; i < biner.length; i++) larik[i] = biner.charCodeAt(i)
  return URL.createObjectURL(new Blob([larik], { type: mime }))
}

export function persen(bagian, total) {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((bagian / total) * 100)))
}

export async function kompresGambar(file, { maksSisi = 1600, kualitas = 0.82, ambang = 900 * 1024 } = {}) {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return file
  let bmp
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { return file }

  const skala = Math.min(1, maksSisi / Math.max(bmp.width, bmp.height))
  if (skala === 1 && file.size <= ambang) { bmp.close && bmp.close(); return file }

  const lebar = Math.round(bmp.width * skala)
  const tinggi = Math.round(bmp.height * skala)
  const kanvas = document.createElement('canvas')
  kanvas.width = lebar
  kanvas.height = tinggi
  const ctx = kanvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, lebar, tinggi)
  ctx.drawImage(bmp, 0, 0, lebar, tinggi)
  bmp.close && bmp.close()

  const blob = await new Promise((selesai) => kanvas.toBlob(selesai, 'image/jpeg', kualitas))
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}
