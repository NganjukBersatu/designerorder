<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { amount, shortDate } from '../utils/format.js'
import { useAuth } from '../composables/useAuth'
import StatusBadge from '../components/StatusBadge.vue'
import OrderForm from '../components/OrderForm.vue'

const route = useRoute()
const router = useRouter()
const { user, role } = useAuth()

const order = ref(null)
const loading = ref(true)
const errorMsg = ref('')
const editing = ref(false)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.get(`/orders/${route.params.id}`)
    order.value = res.data
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

// Aturan sama dengan API: pembuat order, atau owner/admin tim.
// Order lama tanpa pembuat cuma bisa diubah owner/admin.
const isManager = computed(() => role.value === 'owner' || role.value === 'admin')
const canEdit = computed(() =>
  !!order.value && (isManager.value || (!!order.value.createdByName && order.value.createdByName === user.value))
)

const displayTitle = computed(() => order.value?.title || order.value?.buyerName || 'Order')

function onSaved(updated) {
  order.value = updated
  editing.value = false
  showToast('Perubahan berhasil disimpan')
}

const fields = computed(() => {
  const o = order.value
  if (!o) return []
  return [
    { label: 'Pembeli / klien', value: o.buyerName },
    { label: 'Referensi buyer', value: o.buyerReference },
    { label: 'Platform', value: o.storeName },
    { label: 'Designer', value: o.designerName },
    { label: 'Kategori', value: o.category },
    { label: 'Jenis karakter', value: o.characterType },
    { label: 'Style', value: o.style },
    { label: 'Paket', value: o.package },
    { label: 'Status produksi', value: o.productionStatus },
    { label: 'Tanggal order', value: o.orderDate ? shortDate(o.orderDate) : '' },
    { label: 'Tenggat', value: o.dueDate ? shortDate(o.dueDate) : '' },
    { label: 'Tanggal selesai', value: o.completionDate ? shortDate(o.completionDate) : '' },
    { label: 'Dibuat oleh', value: o.createdByName },
  ]
})

// --- Toast notification (konsisten dengan halaman List Order) ---
const toast = ref(null) // { message, type }
let toastTimer
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}
</script>

<template>
  <div class="space-y-4">
    <button class="text-[13px] text-ink-500 hover:text-ink-700 flex items-center gap-1.5" @click="router.push('/orders')">
      ← Kembali ke list order
    </button>

    <div v-if="loading" class="h-48 rounded-card bg-white shadow-card animate-pulse" />
    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
    </div>

    <template v-else-if="order">
      <div class="bg-white rounded-card shadow-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div class="min-w-0">
          <p class="text-[12px] text-ink-400">Order #{{ order.id.slice(0, 8) }}</p>
          <h1 class="text-[19px] font-semibold text-ink-900 break-words">{{ displayTitle }}</h1>
          <p class="text-[13px] text-ink-500">
            {{ [order.category, order.characterType, order.style].filter(Boolean).join(' · ') || '—' }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <StatusBadge :status="order.status" />
          <span class="text-[12px] text-ink-400">dibuat {{ shortDate(order.createdAt) }}</span>
        </div>
      </div>

      <div class="fx-grid [--fx-min:20rem] gap-4 items-start">
        <div class="fx-2 bg-white rounded-card shadow-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15px] font-semibold text-ink-900">{{ editing ? 'Edit detail' : 'Detail order' }}</h2>
            <button
              v-if="canEdit && !editing"
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-brand-500 text-white text-[13px] hover:bg-brand-600 transition"
              @click="editing = true"
            >
              Edit
            </button>
          </div>

          <OrderForm v-if="editing" :initial="order" @saved="onSaved" @cancel="editing = false" />

          <template v-else>
            <dl class="fx-grid [--fx-min:16rem] gap-x-6 gap-y-3 text-[13px]">
              <div v-for="f in fields" :key="f.label" class="flex justify-between gap-3 border-b border-ink-50 pb-2">
                <dt class="text-ink-400">{{ f.label }}</dt>
                <dd class="font-medium text-ink-800 text-right break-words">{{ f.value || '—' }}</dd>
              </div>
            </dl>

            <div class="mt-5">
              <p class="text-[12px] text-ink-400 mb-1.5">Link DB</p>
              <div v-if="order.linkDbs?.length" class="flex flex-col gap-1">
                <a v-for="(l, i) in order.linkDbs" :key="i" :href="l" target="_blank" rel="noopener noreferrer" class="text-[13px] text-brand-600 hover:underline break-all">{{ l }}</a>
              </div>
              <p v-else class="text-[13px] text-ink-300">—</p>
            </div>

            <div class="mt-5">
              <p class="text-[12px] text-ink-400 mb-1.5">Catatan</p>
              <p class="text-[13.5px] text-ink-700 whitespace-pre-line break-words">{{ order.note || '—' }}</p>
            </div>

            <p v-if="!canEdit" class="mt-5 text-[12px] text-ink-400">
              Hanya pembuat order atau owner/admin tim yang bisa mengubah order ini.
            </p>
          </template>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded-card shadow-card p-5">
            <p class="text-[12px] text-ink-400">Ringkasan nilai</p>
            <p class="text-[24px] font-semibold text-ink-900 mt-1">{{ amount(order.price) }}</p>
            <div class="mt-4 space-y-2 text-[13px]">
              <div class="flex justify-between"><span class="text-ink-400">Paket</span><b class="text-ink-800">{{ order.package || 'Satuan' }}</b></div>
              <div class="flex justify-between"><span class="text-ink-400">Designer</span><b class="text-ink-800">{{ order.designerName || '—' }}</b></div>
              <div class="flex justify-between"><span class="text-ink-400">Tanggal order</span><b class="text-ink-800">{{ shortDate(order.orderDate) }}</b></div>
              <div class="flex justify-between"><span class="text-ink-400">Selesai</span><b class="text-ink-800">{{ shortDate(order.completionDate) }}</b></div>
            </div>
            <router-link
              v-if="order.productId"
              :to="`/produk/${order.productId}`"
              class="mt-4 inline-block text-[13px] text-brand-600 hover:underline"
            >
              Lihat produk terkait →
            </router-link>
          </div>

          <div class="bg-white rounded-card shadow-card p-5">
            <p class="text-[12px] text-ink-400 mb-3">Gambar</p>
            <img v-if="order.image" :src="order.image" :alt="displayTitle" class="w-full rounded-xl border border-ink-100 object-cover" />
            <div v-else class="w-full aspect-square rounded-xl border border-dashed border-ink-200 bg-cream-100 flex items-center justify-center text-[12px] text-ink-300">
              Belum ada gambar
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast notification -->
    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-card-hover text-[13.5px] font-medium text-white"
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
