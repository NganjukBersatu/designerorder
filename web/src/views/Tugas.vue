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
const owner = ref('mine') // 'mine' | 'all'
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

async function remove(task) {
  if (!confirm(`Hapus tugas "${task.title}"?`)) return
  try {
    await api.delete(`/tasks/${task.id}`)
    load()
  } catch (err) {
    alert(err.message)
  }
}

// Cepat ganti status langsung dari list (klik badge)
async function cycleStatus(task) {
  const next = { Pending: 'Progress', Progress: 'Done', Done: 'Pending' }[task.status]
  try {
    await api.patch(`/tasks/${task.id}`, { status: next })
    load()
  } catch (err) {
    alert(err.message)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex flex-col sm:flex-row gap-3 flex-1">
        <select
          v-model="owner"
          class="rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        >
          <option value="mine">Tugas saya</option>
          <option value="all">Semua tim</option>
        </select>
        <select
          v-model="status"
          class="rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        >
          <option value="all">Semua status</option>
          <option value="Pending">Menunggu</option>
          <option value="Progress">Dikerjakan</option>
          <option value="Done">Selesai</option>
        </select>
      </div>
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13.5px] font-medium transition shrink-0"
        @click="openCreate"
      >
        + Tugas baru
      </button>
    </div>

    <!-- Ringkasan status -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Menunggu</p>
        <p class="text-[20px] font-semibold text-ink-900 mt-0.5">{{ counts.Pending }}</p>
      </div>
      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Dikerjakan</p>
        <p class="text-[20px] font-semibold text-ink-900 mt-0.5">{{ counts.Progress }}</p>
      </div>
      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Selesai</p>
        <p class="text-[20px] font-semibold text-ink-900 mt-0.5">{{ counts.Done }}</p>
      </div>
    </div>

    <div class="bg-white rounded-card shadow-card overflow-hidden">
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg bg-ink-100 animate-pulse" />
      </div>
      <div v-else-if="errorMsg" class="p-6 text-center">
        <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
      </div>
      <div v-else-if="tasks.length === 0" class="p-10 text-center text-[13.5px] text-ink-400">
        Belum ada tugas yang cocok. Klik <strong>+ Tugas baru</strong> buat mulai catat kerjaan.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-ink-50 text-[11.5px] uppercase text-ink-400">
            <tr>
              <th class="px-4 py-3 font-medium">Tugas</th>
              <th class="px-4 py-3 font-medium">Dikerjakan oleh</th>
              <th class="px-4 py-3 font-medium">Tenggat</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100 text-[13.5px]">
            <tr v-for="t in tasks" :key="t.id" class="hover:bg-ink-50 transition">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-ink-100 bg-cream-100 flex items-center justify-center">
                    <img v-if="t.image" :src="t.image" :alt="t.title" class="w-full h-full object-cover" />
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-ink-900 truncate">{{ t.title }}</p>
                    <p class="text-[12px] text-ink-400 truncate">{{ [t.clientName, t.style, t.substyle].filter(Boolean).join(' · ') || '—' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-ink-700">
                {{ t.designer || t.username }}
                <span v-if="(t.designer || t.username) === user" class="text-ink-400">(kamu)</span>
                <p v-if="t.designer && t.designer !== t.username" class="text-[11px] text-ink-400">dicatat oleh {{ t.username }}</p>
              </td>
              <td class="px-4 py-3 text-ink-500">{{ t.dueDate ? shortDate(t.dueDate) : '—' }}</td>
              <td class="px-4 py-3">
                <button type="button" title="Klik buat ganti status" @click="cycleStatus(t)">
                  <StatusBadge :status="t.status" />
                </button>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-brand-500 hover:text-brand-600 text-[12.5px] font-medium mr-3" @click="openEdit(t)">
                  Edit
                </button>
                <button class="text-danger-500 hover:text-danger-600 text-[12.5px] font-medium" @click="remove(t)">
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
  </div>
</template>
