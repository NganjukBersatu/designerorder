<script setup>
import { ref, computed, watch } from 'vue'
import { formatPrice, normalizeUrl } from '../composables/useProducts'
import { uploadImage } from '../utils/imageFile'
import { cleanLinks } from '../utils/links'
import PlatformPicker from './PlatformPicker.vue'
import PriceInput from './PriceInput.vue'

// Form Bundling untuk membuat (mode "create": pilih isi dari produk satuan satu kategori)
// dan mengubah (mode "edit": isi diatur dari halaman detail, bukan di sini).
const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  category: { type: String, required: true }, // kategori bundling (tidak bisa diubah)
  bundle: { type: Object, default: null }, // untuk mode edit
  candidates: { type: Array, default: () => [] }, // produk satuan di kategori ini (mode create)
  substyleOptions: { type: Array, default: () => [] },
  platformOptions: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['close', 'save'])

const input = 'w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition'
const label = 'block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5'

const form = ref(blank())
const picked = ref([])
const pickSearch = ref('')
const imageError = ref('')
const localError = ref('')

function blank() {
  return { image: '', name: '', substyle: '', platform: '', linkDbs: [''], price: '', note: '' }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    imageError.value = ''
    localError.value = ''
    picked.value = []
    pickSearch.value = ''
    const b = props.bundle
    form.value =
      props.mode === 'edit' && b
        ? {
            image: b.image || '',
            name: b.name || '',
            substyle: b.substyle || '',
            platform: b.platform || '',
            linkDbs: b.linkDbs?.length ? [...b.linkDbs] : [''],
            price: b.price ?? 0,
            note: b.note || '',
          }
        : blank()
  },
  { immediate: true }
)

const visibleCandidates = computed(() => {
  const q = pickSearch.value.toLowerCase().trim()
  return q ? props.candidates.filter((p) => (p.name || '').toLowerCase().includes(q)) : props.candidates
})
const pickedItems = computed(() => props.candidates.filter((p) => picked.value.includes(p.id)))
const pickedTotal = computed(() => pickedItems.value.reduce((sum, p) => sum + (Number(p.price) || 0), 0))
// Mata uang bundling mengikuti isinya, jadi semua produk yang dipilih harus sama mata uangnya
const pickedCurrencies = computed(() => [...new Set(pickedItems.value.map((p) => p.currency || 'USD'))])
const mixedCurrency = computed(() => pickedCurrencies.value.length > 1)
const bundleCurrency = computed(() =>
  props.mode === 'edit' ? props.bundle?.currency || 'USD' : pickedCurrencies.value[0] || 'USD'
)

async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    form.value.image = await uploadImage(file, 'product')
    imageError.value = ''
  } catch (err) {
    imageError.value = err.message
  }
}

function submit() {
  localError.value = ''
  const f = form.value
  if (!f.name.trim()) return (localError.value = 'Nama bundling wajib diisi')
  if (props.mode === 'create' && picked.value.length < 2) {
    return (localError.value = 'Pilih minimal 2 produk untuk dijadikan bundling')
  }
  if (props.mode === 'create' && mixedCurrency.value) {
    return (localError.value = `Produk yang dipilih memakai mata uang berbeda (${pickedCurrencies.value.join(', ')}). Pilih yang mata uangnya sama.`)
  }
  const payload = {
    image: f.image,
    name: f.name.trim(),
    substyle: f.substyle.trim(),
    platform: f.platform.trim(),
    linkDbs: cleanLinks(f.linkDbs, normalizeUrl),
    note: f.note.trim(),
  }
  const hasPrice = f.price !== '' && f.price !== null && f.price !== undefined
  if (hasPrice) payload.price = Number(f.price) || 0
  else if (props.mode === 'edit') payload.price = 0
  if (props.mode === 'create') {
    payload.style = props.category
    payload.currency = bundleCurrency.value
    payload.productIds = [...picked.value]
  }
  emit('save', payload)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="emit('close')"></div>
      <div class="relative bg-white dark:bg-cream-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-800">
          <h2 class="text-lg font-semibold text-ink-900 dark:text-ink-50">
            {{ mode === 'edit' ? 'Edit Bundling' : `Buat Bundling ${category}` }}
          </h2>
          <button class="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500 transition" aria-label="Tutup" @click="emit('close')">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="px-6 py-5 fx-grid [--fx-min:14rem] gap-4">
          <!-- Gambar -->
          <div class="fx-full">
            <label :class="label">Gambar Bundling</label>
            <div class="flex items-center gap-4">
              <div class="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 flex items-center justify-center">
                <img v-if="form.image" :src="form.image" alt="Pratinjau gambar" class="w-full h-full object-cover" />
                <span v-else class="text-[11px] text-ink-300">Belum ada</span>
              </div>
              <div class="flex flex-col items-start gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 text-sm font-medium transition cursor-pointer">
                    {{ form.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
                    <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
                  </label>
                  <button v-if="form.image" type="button" class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition" @click="form.image = ''">
                    Hapus Gambar
                  </button>
                </div>
                <p v-if="imageError" class="text-xs text-danger-600">{{ imageError }}</p>
                <p v-else class="text-xs text-ink-400">JPG, PNG, atau WEBP. Ukuran otomatis diperkecil.</p>
              </div>
            </div>
          </div>

          <div class="fx-full">
            <label :class="label">Nama Bundling</label>
            <input v-model="form.name" type="text" :class="input" placeholder="Nama bundling" />
          </div>

          <div>
            <label :class="label">Style</label>
            <input :value="category" type="text" disabled class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 text-ink-500 text-sm cursor-not-allowed" />
            <p class="text-xs text-ink-400 mt-1">Bundling selalu satu kategori dengan isinya.</p>
          </div>

          <div>
            <label :class="label">Substyle</label>
            <select v-model="form.substyle" :class="input">
              <option value="">Pilih substyle</option>
              <option v-for="sub in substyleOptions" :key="sub" :value="sub">{{ sub }}</option>
            </select>
          </div>

          <!-- Isi bundling (hanya saat membuat) -->
          <div v-if="mode === 'create'" class="fx-full">
            <div class="flex items-center justify-between mb-1.5 gap-3">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200">
                Isi Bundling <span class="text-ink-400 font-normal">({{ picked.length }} dipilih, minimal 2)</span>
              </label>
              <input v-model="pickSearch" type="text" placeholder="Cari produk..." class="w-40 px-3 py-1.5 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-sm outline-none focus:border-brand-400" />
            </div>
            <div class="max-h-56 overflow-y-auto rounded-xl border border-ink-200 dark:border-ink-800 divide-y divide-ink-100 dark:divide-ink-800">
              <label v-for="p in visibleCandidates" :key="p.id" class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-cream-50 dark:hover:bg-cream-800">
                <input v-model="picked" type="checkbox" :value="p.id" class="w-4 h-4 accent-brand-500" />
                <div class="w-9 h-9 shrink-0 rounded-md overflow-hidden border border-ink-100 bg-cream-100">
                  <img v-if="p.image" :src="p.image" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
                </div>
                <span class="flex-1 min-w-0 truncate text-sm text-ink-800 dark:text-ink-100">{{ p.name }}</span>
                <span class="text-[13px] text-ink-500 tabular-nums">{{ formatPrice(p.price, p.currency) }}</span>
              </label>
              <p v-if="!visibleCandidates.length" class="px-3 py-6 text-center text-sm text-ink-400">
                {{ candidates.length ? 'Tidak ada produk yang cocok.' : `Belum ada produk satuan di kategori ${category}.` }}
              </p>
            </div>
          </div>

          <div class="fx-full">
            <label :class="label">Platform</label>
            <PlatformPicker v-model="form.platform" :options="platformOptions" />
          </div>

          <div class="fx-full">
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200">Link DB</label>
              <button type="button" class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline" @click="form.linkDbs.push('')">+ Tambah Link</button>
            </div>
            <div class="space-y-2">
              <div v-for="(link, i) in form.linkDbs" :key="i" class="flex items-center gap-2">
                <input v-model="form.linkDbs[i]" type="text" :class="input" :placeholder="`https://www.dropbox.com/... (link ${i + 1})`" />
                <button v-if="form.linkDbs.length > 1" type="button" class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition" title="Hapus link" aria-label="Hapus link" @click="form.linkDbs.splice(i, 1)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="fx-full">
            <label :class="label">Harga Bundling</label>
            <PriceInput
              v-model="form.price"
              :currency="bundleCurrency"
              lock-currency
              :placeholder="mode === 'create' ? `Kosongkan = otomatis ${formatPrice(pickedTotal, bundleCurrency)}` : '0.00'"
            />
            <p v-if="mode === 'create'" class="text-xs text-ink-400 mt-1">
              Mata uang mengikuti produk yang dipilih. Jumlah harga isi: {{ formatPrice(pickedTotal, bundleCurrency) }}. Kosongkan untuk memakai jumlah itu, atau isi harga bundling sendiri.
            </p>
            <p v-if="mixedCurrency" class="text-xs text-danger-600 mt-1">Produk yang dipilih memakai mata uang berbeda: {{ pickedCurrencies.join(', ') }}.</p>
          </div>

          <div class="fx-full">
            <label :class="label">Catatan</label>
            <textarea v-model="form.note" rows="2" :class="[input, 'resize-none']" placeholder="Catatan tambahan..."></textarea>
          </div>

          <p v-if="localError || error" class="fx-full text-sm text-danger-600">{{ localError || error }}</p>
        </div>

        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 dark:border-ink-800 bg-cream-50 dark:bg-cream-800 rounded-b-2xl">
          <button class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-200 hover:bg-white text-sm font-medium transition" @click="emit('close')">Batal</button>
          <button :disabled="saving" class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm disabled:opacity-60" @click="submit">
            {{ saving ? 'Menyimpan…' : mode === 'edit' ? 'Simpan Perubahan' : 'Buat Bundling' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
