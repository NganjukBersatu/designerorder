<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../utils/api.js'
import { useOptions } from '../composables/useOptions'
import { fileToCompressedDataUrl } from '../utils/imageFile'
import { getLinks, cleanLinks } from '../utils/links'
import { normalizeUrl, nowLocal } from '../composables/useProducts'
import { useTeamMembers } from '../composables/useTeamMembers'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  initial: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancel'])

const editing = !!props.initial
const saving = ref(false)
const errorMsg = ref('')
const imageError = ref('')

const { optionsOf, mergeOptions } = useOptions()
const { members } = useTeamMembers()
const { user } = useAuth()

// Designer diambil dari anggota tim + pilihan manual, sama pola kayak form produk.
// Default ke diri sendiri (self-assign) tapi bisa diganti.
const designerOptions = computed(() => mergeOptions('taskDesigner', members.value.map(m => m.username)))

const form = reactive({
  image: props.initial?.image || '',
  title: props.initial?.title || '',
  clientName: props.initial?.clientName || '',
  designer: props.initial?.designer || (editing ? '' : user.value),
  style: props.initial?.style || '',
  substyle: props.initial?.substyle || '',
  date: props.initial?.date || nowLocal(),
  uploadDate: props.initial?.uploadDate || '',
  productionStatus: props.initial?.productionStatus || '',
  linkDbs: getLinks(props.initial).length ? getLinks(props.initial) : [''],
  status: props.initial?.status || 'Pending',
  dueDate: props.initial?.dueDate?.slice(0, 10) || '',
  note: props.initial?.note || '',
})

// ===== Dropdown kustom (gaya sama dengan filter status di halaman Semua Pesanan) =====
const taskStatusOptions = [
  { value: 'Pending', label: 'Menunggu' },
  { value: 'Progress', label: 'Dikerjakan' },
  { value: 'Done', label: 'Selesai' },
]

const openField = ref(null) // 'designer' | 'style' | 'substyle' | 'productionStatus' | 'status' | null
const dropdownEls = {}
function setDropdownRef(key) {
  return (el) => { dropdownEls[key] = el }
}
function toggleDropdown(key) {
  openField.value = openField.value === key ? null : key
}
function onDocClick(e) {
  const current = openField.value
  if (!current) return
  const el = dropdownEls[current]
  if (el && !el.contains(e.target)) openField.value = null
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

const statusLabel = computed(() => taskStatusOptions.find((o) => o.value === form.status)?.label || 'Pilih status')

async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    form.image = await fileToCompressedDataUrl(file)
    imageError.value = ''
  } catch (err) {
    imageError.value = err.message
  }
}

function addLinkField() {
  form.linkDbs.push('')
}

function removeLinkField(index) {
  form.linkDbs.splice(index, 1)
  if (form.linkDbs.length === 0) form.linkDbs.push('')
}

async function submit() {
  saving.value = true
  errorMsg.value = ''

  const cleaned = cleanLinks(form.linkDbs, normalizeUrl)

  const payload = {
    image: form.image || null,
    title: form.title,
    clientName: form.clientName || null,
    designer: form.designer || null,
    style: form.style || null,
    substyle: form.substyle || null,
    date: form.date || null,
    uploadDate: form.uploadDate || null,
    productionStatus: form.productionStatus || null,
    linkDbs: cleaned,
    status: form.status,
    dueDate: form.dueDate || null,
    note: form.note || null,
  }
  try {
    const res = editing
      ? await api.patch(`/tasks/${props.initial.id}`, payload)
      : await api.post('/tasks', payload)
    emit('saved', res.data)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <!-- Gambar -->
    <div>
      <label class="block text-sm font-medium text-ink-700 mb-1.5">Gambar (opsional)</label>
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-ink-200 bg-cream-100 flex items-center justify-center">
          <img v-if="form.image" :src="form.image" alt="Pratinjau gambar" class="w-full h-full object-cover" />
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="flex flex-col items-start gap-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-500/5 text-sm font-medium transition cursor-pointer">
              {{ form.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
              <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
            </label>
            <button v-if="form.image" type="button" @click="form.image = ''" class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-500/10 text-sm font-medium transition">
              Hapus
            </button>
          </div>
          <p v-if="imageError" class="text-xs text-danger-600">{{ imageError }}</p>
        </div>
      </div>
    </div>

    <label class="block">
      <span class="text-[13px] font-medium text-ink-700">Judul tugas *</span>
      <input v-model="form.title" type="text" required placeholder="mis. Buat avatar VRChat untuk Client X" class="input" />
    </label>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Untuk siapa (opsional)</span>
        <input v-model="form.clientName" type="text" placeholder="Nama client / internal" class="input" />
      </label>

      <!-- Designer -->
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Designer</span>
        <div :ref="setDropdownRef('designer')" class="relative mt-1">
          <button
            type="button"
            class="w-full flex items-center justify-between rounded-lg border border-ink-200 pl-3 pr-2.5 py-2 text-[13.5px] bg-white hover:border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer transition"
            @click="toggleDropdown('designer')"
          >
            <span :class="form.designer ? 'text-ink-900' : 'text-ink-400'">{{ form.designer || 'Pilih designer' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 transition-transform shrink-0" :class="{ 'rotate-180': openField === 'designer' }">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openField === 'designer'" class="absolute z-20 mt-1.5 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1 max-h-56 overflow-y-auto">
            <button type="button" class="w-full text-left px-3 py-2 text-[13.5px] transition" :class="!form.designer ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'" @click="form.designer = ''; openField = null">
              Pilih designer
            </button>
            <button
              v-for="d in designerOptions"
              :key="d"
              type="button"
              class="w-full text-left px-3 py-2 text-[13.5px] transition"
              :class="d === form.designer ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'"
              @click="form.designer = d; openField = null"
            >
              {{ d }}
            </button>
          </div>
        </div>
      </label>

      <!-- Kategori Tugas -->
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Kategori Tugas (opsional)</span>
        <div :ref="setDropdownRef('style')" class="relative mt-1">
          <button
            type="button"
            class="w-full flex items-center justify-between rounded-lg border border-ink-200 pl-3 pr-2.5 py-2 text-[13.5px] bg-white hover:border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer transition"
            @click="toggleDropdown('style')"
          >
            <span :class="form.style ? 'text-ink-900' : 'text-ink-400'">{{ form.style || 'Tanpa kategori' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 transition-transform shrink-0" :class="{ 'rotate-180': openField === 'style' }">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openField === 'style'" class="absolute z-20 mt-1.5 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1 max-h-56 overflow-y-auto">
            <button type="button" class="w-full text-left px-3 py-2 text-[13.5px] transition" :class="!form.style ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'" @click="form.style = ''; openField = null">
              Tanpa kategori
            </button>
            <button
              v-for="s in optionsOf('taskCategory')"
              :key="s"
              type="button"
              class="w-full text-left px-3 py-2 text-[13.5px] transition"
              :class="s === form.style ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'"
              @click="form.style = s; openField = null"
            >
              {{ s }}
            </button>
          </div>
        </div>
        <p v-if="!optionsOf('taskCategory').length" class="text-[12px] text-ink-400 mt-1">
          Belum ada pilihan, tambahkan dulu di Pengaturan &gt; Kategori Tugas.
        </p>
      </label>

      <!-- Substyle Tugas -->
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Substyle Tugas (opsional)</span>
        <div :ref="setDropdownRef('substyle')" class="relative mt-1">
          <button
            type="button"
            class="w-full flex items-center justify-between rounded-lg border border-ink-200 pl-3 pr-2.5 py-2 text-[13.5px] bg-white hover:border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer transition"
            @click="toggleDropdown('substyle')"
          >
            <span :class="form.substyle ? 'text-ink-900' : 'text-ink-400'">{{ form.substyle || 'Tanpa substyle' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 transition-transform shrink-0" :class="{ 'rotate-180': openField === 'substyle' }">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openField === 'substyle'" class="absolute z-20 mt-1.5 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1 max-h-56 overflow-y-auto">
            <button type="button" class="w-full text-left px-3 py-2 text-[13.5px] transition" :class="!form.substyle ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'" @click="form.substyle = ''; openField = null">
              Tanpa substyle
            </button>
            <button
              v-for="s in optionsOf('taskSubstyle')"
              :key="s"
              type="button"
              class="w-full text-left px-3 py-2 text-[13.5px] transition"
              :class="s === form.substyle ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'"
              @click="form.substyle = s; openField = null"
            >
              {{ s }}
            </button>
          </div>
        </div>
      </label>

      <!-- Status Produksi Tugas -->
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Status Produksi Tugas (opsional)</span>
        <div :ref="setDropdownRef('productionStatus')" class="relative mt-1">
          <button
            type="button"
            class="w-full flex items-center justify-between rounded-lg border border-ink-200 pl-3 pr-2.5 py-2 text-[13.5px] bg-white hover:border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer transition"
            @click="toggleDropdown('productionStatus')"
          >
            <span :class="form.productionStatus ? 'text-ink-900' : 'text-ink-400'">{{ form.productionStatus || 'Belum diisi' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 transition-transform shrink-0" :class="{ 'rotate-180': openField === 'productionStatus' }">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openField === 'productionStatus'" class="absolute z-20 mt-1.5 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1 max-h-56 overflow-y-auto">
            <button type="button" class="w-full text-left px-3 py-2 text-[13.5px] transition" :class="!form.productionStatus ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'" @click="form.productionStatus = ''; openField = null">
              Belum diisi
            </button>
            <button
              v-for="s in optionsOf('taskProductionStatus')"
              :key="s"
              type="button"
              class="w-full text-left px-3 py-2 text-[13.5px] transition"
              :class="s === form.productionStatus ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'"
              @click="form.productionStatus = s; openField = null"
            >
              {{ s }}
            </button>
          </div>
        </div>
      </label>

      <!-- Status tugas -->
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Status tugas *</span>
        <div :ref="setDropdownRef('status')" class="relative mt-1">
          <button
            type="button"
            class="w-full flex items-center justify-between rounded-lg border border-ink-200 pl-3 pr-2.5 py-2 text-[13.5px] text-ink-900 bg-white hover:border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer transition"
            @click="toggleDropdown('status')"
          >
            <span>{{ statusLabel }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 transition-transform shrink-0" :class="{ 'rotate-180': openField === 'status' }">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openField === 'status'" class="absolute z-20 mt-1.5 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1">
            <button
              v-for="opt in taskStatusOptions"
              :key="opt.value"
              type="button"
              class="w-full text-left px-3 py-2 text-[13.5px] transition"
              :class="opt.value === form.status ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-500/5'"
              @click="form.status = opt.value; openField = null"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </label>

      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tenggat (opsional)</span>
        <input v-model="form.dueDate" type="date" class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tanggal dibuat</span>
        <input v-model="form.date" type="datetime-local" class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tanggal selesai/upload hasil (opsional)</span>
        <input v-model="form.uploadDate" type="datetime-local" class="input" />
      </label>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="block text-sm font-medium text-ink-700">Link DB</label>
        <button type="button" @click="addLinkField" class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Link
        </button>
      </div>
      <div class="space-y-2">
        <div v-for="(link, i) in form.linkDbs" :key="i" class="flex items-center gap-2">
          <input
            v-model="form.linkDbs[i]"
            type="text"
            class="input mt-0"
            :placeholder="`https://www.dropbox.com/... (link ${i + 1})`"
          />
          <button
            v-if="form.linkDbs.length > 1"
            type="button"
            @click="removeLinkField(i)"
            class="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition"
            title="Hapus link"
            aria-label="Hapus link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <label class="block">
      <span class="text-[13px] font-medium text-ink-700">Catatan</span>
      <textarea v-model="form.note" rows="3" class="input resize-none" placeholder="Detail kerjaan, progress, dll..."></textarea>
    </label>

    <p v-if="errorMsg" class="text-[13px] text-danger-600">{{ errorMsg }}</p>

    <div class="flex gap-3 pt-2">
      <button type="button" class="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 text-[13.5px] font-medium text-ink-700 hover:bg-ink-500/5 transition" @click="emit('cancel')">
        Batal
      </button>
      <button type="submit" :disabled="saving" class="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13.5px] font-medium transition disabled:opacity-60">
        {{ saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan tugas' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.input {
  @apply mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] text-ink-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition;
}
</style>