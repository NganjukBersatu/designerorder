<script setup>
import { reactive, computed, ref } from 'vue'
import { api } from '../utils/api.js'
import { useProducts } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'
import OptionSelect from './OptionSelect.vue'
import CustomSelect from './CustomSelect.vue'

const props = defineProps({
  initial: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancel'])

const editing = !!props.initial
const saving = ref(false)
const errorMsg = ref('')

const { products } = useProducts()
const { optionsOf } = useOptions()

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Menunggu' },
  { value: 'Progress', label: 'Dikerjakan' },
  { value: 'Done', label: 'Selesai' },
]

const form = reactive({
  orderDate: props.initial?.orderDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  designerName: props.initial?.designerName || '',
  category: props.initial?.category || '',
  characterType: props.initial?.characterType || '',
  style: props.initial?.style || '',
  package: props.initial?.package || '',
  productId: props.initial?.productId || '',
  buyerName: props.initial?.buyerName || '',
  buyerReference: props.initial?.buyerReference || '',
  storeName: props.initial?.storeName || '',
  status: props.initial?.status || 'Pending',
  completionDate: props.initial?.completionDate?.slice(0, 10) || '',
  price: props.initial?.price || '',
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
const selectedProduct = computed(() => products.value.find(p => p.id === Number(form.productId)) || null)

function onPickProduct() {
  form.package = '' // paket lama (kalau ada) belum tentu tersedia di produk baru
  const product = selectedProduct.value
  if (!product) return
  form.category = product.style || ''
  form.characterType = product.substyle || '-'
  form.style = product.style || ''
  if (!form.price) form.price = product.price || form.price
}

// Label yang ditampilkan di dropdown custom "Ambil dari produk", supaya
// tampilannya bukan <select> bawaan browser lagi. form.productId tetap
// menyimpan id produk asli (dipakai submit() & onPickProduct()).
const PRODUCT_NONE_LABEL = '— Pesanan custom, tidak dari katalog —'
function productLabelOf(p) {
  return `${p.name} (${p.style || 'Tanpa kategori'})`
}
const productLabels = computed(() => [PRODUCT_NONE_LABEL, ...products.value.map(productLabelOf)])
const productLabel = computed({
  get() {
    const p = products.value.find(p => p.id === Number(form.productId))
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

async function submit() {
  saving.value = true
  errorMsg.value = ''
  const payload = {
    ...form,
    productId: form.productId ? Number(form.productId) : null,
    price: Number(form.price),
    buyerReference: form.buyerReference || null,
    storeName: form.storeName || null,
    completionDate: form.completionDate || null,
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

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tanggal order *</span>
        <input v-model="form.orderDate" type="date" required class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Nama designer *</span>
        <input v-model="form.designerName" type="text" required class="input" />
      </label>

      <!-- Order custom (bukan dari katalog): Kategori/Jenis Karakter/Style diketik manual -->
      <template v-if="!selectedProduct">
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Kategori *</span>
          <input v-model="form.category" type="text" required placeholder="contoh: 3D Modeling" class="input" />
        </label>
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Jenis karakter *</span>
          <input v-model="form.characterType" type="text" required placeholder="contoh: Humanoid" class="input" />
        </label>
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Style *</span>
          <input v-model="form.style" type="text" required placeholder="contoh: SemiRealist" class="input" />
        </label>
        <label class="block">
          <span class="text-[13px] font-medium text-ink-700">Paket *</span>
          <input v-model="form.package" type="text" required placeholder="contoh: Paket A, Custom" class="input" />
        </label>
      </template>

      <!-- Order dari produk katalog: Kategori/Style ikut produk -->
      <!-- Paket cuma wajib kalau produknya memang punya paket. Produk yang dijual satuan (tanpa paket) lewati field ini. -->
      <label v-if="selectedProduct?.packages?.length" class="block sm:col-span-2">
        <span class="text-[13px] font-medium text-ink-700">Paket *</span>
        <div class="mt-1">
          <CustomSelect
            v-model="packageLabel"
            :options="packageLabels"
            placeholder="Pilih paket"
          />
        </div>
      </label>
      <p v-else-if="selectedProduct" class="text-[12px] text-ink-400 sm:col-span-2">
        Produk ini dijual satuan (tanpa paket).
      </p>
    </div>

    <div class="border-t border-ink-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="block sm:col-span-2">
        <span class="text-[13px] font-medium text-ink-700">Nama pembeli *</span>
        <input v-model="form.buyerName" type="text" required class="input" />
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

    <div class="border-t border-ink-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <span class="text-[13px] font-medium text-ink-700">Harga ($) *</span>
        <input v-model.number="form.price" type="number" min="0" step="0.01" required class="input" />
      </label>
      <label class="block">
        <span class="text-[13px] font-medium text-ink-700">Tanggal selesai</span>
        <input v-model="form.completionDate" type="date" class="input" />
      </label>
    </div>

    <p v-if="errorMsg" class="text-[13px] text-danger-600">{{ errorMsg }}</p>

    <div class="flex gap-3 pt-2">
      <button type="button" class="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 text-[13.5px] font-medium text-ink-700 hover:bg-ink-50 transition" @click="emit('cancel')">
        Batal
      </button>
      <button type="submit" :disabled="saving" class="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13.5px] font-medium transition disabled:opacity-60">
        {{ saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan pesanan' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.input {
  @apply mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] text-ink-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition;
}
</style>