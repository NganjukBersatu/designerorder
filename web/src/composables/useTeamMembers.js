// Daftar anggota tim, dipakai buat dropdown Designer (jadi Designer di form
// produk otomatis diambil dari siapa aja yang ada di tim, bukan diketik bebas).
import { ref } from 'vue'
import { api, getToken } from '../utils/api.js'

const members = ref([])
const loaded = ref(false)

async function fetchMembers() {
  try {
    const res = await api.get('/team/members')
    members.value = res.data
    loaded.value = true
  } catch {
    // gagal diam-diam: form tetap bisa dipakai, cuma dropdown designer kosong
  }
}

if (getToken()) fetchMembers()

export function useTeamMembers() {
  if (!loaded.value && getToken()) fetchMembers()
  return { members, fetchMembers }
}
