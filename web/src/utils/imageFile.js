import { api } from './api'

// Kecilkan + kompres gambar di browser jadi Blob JPEG (maks maxSize px).
function compressToBlob(file, maxSize = 640, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (JPG, PNG, WEBP)'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gambar tidak valid'))
    }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      // Latar putih supaya PNG transparan tidak jadi hitam saat jadi JPEG
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Gagal memproses gambar'))),
        'image/jpeg',
        quality
      )
    }
    img.src = url
  })
}

// Kompres lalu unggah ke server (disimpan di bucket). Hasilnya URL gambar —
// itu yang disimpan di database, bukan datanya. kind: 'product' | 'order' | 'avatar'.
export async function uploadImage(file, kind) {
  const blob = await compressToBlob(file)
  const form = new FormData()
  form.append('file', blob, 'image.jpg')
  const res = await api.upload(`/uploads?kind=${encodeURIComponent(kind)}`, form)
  return res.url
}
