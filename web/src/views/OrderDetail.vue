<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { amount, shortDate } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'
import OrderForm from '../components/OrderForm.vue'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const loading = ref(true)
const errorMsg = ref('')

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

function onSaved(updated) {
  order.value = updated
  showToast('Perubahan berhasil disimpan')
}

// --- Toast notification custom (konsisten dengan halaman Semua Pesanan) ---
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
      ← Kembali ke semua pesanan
    </button>

    <div v-if="loading" class="h-48 rounded-card bg-white shadow-card animate-pulse" />
    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
    </div>

    <template v-else-if="order">
      <div class="bg-white rounded-card shadow-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p class="text-[12px] text-ink-400">Pesanan #{{ String(order.id).padStart(4, '0') }}</p>
          <h1 class="text-[19px] font-semibold text-ink-900">{{ order.buyerName }}</h1>
          <p class="text-[13px] text-ink-500">{{ order.category }} · {{ order.characterType }} · {{ order.style }}</p>
        </div>
        <div class="flex items-center gap-3">
          <StatusBadge :status="order.status" />
          <span class="text-[12px] text-ink-400">dibuat {{ shortDate(order.createdAt) }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Edit detail</h2>
          <OrderForm :initial="order" @saved="onSaved" @cancel="router.push('/orders')" />
        </div>
        <div class="space-y-4">
          <div class="bg-white rounded-card shadow-card p-5">
            <p class="text-[12px] text-ink-400">Ringkasan nilai</p>
            <p class="text-[24px] font-semibold text-ink-900 mt-1">{{ amount(order.price) }}</p>
            <div class="mt-4 space-y-2 text-[13px]">
              <div class="flex justify-between"><span class="text-ink-400">Paket</span><b class="text-ink-800">{{ order.package || 'Satuan' }}</b></div>
              <div class="flex justify-between"><span class="text-ink-400">Designer</span><b class="text-ink-800">{{ order.designerName }}</b></div>
              <div class="flex justify-between"><span class="text-ink-400">Tanggal masuk</span><b class="text-ink-800">{{ shortDate(order.orderDate) }}</b></div>
              <div class="flex justify-between"><span class="text-ink-400">Selesai</span><b class="text-ink-800">{{ shortDate(order.completionDate) }}</b></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast notification custom -->
    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-card-hover text-[13.5px] font-medium text-white"
        :class="toast.type === 'error' ? 'bg-danger-600' : 'bg-brand-600'"
      >
        <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
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