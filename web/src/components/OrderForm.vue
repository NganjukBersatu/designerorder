<script setup>
import { reactive, computed, ref } from 'vue'
import { api } from '../utils/api.js'
import { useProducts, normalizeUrl } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'
import { useTeamMembers } from '../composables/useTeamMembers'
import { useAuth } from '../composables/useAuth'
import { uploadImage } from '../utils/imageFile'
import { getLinks, cleanLinks } from '../utils/links'
import OptionSelect from './OptionSelect.vue'
import CustomSelect from './CustomSelect.vue'

// Satu form untuk semua jenis order: pesanan buyer (pembeli, harga, paket) maupun
// kerjaan internal (judul, tenggat, link DB, catatan). Kolomnya saling melengkapi;
// syarat minimalnya cuma judul ATAU nama pembeli/klien.
const props = defineProps({
  initial: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancel'])

const editing = !!props.initial
const saving = ref(false)
const errorMsg = ref('')
const imageError = ref('')

const { products } = useProducts()
const { optionsOf, mergeOptions } = useOptions()
const { members } = useTeamMembers()
const { user } = useAuth()

// Designer: anggota tim + pilihan manual dari Pengaturan. Order baru default ke diri sendiri.
const designerOptions = computed(() => mergeOptions('designer', members.value.map(m => m.username)))

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Menunggu' },
  { value: 'Progress', label: 'Dikerjakan' },
  { value: 'Done', label: 'Selesai' },
]

const form = reactive({
  image: props.initial?.image || '',
  title: props.initial?.title || '',
  orderDate: props.initial?.orderDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  designerName: props.initial?.designerName || (editing ? '' : user.value || ''),
  category: props.initial?.category || '',
  characterType: props.initial?.characterType || '',
  style: props.initial?.style || '',
  package: props.initial?.package || '',
  productId: props.initial?.productId || '',
  buyerName: props.initial?.buyerName || '',
  buyerReference: props.initial?.buyerReference || '',
  storeName: props.initial?.storeName || '',
  productionStatus: props.initial?.productionStatus || '',
  status: props.initial?.status || 'Pending',
  price: props.initial?.price || '',
  dueDate: props.initial?.dueDate?.slice(0, 10) || '',
  completionDate: props.initial?.completionDate?.slice(0, 10) || '',
  linkDbs: getLinks(props.initial).length ? getLinks(props.initial) : [''],
  note: props.initial?.note || '',
})

// Label yang ditampilkan di dropdown custom (Menunggu / Dikerjakan / Selesai),
// tapi form.status tetap menyimpan value asli (Pending / Progress / Done) untuk dikirim ke API.
const statusLabel = computed({
  get() {
    return STATUS_OPTIONS.find(o => o.value === form.status)?.label || ''
  },
  set(label) {
    form.status = STATUS_OPTIONS.find(o => o.label === label)?.value || form.status
  },
})
const statusLabels = STATUS_OPTIONS.map(o => o.label)

// Produk yang lagi dipilih. Kalau ada, Kategori/Jenis Karakter/Style tidak
// perlu ditanya ulang lagi ke user karena datanya sudah ada di produk.
const selectedProduct = computed(() => products.value.find(p => p.id === form.productId) || null)

function onPickProduct() {
  form.package = '' // paket lama (kalau ada) belum tentu tersedia di produk baru
  const product = selectedProduct.value
  if (!product) return
  form.category = product.style || ''
  form.characterType = product.substyle || ''
  form.style = product.style || ''
  if (!form.price) form.price = product.price || form.price
}

// Label yang ditampilkan di dropdown custom "Ambil dari produk". form.productId
// tetap menyimpan id produk asli (dipakai submit() & onPickProduct()).
const PRODUCT_NONE_LABEL = '— Bukan dari katalog —'
function productLabelOf(p) {
  return `${p.name} (${p.style || 'Tanpa kategori'})`
}
const productLabels = computed(() => [PRODUCT_NONE_LABEL, ...products.value.map(productLabelOf)])
const productLabel = computed({
  get() {
    const p = products.value.find(p => p.id === form.productId)
    return p ? productLabelOf(p) : PRODUCT_NONE_LABEL
  },
  set(label) {
    const p = products.value.find(p => productLabelOf(p) === label)
    form.productId = p ? p.id : ''
    onPickProduct()
  },
})

// Label dropdown custom untuk pilihan Paket produk katalog (mis. "Paket A — $12").
// form.package tetap menyimpan nama paket asli untuk dikirim ke API.
function packageLabelOf(pk) {
  return `${pk.name} — $${pk.price}`
}
const packageLabels = computed(() => (selectedProduct.value?.packages || []).map(packageLabelOf))
const packageLabel = computed({
  get() {
    const pk = selectedProduct.value?.packages?.find(pk => pk.name === form.package)
    return pk ? packageLabelOf(pk) : ''
  },
  set(label) {
    const pk = selectedProduct.value?.packages?.find(pk => packageLabelOf(pk) === label)
    form.package = pk ? pk.name : ''
  },
})

async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    form.image = await uploadImage(file, 'order')
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
  errorMsg.value = ''
  if (!form.title.trim() && !form.buyerName.trim()) {
    errorMsg.value = 'Isi judul atau nama pembeli/klien (minimal salah satu)'
    return
  }

  saving.value = true
  const payload = {
    image: form.image || null,
    title: form.title.trim() || null,
    orderDate: form.orderDate || null,
    designerName: form.designerName || null,
    category: form.category || null,
    characterType: form.characterType || null,
    style: form.style || null,
    package: form.package || null,
    productId: form.productId || null,
    buyerName: form.buyerName.trim() || null,
    buyerReference: form.buyerReference || null,
    storeName: form.storeName || null,
    productionStatus: form.productionStatus || null,
    status: form.status,
    price: Number(form.price) || 0,
    dueDate: form.dueDate || null,
    completionDate: form.completionDate || null,
    linkDbs: cleanLinks(form.linkDbs, normalizeUrl),
    note: form.note || null,
  }
  try {
    const res = editing
      ? await api.patch(`/orders/${props.initial.id}`, payload)
      : await api.post('/orders', payload)
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
      <label class="block text-[13px] font-medium text-ink-700 mb-1.5">Gambar (opsional)</label>
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
            <button v-if="form.image" type="button" class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-500/10 text-sm font-medium transition" @click="form.image = ''">
              Hapus
            </button>
          </div>
          <p v-if="imageError" class="text-xs text-danger-600">{{ imageError }}</p>
        </div>
      </div>
    </div>

    <label class="block">
      <span class="text-[13px] font-medium text-ink-700">Judul</span>
      <input v-model="form.title" type="text" placeholder="mis. Avatar VRChat untuk Client X" class="input" />
      <p class="text-[12px] text-ink-400 mt-1">Isi judul atau nama pembeli/klien (minimal salah satu).</p>
    </label>

    <label class="block">
      <span class="text-[13px] font-medium text-ink-700">Ambil dari produk (opsional)</span>
      <div class="mt-1">
        <CustomSelect
          v-model="productLabel"
          :options="productLabels"
          :allow-empty="false"
          placeholder="Pilih produk"
        />
      </div>
      <p class="text-[12px] text-ink-400 mt-1">Pilih produk supaya Kategori &amp; Style otomatis terisi.</p>
    </label>

    <div class="fx-grid [--fx-min:14rem] gap-4">
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tanggal order *</span>
        <input v-model="form.orderDate" type="date" required class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Designer</span>
        <div class="mt-1">
          <CustomSelect v-model="form.designerName" :options="designerOptions" placeholder="Pilih designer" />
        </div>
      </label>

      <!-- Order bukan dari katalog: Kategori/Jenis Karakter/Style/Paket diketik manual -->
      <template v-if="!selectedProduct">
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Kategori</span>
          <input v-model="form.category" type="text" placeholder="contoh: 3D Modeling" class="input" />
        </label>
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Jenis karakter</span>
          <input v-model="form.characterType" type="text" placeholder="contoh: Humanoid" class="input" />
        </label>
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Style</span>
          <input v-model="form.style" type="text" placeholder="contoh: SemiRealist" class="input" />
        </label>
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Paket</span>
          <input v-model="form.package" type="text" placeholder="contoh: Paket A, Custom" class="input" />
        </label>
      </template>

      <!-- Order dari produk katalog: Kategori/Style ikut produk. Paket cuma kalau produknya punya paket. -->
      <label v-if="selectedProduct?.packages?.length" class="block fx-full">
        <span class="text-[13px] font-medium text-ink-700">Paket</span>
        <div class="mt-1">
          <CustomSelect
            v-model="packageLabel"
            :options="packageLabels"
            placeholder="Pilih paket"
          />
        </div>
      </label>
      <p v-else-if="selectedProduct" class="text-[12px] text-ink-400 fx-full">
        Produk ini dijual satuan (tanpa paket).
      </p>
    </div>

    <div class="border-t border-ink-100 pt-4 fx-grid [--fx-min:14rem] gap-4">
      <label class="block fx-full">
        <span class="text-[13px] font-medium text-ink-700">Nama pembeli / klien</span>
        <input v-model="form.buyerName" type="text" placeholder="Nama pembeli, klien, atau 'internal'" class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Referensi buyer</span>
        <input v-model="form.buyerReference" type="text" class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Platform (tempat laku)</span>
        <OptionSelect v-model="form.storeName" :options="optionsOf('platform')" optionKey="platform" placeholder="contoh: Ko-fi, Etsy" />
      </label>
    </div>

    <div class="border-t border-ink-100 pt-4 fx-grid [--fx-min:14rem] gap-4">
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Status *</span>
        <div class="mt-1">
          <CustomSelect
            v-model="statusLabel"
            :options="statusLabels"
            :allow-empty="false"
            placeholder="Pilih status"
          />
        </div>
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Status produksi</span>
        <div class="mt-1">
          <CustomSelect v-model="form.productionStatus" :options="optionsOf('productionStatus')" placeholder="Belum diisi" />
        </div>
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Harga ($)</span>
        <input v-model.number="form.price" type="number" min="0" step="0.01" placeholder="0" class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tenggat</span>
        <input v-model="form.dueDate" type="date" class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tanggal selesai</span>
        <input v-model="form.completionDate" type="date" class="input" />
      </label>
    </div>

    <div class="border-t border-ink-100 pt-4">
      <div class="flex items-center justify-between mb-1.5">
        <label class="block text-[13px] font-medium text-ink-700">Link DB</label>
        <button type="button" class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline" @click="addLinkField">
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
            class="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition"
            title="Hapus link"
            aria-label="Hapus link"
            @click="removeLinkField(i)"
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
        {{ saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan order' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.input {
  @apply mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] text-ink-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition;
}
</style>
