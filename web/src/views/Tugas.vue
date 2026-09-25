<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../utils/api.js'
import { shortDate } from '../utils/format.js'
import { useAuth } from '../composables/useAuth'
import { useTeamMembers } from '../composables/useTeamMembers'
import StatusBadge from '../components/StatusBadge.vue'
import Modal from '../components/Modal.vue'
import TaskForm from '../components/TaskForm.vue'

const { user } = useAuth()
const { members } = useTeamMembers()

const tasks = ref([])
const loading = ref(true)
const errorMsg = ref('')
const status = ref('all')
const owner = ref('mine')
const search = ref('')
const showCreate = ref(false)
const editingTask = ref(null)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = new URLSearchParams()
    if (status.value !== 'all') params.set('status', status.value)
    if (owner.value === 'mine') {
      const me = members.value.find(m => m.username === user.value)
      if (me) params.set('userId', me.id)
    }
    const qs = params.toString()
    const res = await api.get(`/tasks${qs ? `?${qs}` : ''}`)
    tasks.value = res.data
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

watch(status, load)
watch(owner, load)
onMounted(load)

const counts = computed(() => ({
  Pending: tasks.value.filter(t => t.status === 'Pending').length,
  Progress: tasks.value.filter(t => t.status === 'Progress').length,
  Done: tasks.value.filter(t => t.status === 'Done').length,
}))

const filteredTasks = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return tasks.value

  return tasks.value.filter(t => {
    const haystack = [
      t.title,
      t.clientName,
      t.designer,
      t.username,
      t.style,
      t.substyle,
      t.note,
      t.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
})

function openCreate() {
  editingTask.value = null
  showCreate.value = true
}

function openEdit(task) {
  editingTask.value = task
  showCreate.value = true
}

function onSaved() {
  showCreate.value = false
  editingTask.value = null
  load()
}

async function cycleStatus(task) {
  const next = { Pending: 'Progress', Progress: 'Done', Done: 'Pending' }[task.status]
  try {
    await api.patch(`/tasks/${task.id}`, { status: next })
    load()
  } catch (err) {
    alert(err.message)
  }
}

// ===== Konfirmasi hapus (modal sendiri, bukan bawaan browser) =====
const taskToDelete = ref(null)
const deleting = ref(false)

function askRemove(task) {
  taskToDelete.value = task
}

function cancelRemove() {
  taskToDelete.value = null
}

async function confirmRemove() {
  if (!taskToDelete.value) return
  deleting.value = true
  try {
    await api.delete(`/tasks/${taskToDelete.value.id}`)
    taskToDelete.value = null
    load()
  } catch (err) {
    alert(err.message)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header + tombol tambah -->
    <div class="flex items-center justify-end gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13.5px] font-medium transition shrink-0 shadow-sm"
        @click="openCreate"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Tugas baru
      </button>
    </div>

    <!-- Ringkasan status -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-white rounded-card shadow-card p-4 flex items-center justify-between">
        <div>
          <p class="text-[12px] text-ink-400">Menunggu</p>
          <p class="text-[20px] font-semibold text-ink-900 mt-0.5">{{ counts.Pending }}</p>
        </div>
        <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
        </div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 flex items-center justify-between">
        <div>
          <p class="text-[12px] text-ink-400">Dikerjakan</p>
          <p class="text-[20px] font-semibold text-ink-900 mt-0.5">{{ counts.Progress }}</p>
        </div>
        <div class="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-500 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 100-16 8 8 0 000 16z" /><path d="M12 8v4l3 2" /></svg>
        </div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 flex items-center justify-between">
        <div>
          <p class="text-[12px] text-ink-400">Selesai</p>
          <p class="text-[20px] font-semibold text-ink-900 mt-0.5">{{ counts.Done }}</p>
        </div>
        <div class="w-9 h-9 rounded-lg bg-ok-50 flex items-center justify-center text-ok-600 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
      </div>
    </div>

    <!-- ===== SEARCH + FILTER (satu baris) ===== -->
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Search -->
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="search"
          type="text"
          placeholder="Cari tugas, klien, designer, style..."
          class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ink-200 bg-white text-[13.5px] placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
        />
        <button
          v-if="search"
          type="button"
          class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-400 hover:text-ink-600"
          @click="search = ''"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filter Owner -->
      <select
        v-model="owner"
        class="rounded-xl border border-ink-200 px-3 py-2.5 text-[13.5px] bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none min-w-[140px]"
      >
        <option value="mine">Tugas saya</option>
        <option value="all">Semua tim</option>
      </select>

      <!-- Filter Status -->
      <select
        v-model="status"
        class="rounded-xl border border-ink-200 px-3 py-2.5 text-[13.5px] bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none min-w-[140px]"
      >
        <option value="all">Semua status</option>
        <option value="Pending">Menunggu</option>
        <option value="Progress">Dikerjakan</option>
        <option value="Done">Selesai</option>
      </select>

      <span v-if="!loading" class="hidden sm:flex items-center text-[12.5px] text-ink-400 whitespace-nowrap">
        {{ filteredTasks.length }} tugas
      </span>
    </div>

    <!-- List tugas -->
    <div class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg bg-ink-100 animate-pulse" />
      </div>
      <div v-else-if="errorMsg" class="p-6 text-center">
        <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
      </div>
      <div v-else-if="filteredTasks.length === 0" class="flex flex-col items-center text-center py-14">
        <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
        </div>
        <template v-if="search">
          <p class="text-[13.5px] font-medium text-ink-700">Tidak ada yang cocok</p>
          <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Tidak ditemukan tugas untuk "<strong class="text-ink-600">{{ search }}</strong>".</p>
        </template>
        <template v-else>
          <p class="text-[13.5px] font-medium text-ink-700">Belum ada tugas</p>
          <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Klik "Tugas baru" untuk mulai mencatat kerjaan.</p>
          <button
            type="button"
            class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[12.5px] font-medium transition"
            @click="openCreate"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Tugas baru
          </button>
        </template>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-cream-100 text-ink-500 border-b border-ink-100">
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap w-12 sticky left-0 z-20 bg-cream-100">No</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[220px]">
                <div class="flex items-center gap-3">
                  <span class="w-9 shrink-0"></span>
                  <span>Tugas</span>
                </div>
              </th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[140px]">Untuk siapa</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[140px]">Dikerjakan oleh</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Status Produksi</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[160px]">Tanggal Dibuat</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Tanggal Selesai/Upload</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[160px]">Link DB</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[180px]">Catatan</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[110px]">Tenggat</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[120px]">Status</th>
              <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap w-28">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(t, idx) in filteredTasks"
              :key="t.id"
              class="border-b border-ink-50 hover:bg-ink-500/5 transition group"
            >
              <td class="px-4 py-4 text-ink-400 sticky left-0 z-10 bg-white group-hover:bg-cream-50/60">
                {{ idx + 1 }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-ink-100 bg-cream-100 flex items-center justify-center">
                    <img v-if="t.image" :src="t.image" :alt="t.title" class="w-full h-full object-cover" />
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-ink-800 truncate">{{ t.title }}</p>
                    <p class="text-[12px] text-ink-400 truncate">{{ [t.style, t.substyle].filter(Boolean).join(' · ') || '—' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-ink-600 whitespace-nowrap">{{ t.clientName || '—' }}</td>
              <td class="px-4 py-4 text-ink-600 whitespace-nowrap">
                {{ t.designer || t.username }}
                <span v-if="(t.designer || t.username) === user" class="text-ink-400">(kamu)</span>
                <p v-if="t.designer && t.designer !== t.username" class="text-[11px] text-ink-400">dicatat oleh {{ t.username }}</p>
              </td>
              <td class="px-4 py-4 text-ink-600 whitespace-nowrap">{{ t.productionStatus || '—' }}</td>
              <td class="px-4 py-4 text-ink-500 text-[13px] whitespace-nowrap">{{ t.date ? shortDate(t.date) : '—' }}</td>
              <td class="px-4 py-4 text-ink-500 text-[13px] whitespace-nowrap">{{ t.uploadDate ? shortDate(t.uploadDate) : '—' }}</td>
              <td class="px-4 py-4">
                <div v-if="t.linkDbs?.length" class="flex flex-col gap-1 max-w-[220px]">
                  <a v-for="(l, i) in t.linkDbs" :key="i" :href="l" target="_blank" class="text-brand-600 hover:underline truncate">{{ l }}</a>
                </div>
                <span v-else class="text-ink-300">—</span>
              </td>
              <td class="px-4 py-4 text-ink-500 max-w-[220px]">
                <p class="truncate" :title="t.note || ''">{{ t.note || '—' }}</p>
              </td>
              <td class="px-4 py-4 text-ink-500 text-[13px] whitespace-nowrap">{{ t.dueDate ? shortDate(t.dueDate) : '—' }}</td>
              <td class="px-4 py-4">
                <button type="button" title="Klik buat ganti status" @click="cycleStatus(t)">
                  <StatusBadge :status="t.status" />
                </button>
              </td>
              <td class="px-4 py-4 text-center whitespace-nowrap">
                <button class="text-brand-500 hover:text-brand-600 text-[12.5px] font-medium mr-3" @click="openEdit(t)">
                  Edit
                </button>
                <button class="text-danger-500 hover:text-danger-600 text-[12.5px] font-medium" @click="askRemove(t)">
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showCreate" :title="editingTask ? 'Edit tugas' : 'Tugas baru'" @close="showCreate = false">
      <TaskForm :initial="editingTask" @saved="onSaved" @cancel="showCreate = false" />
    </Modal>

    <!-- ===== Modal konfirmasi hapus (bukan bawaan browser) ===== -->
    <Teleport to="body">
      <div v-if="taskToDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="cancelRemove"></div>

        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-ink-900 mb-1.5">Hapus tugas?</h3>
          <p class="text-[13.5px] text-ink-500 mb-5">
            Tugas "<strong>{{ taskToDelete.title }}</strong>" akan dihapus permanen dan tidak bisa dikembalikan.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-500/5 text-[13.5px] font-medium transition"
              @click="cancelRemove"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="deleting"
              class="px-4 py-2.5 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-[13.5px] font-medium transition disabled:opacity-60"
              @click="confirmRemove"
            >
              {{ deleting ? 'Menghapus…' : 'Ya, hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>