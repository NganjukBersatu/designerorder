import { computed } from 'vue'
import { useAuth } from './useAuth'
import { uploadImage } from '../utils/imageFile'

// Nama tampilan & foto profil sekarang tersimpan di server (kolom
// display_name & photo di tabel users), lewat useAuth().updateProfile().
// Composable ini cuma wrapper tipis biar bentuk yang dipakai di komponen
// (profile.displayName / profile.photo) tetap sama seperti sebelumnya.
export function useProfile() {
  const { user, displayName, photo, updateProfile } = useAuth()

  const profile = computed(() => ({
    displayName: displayName.value,
    photo: photo.value
  }))

  const displayNameOrUsername = computed(() => displayName.value || user.value || 'Akun')

  async function updateDisplayName(name) {
    return await updateProfile({ displayName: String(name || '').trim() })
  }

  async function updatePhoto(file) {
    try {
      const url = await uploadImage(file, 'avatar')
      return await updateProfile({ photo: url })
    } catch (err) {
      return { ok: false, message: err.message || 'Gagal memproses gambar' }
    }
  }

  async function removePhoto() {
    return await updateProfile({ photo: '' })
  }

  return { profile, displayNameOrUsername, updateDisplayName, updatePhoto, removePhoto }
}
