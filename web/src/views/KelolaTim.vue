<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../utils/api.js'
import { shortDate } from '../utils/format.js'
import { useAuth } from '../composables/useAuth'
import { useTeamMembers } from '../composables/useTeamMembers'
import Modal from '../components/Modal.vue'
import PasswordInput from '../components/PasswordInput.vue'

// Owner dan admin berkuasa atas semua tim (peran Owner hanya milik Owner): buat/ganti nama tim,
// buat akun di tim mana pun, ubah peran, reset sandi, pindahkan akun, hapus akun.
// Satu akun satu tim; "pindah ke tim lain" = memindahkan akun sendiri.
const { user, applySession, setTeamName, role: myRole } = useAuth()
const { fetchMembers } = useTeamMembers()

const ROLES = [
  { value: 'member', label: 'Biasa' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
]
const roleLabel = (r) => ROLES.find((x) => x.value === r)?.label || r

// Peran Owner hanya milik Owner: admin tidak bisa memberinya, dan akun Owner terkunci untuk admin.
const isOwner = computed(() => myRole.value === 'owner')
const locked = (u) => u.role === 'owner' && !isOwner.value

const teams = ref([])
const users = ref([])
const loading = ref(true)
const errorMsg = ref('')
const busy = ref(false)

const myAccount = computed(() => users.value.find((u) => u.username === user.value) || null)

async function load() {
  errorMsg.value = ''
  try {
    const [t, u] = await Promise.all([api.get('/admin/teams'), api.get('/admin/users')])
    teams.value = t.data
    users.value = u.data
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

// --- Toast ---
const toast = ref(null)
let toastTimer
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

// Kalau yang berubah akun sendiri (mis. pindah tim), pakai sesi baru dari server
function applyIfSession(res) {
  if (res.session) {
    applySession(res.session)
    return true
  }
  return false
}

async function run(label, fn) {
  if (busy.value) return
  busy.value = true
  try {
    await fn()
  } catch (err) {
    showToast(err.message || `Gagal ${label}`, 'error')
  } finally {
    busy.value = false
    await load() // selalu sinkron dengan server (juga mengembalikan dropdown yang gagal diubah)
    refreshSharedMembers()
  }
}

// ===== TIM =====
const newTeam = ref({ name: '', withOwner: false, username: '', password: '' })

function createTeam() {
  return run('membuat tim', async () => {
    const body = { name: newTeam.value.name }
    if (newTeam.value.withOwner) body.admin = { username: newTeam.value.username, password: newTeam.value.password }
    const res = await api.post('/admin/teams', body)
    showToast(`Tim "${res.data.name}" dibuat`)
    newTeam.value = { name: '', withOwner: false, username: '', password: '' }
  })
}

const editingTeamId = ref(null)
const editName = ref('')
function startRename(t) {
  editingTeamId.value = t.id
  editName.value = t.name
}
function saveRename(t) {
  const name = editName.value.trim()
  editingTeamId.value = null
  if (!name || name === t.name) return Promise.resolve()
  return run('mengganti nama tim', async () => {
    await api.patch(`/admin/teams/${t.id}`, { name })
    showToast('Nama tim diganti')
    // nama tim di header/pengaturan ikut diperbarui kalau ini tim aktif
    if (t.current) setTeamName(name)
  })
}

function switchTo(t) {
  if (!myAccount.value) return
  return run('pindah tim', async () => {
    const res = await api.patch(`/admin/users/${myAccount.value.id}`, { teamId: t.id })
    applyIfSession(res)
    showToast(`Sekarang kamu berada di tim "${t.name}"`)
  })
}

// ===== AKUN =====
function changeRole(u, role) {
  if (role === u.role) return
  return run('mengubah peran', async () => {
    const res = await api.patch(`/admin/users/${u.id}`, { role })
    applyIfSession(res)
    showToast(`Peran ${u.username} jadi ${roleLabel(role)}`)
  })
}

function moveUser(u, teamId) {
  if (teamId === u.teamId) return
  const target = teams.value.find((t) => t.id === teamId)
  return run('memindahkan akun', async () => {
    const res = await api.patch(`/admin/users/${u.id}`, { teamId })
    applyIfSession(res)
    showToast(`${u.username} dipindah ke tim "${target?.name}"`)
  })
}

const newUser = ref({ teamId: '', username: '', password: '', role: 'member' })
function createUser() {
  return run('membuat akun', async () => {
    const res = await api.post('/admin/users', { ...newUser.value })
    showToast(`Akun ${res.data.username} dibuat di tim "${res.data.teamName}"`)
    newUser.value = { teamId: newUser.value.teamId, username: '', password: '', role: 'member' }
  })
}

const resetTarget = ref(null)
const resetPassword = ref('')
function openReset(u) {
  resetTarget.value = u
  resetPassword.value = ''
}
async function submitReset() {
  const u = resetTarget.value
  if (!u) return
  await run('mereset kata sandi', async () => {
    await api.patch(`/admin/users/${u.id}`, { password: resetPassword.value })
    showToast(`Kata sandi ${u.username} direset`)
    resetTarget.value = null
  })
}

const deleteTarget = ref(null)
async function confirmDelete() {
  const u = deleteTarget.value
  if (!u) return
  await run('menghapus akun', async () => {
    await api.delete(`/admin/users/${u.id}`)
    showToast(`Akun ${u.username} dihapus`)
    deleteTarget.value = null
  })
}

// Jumlah anggota tim dipakai juga di tempat lain (daftar anggota) — segarkan setelah ada perubahan
async function refreshSharedMembers() {
  try { await fetchMembers() } catch { /* tidak kritikal */ }
}
</script>

<template>
  <div class="fx-grid [--fx-min:30rem] gap-5 items-start">
    <div v-if="loading" class="h-40 rounded-card bg-white shadow-card animate-pulse" />
    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
    </div>

    <template v-else>
      <!-- ===================== TIM ===================== -->
      <section class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Semua tim</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Satu akun berada di satu tim. Untuk bekerja di tim lain, pindahkan akunmu ke sana.
          </p>
        </div>

        <ul class="divide-y divide-ink-100">
          <li v-for="t in teams" :key="t.id" class="flex items-center gap-3 px-5 py-3 flex-wrap">
            <div class="min-w-0 flex-1">
              <template v-if="editingTeamId === t.id">
                <input
                  v-model="editName"
                  type="text"
                  maxlength="150"
                  class="w-full max-w-xs px-3 py-1.5 rounded-lg border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white"
                  @keyup.enter="saveRename(t)"
                  @keyup.esc="editingTeamId = null"
                />
              </template>
              <template v-else>
                <p class="text-sm font-medium text-ink-800 truncate">
                  {{ t.name }}
                  <span v-if="t.current" class="ml-1.5 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium">tim aktif</span>
                </p>
                <p class="text-[12px] text-ink-400">{{ t.memberCount }} anggota · dibuat {{ shortDate(t.createdAt) }}</p>
              </template>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <template v-if="editingTeamId === t.id">
                <button type="button" class="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[13px]" @click="saveRename(t)">Simpan</button>
                <button type="button" class="px-3 py-1.5 rounded-lg border border-ink-200 text-ink-600 text-[13px]" @click="editingTeamId = null">Batal</button>
              </template>
              <template v-else>
                <button type="button" class="px-3 py-1.5 rounded-lg border border-ink-200 text-ink-700 text-[13px] hover:bg-ink-500/5 transition" @click="startRename(t)">Ganti nama</button>
                <button
                  v-if="!t.current"
                  type="button"
                  :disabled="busy"
                  class="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-[13px] transition"
                  @click="switchTo(t)"
                >
                  Pindah ke sini
                </button>
              </template>
            </div>
          </li>
        </ul>

        <form class="px-5 py-4 border-t border-ink-100 bg-cream-50 space-y-3" @submit.prevent="createTeam">
          <h3 class="text-sm font-semibold text-ink-800">Buat tim baru</h3>
          <input
            v-model="newTeam.name"
            type="text"
            maxlength="150"
            placeholder="Nama tim"
            class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white"
          />
          <label class="flex items-center gap-2 text-[13px] text-ink-600 cursor-pointer">
            <input v-model="newTeam.withOwner" type="checkbox" class="rounded" />
            Buat sekaligus akun admin pertamanya
          </label>
          <div v-if="newTeam.withOwner" class="fx-grid [--fx-min:13rem] gap-3">
            <input v-model="newTeam.username" type="text" placeholder="Username admin" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white" />
            <PasswordInput v-model="newTeam.password" placeholder="Kata sandi (min. 8 karakter)" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white" />
          </div>
          <button type="submit" :disabled="busy || !newTeam.name.trim()" class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm">
            Buat tim
          </button>
        </form>
      </section>

      <!-- ===================== AKUN ===================== -->
      <section class="fx-2 bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Semua akun</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">Ubah peran atau pindahkan akun ke tim lain langsung dari tabel ini.</p>
        </div>

        <div class="overflow-x-auto">
          <table v-rtable class="rtable w-full text-sm">
            <thead>
              <tr class="text-ink-500 border-b border-ink-100 bg-cream-100">
                <th class="px-5 py-3 text-left font-medium">Akun</th>
                <th class="px-3 py-3 text-left font-medium">Tim</th>
                <th class="px-3 py-3 text-left font-medium">Peran</th>
                <th class="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id" class="border-b border-ink-50">
                <td class="px-5 py-3">
                  <p class="font-medium text-ink-800">
                    {{ u.displayName || u.username }}
                    <span v-if="u.username === user" class="text-ink-400 font-normal">(kamu)</span>
                  </p>
                  <p class="text-[12px] text-ink-400">@{{ u.username }}</p>
                </td>
                <td class="px-3 py-3">
                  <select
                    :value="u.teamId"
                    :disabled="busy || locked(u)"
                    class="px-2.5 py-1.5 rounded-lg border border-ink-200 bg-white text-[13px] max-w-[190px]"
                    @change="moveUser(u, $event.target.value)"
                  >
                    <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </td>
                <td class="px-3 py-3">
                  <select
                    :value="u.role"
                    :disabled="busy || locked(u)"
                    class="px-2.5 py-1.5 rounded-lg border border-ink-200 bg-white text-[13px]"
                    @change="changeRole(u, $event.target.value)"
                  >
                    <option v-for="r in ROLES" :key="r.value" :value="r.value" :disabled="r.value === 'owner' && !isOwner">{{ r.label }}</option>
                  </select>
                </td>
                <td class="px-5 py-3 text-right whitespace-nowrap">
                  <button v-if="!locked(u)" type="button" class="px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 text-[12.5px] hover:bg-ink-500/5 transition" @click="openReset(u)">Reset sandi</button>
                  <button
                    v-if="u.username !== user && !locked(u)"
                    type="button"
                    class="ml-1.5 px-2.5 py-1.5 rounded-lg text-danger-600 hover:bg-danger-500/10 text-[12.5px] transition"
                    @click="deleteTarget = u"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <form class="px-5 py-4 border-t border-ink-100 bg-cream-50 space-y-3" @submit.prevent="createUser">
          <h3 class="text-sm font-semibold text-ink-800">Buat akun</h3>
          <div class="fx-grid [--fx-min:13rem] gap-3">
            <select v-model="newUser.teamId" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white">
              <option value="" disabled>Pilih tim</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <select v-model="newUser.role" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white">
              <option v-for="r in ROLES" :key="r.value" :value="r.value" :disabled="r.value === 'owner' && !isOwner">{{ r.label }}</option>
            </select>
            <input v-model="newUser.username" type="text" placeholder="Username" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white" />
            <PasswordInput v-model="newUser.password" placeholder="Kata sandi (min. 8 karakter)" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white" />
          </div>
          <button type="submit" :disabled="busy || !newUser.teamId || !newUser.username.trim()" class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm">
            Buat akun
          </button>
        </form>
      </section>
    </template>

    <!-- Reset sandi -->
    <Modal v-if="resetTarget" :title="`Reset kata sandi ${resetTarget.username}`" @close="resetTarget = null">
      <form class="space-y-4" @submit.prevent="submitReset">
        <PasswordInput
          v-model="resetPassword"
          autocomplete="new-password"
          placeholder="Kata sandi baru (min. 8 karakter)"
          class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm bg-white"
        />
        <div class="flex justify-end gap-2.5">
          <button type="button" class="px-4 py-2 rounded-lg border border-ink-200 text-ink-600 text-[13.5px]" @click="resetTarget = null">Batal</button>
          <button type="submit" :disabled="busy || resetPassword.length < 8" class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-[13.5px] font-medium">Reset</button>
        </div>
      </form>
    </Modal>

    <!-- Hapus akun -->
    <Modal v-if="deleteTarget" title="Hapus akun?" @close="deleteTarget = null">
      <div class="space-y-5">
        <p class="text-[13.5px] text-ink-600">
          Akun <span class="font-medium text-ink-900">{{ deleteTarget.username }}</span>
          ({{ deleteTarget.teamName }}) akan dihapus permanen. Order yang pernah dibuatnya tetap ada.
        </p>
        <div class="flex justify-end gap-2.5">
          <button type="button" class="px-4 py-2 rounded-lg border border-ink-200 text-ink-600 text-[13.5px]" @click="deleteTarget = null">Batal</button>
          <button type="button" :disabled="busy" class="px-4 py-2 rounded-lg bg-danger-500 hover:bg-danger-600 disabled:opacity-60 text-white text-[13.5px] font-medium" @click="confirmDelete">Ya, hapus</button>
        </div>
      </div>
    </Modal>

    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-5 right-5 z-[10000] px-4 py-3 rounded-xl shadow-card-hover text-[13.5px] font-medium text-white"
        :class="toast.type === 'error' ? 'bg-danger-600' : 'bg-brand-600'"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
