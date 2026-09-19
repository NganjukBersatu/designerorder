<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { amount, shortDate, STATUS_LABEL } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'
import Modal from '../components/Modal.vue'
import OrderForm from '../components/OrderForm.vue'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const errorMsg = ref('')
const search = ref('')
const status = ref('all')
const showCreate = ref(false)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (status.value !== 'all') params.set('status', status.value)
    const qs = params.toString()
    const res = await api.get(`/orders${qs ? `?${qs}` : ''}`)
    orders.value = res.data
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
})
watch(status, load)
onMounted(load)

async function remove(order) {
  if (!confirm(`Hapus pesanan untuk ${order.buyerName}?`)) return
  try {
    await api.delete(`/orders/${order.id}`)
    load()
  } catch (err) {
    alert(err.message)
  }
}

function onCreated() {
  showCreate.value = false
  load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex flex-col sm:flex-row gap-3 flex-1">
        <input
          v-model="search"
          type="search"
          placeholder="Cari pembeli, kategori, atau toko..."
          class="w-full sm:w-72 rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        />
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
        @click="showCreate = true"
      >
        + Pesanan baru
      </button>
    </div>

    <div class="bg-white rounded-card shadow-card overflow-hidden">
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg bg-ink-100 animate-pulse" />
      </div>
      <div v-else-if="errorMsg" class="p-6 text-center">
        <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
      </div>
      <div v-else-if="orders.length === 0" class="p-10 text-center text-[13.5px] text-ink-400">
        Belum ada pesanan yang cocok.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-ink-50 text-[11.5px] uppercase text-ink-400">
            <tr>
              <th class="px-4 py-3 font-medium">Pesanan</th>
              <th class="px-4 py-3 font-medium">Pembeli</th>
              <th class="px-4 py-3 font-medium">Tanggal</th>
              <th class="px-4 py-3 font-medium">Harga</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100 text-[13.5px]">
            <tr v-for="o in orders" :key="o.id" class="hover:bg-ink-50 transition">
              <td class="px-4 py-3">
                <p class="font-medium text-ink-900">{{ o.category }}</p>
                <p class="text-[12px] text-ink-400">{{ o.characterType }} · {{ o.style }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="text-ink-800">{{ o.buyerName }}</p>
                <p class="text-[12px] text-ink-400">{{ o.storeName || o.buyerReference || '—' }}</p>
              </td>
              <td class="px-4 py-3 text-ink-500">{{ shortDate(o.orderDate) }}</td>
              <td class="px-4 py-3 font-medium text-ink-900">{{ amount(o.price) }}</td>
              <td class="px-4 py-3"><StatusBadge :status="o.status" /></td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-brand-500 hover:text-brand-600 text-[12.5px] font-medium mr-3" @click="router.push(`/orders/${o.id}`)">
                  Edit
                </button>
                <button class="text-danger-500 hover:text-danger-600 text-[12.5px] font-medium" @click="remove(o)">
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showCreate" title="Catat pesanan baru" @close="showCreate = false">
      <OrderForm @saved="onCreated" @cancel="showCreate = false" />
    </Modal>
  </div>
</template>
