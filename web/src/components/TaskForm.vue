<script setup>
import { reactive, ref, computed } from 'vue'
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
            <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition cursor-pointer">
              {{ form.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
              <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
            </label>
            <button v-if="form.image" type="button" @click="form.image = ''" class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition">
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
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Designer</span>
        <select v-model="form.designer" class="input">
          <option value="">Pilih designer</option>
          <option v-for="d in designerOptions" :key="d" :value="d">{{ d }}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Kategori Tugas (opsional)</span>
        <select v-model="form.style" class="input">
          <option value="">Tanpa kategori</option>
          <option v-for="s in optionsOf('taskCategory')" :key="s" :value="s">{{ s }}</option>
        </select>
        <p v-if="!optionsOf('taskCategory').length" class="text-[12px] text-ink-400 mt-1">
          Belum ada pilihan, tambahkan dulu di Pengaturan &gt; Kategori Tugas.
        </p>
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Substyle Tugas (opsional)</span>
        <select v-model="form.substyle" class="input">
          <option value="">Tanpa substyle</option>
          <option v-for="s in optionsOf('taskSubstyle')" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Status Produksi Tugas (opsional)</span>
        <select v-model="form.productionStatus" class="input">
          <option value="">Belum diisi</option>
          <option v-for="s in optionsOf('taskProductionStatus')" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Status tugas *</span>
        <select v-model="form.status" required class="input">
          <option value="Pending">Menunggu</option>
          <option value="Progress">Dikerjakan</option>
          <option value="Done">Selesai</option>
        </select>
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
            class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition"
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
      <button type="button" class="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 text-[13.5px] font-medium text-ink-700 hover:bg-ink-50 transition" @click="emit('cancel')">
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
