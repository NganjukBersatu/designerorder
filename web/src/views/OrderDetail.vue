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
  </div>
</template>
