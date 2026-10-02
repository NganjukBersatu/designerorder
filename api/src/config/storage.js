import 'dotenv/config' // env dibaca saat modul ini dimuat, jadi harus sudah termuat (skrip juga import ini)
import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

// Object storage kompatibel S3 (R2, S3, Railway Bucket, MinIO, dll).
// File gambar disimpan di bucket; database cuma menyimpan URL publiknya.
// Nama bawaan Railway Bucket (ENDPOINT, REGION, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY)
// dibaca langsung. Versi berawalan S3_ tetap diterima dan didahulukan (mis. untuk R2/MinIO
// atau .env lokal). PUBLIC_URL & FORCE_PATH_STYLE tidak disediakan bucket, jadi tetap S3_.
const pick = (name) => process.env[`S3_${name}`] || process.env[name]
const S3_ENDPOINT = pick('ENDPOINT')
const S3_REGION = pick('REGION') || 'auto'
const S3_BUCKET = pick('BUCKET')
const S3_ACCESS_KEY_ID = pick('ACCESS_KEY_ID')
const S3_SECRET_ACCESS_KEY = pick('SECRET_ACCESS_KEY')
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE

export const KINDS = ['product', 'order', 'avatar']

// Alamat dasar gambar yang dibuka browser. Di Railway otomatis memakai domain publik service
// ini (RAILWAY_PUBLIC_DOMAIN, disediakan Railway) + /api/files, jadi tidak perlu variabel
// tambahan. S3_PUBLIC_URL (opsional) menimpanya, mis. kalau pakai CDN/bucket publik.
const autoPublicUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/files` : ''
const publicBase = (S3_PUBLIC_URL || autoPublicUrl).replace(/\/+$/, '')

export function isStorageConfigured() {
  return Boolean(S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && publicBase)
}

let client
function getClient() {
  if (!client) {
    client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
      forcePathStyle: S3_FORCE_PATH_STYLE === 'true',
    })
  }
  return client
}

// Jenis gambar ditentukan dari isi file (magic bytes), bukan dari Content-Type
// atau nama file yang dikirim client — keduanya bisa dipalsukan.
export function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return null
}

// Key = <teamId>/<kind>/<uuid>.<ext>. Prefix teamId dipakai juga buat
// memastikan satu tim tidak bisa menghapus file milik tim lain.
export async function uploadImage({ teamId, kind, buffer }) {
  const type = detectImageType(buffer)
  if (!type) {
    const err = new Error('File harus berupa gambar JPG, PNG, atau WEBP')
    err.status = 400
    throw err
  }
  const key = `${teamId}/${kind}/${randomUUID()}.${type.ext}`
  await getClient().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: type.mime,
    CacheControl: 'public, max-age=31536000, immutable', // nama file unik, tidak pernah ditimpa
  }))
  return `${publicBase}/${key}`
}

// Hapus file di bucket berdasarkan URL-nya. Best-effort: gagal hapus tidak
// boleh menggagalkan request user (paling buruk ada file yatim di bucket).
// Hanya menghapus URL milik bucket kita DAN berprefix teamId yang sama.
export async function deleteImageByUrl(url, teamId) {
  try {
    if (!isStorageConfigured() || typeof url !== 'string' || !url.startsWith(`${publicBase}/`)) return false
    const key = url.slice(publicBase.length + 1)
    if (!key.startsWith(`${teamId}/`) || key.includes('..')) return false
    await getClient().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
    return true
  } catch (err) {
    console.error('Gagal menghapus gambar di bucket:', err.message)
    return false
  }
}

// Ambil file dari bucket (dipakai route /api/files, karena bucket Railway privat dan
// browser tidak bisa membukanya langsung). ifNoneMatch = ETag dari browser; kalau
// belum berubah, bucket membalas 304 dan SDK melempar error berstatus 304.
export async function getImageObject(key, ifNoneMatch) {
  return getClient().send(new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ...(ifNoneMatch ? { IfNoneMatch: ifNoneMatch } : {}),
  }))
}
