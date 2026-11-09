const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/'
const URL_JSPDF = CDN + 'jspdf/2.5.1/jspdf.umd.min.js'
const URL_AUTOTABLE = CDN + 'jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
const URL_XLSX = CDN + 'xlsx/0.18.5/xlsx.full.min.js'

const janji = new Map()

function muatSkrip(src) {
  if (janji.has(src)) return janji.get(src)
  const p = new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => {
      el.remove()
      janji.delete(src)
      reject(new Error('Pustaka gagal dimuat. Periksa koneksi internet, lalu coba lagi.'))
    }
    document.head.appendChild(el)
  })
  janji.set(src, p)
  return p
}

export async function muatJspdf() {
  await muatSkrip(URL_JSPDF)
  await muatSkrip(URL_AUTOTABLE)
  const jsPDF = window.jspdf && window.jspdf.jsPDF
  if (!jsPDF) throw new Error('Pustaka jsPDF tidak terbaca.')
  return jsPDF
}

export async function muatXlsx() {
  await muatSkrip(URL_XLSX)
  if (!window.XLSX) throw new Error('Pustaka xlsx tidak terbaca.')
  return window.XLSX
}
