<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { amount, shortDate } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Anggota' }
const LIST_LIMIT = 20

const member = ref(null)
const orders = ref([])
const ordersTotal = ref(0)
const loading = ref(true)
const errorMsg = ref('')

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [m, o] = await Promise.all([
      api.get(`/team/members/${route.params.id}`),
      api.get(`/orders?createdBy=${route.params.id}&page=1&limit=${LIST_LIMIT}`),
    ])
    member.value = m.data
    orders.value = o.data
    ordersTotal.value = o.pagination?.total ?? o.data.length
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

const name = computed(() => member.value?.displayName || member.value?.username || '')
const initials = computed(() => name.value.trim().slice(0, 2).toUpperCase() || 'AK')
const nameOf = (o) => o.title || o.buyerName || 'Order'
</script>

<template>
  <div class="space-y-4">
    <button class="text-[13px] text-ink-500 hover:text-ink-700 flex items-center gap-1.5" @click="router.push('/pengaturan')">
      ← Kembali ke pengaturan
    </button>

    <div v-if="loading" class="h-48 rounded-card bg-white shadow-card animate-pulse" />
    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
    </div>

    <template v-else-if="member">
      <div class="bg-white rounded-card shadow-card p-5 flex items-center gap-4 flex-wrap">
        <div class="w-16 h-16 shrink-0 rounded-full overflow-hidden border border-ink-100 bg-brand-50 text-brand-700 flex items-center justify-center text-lg font-semibold">
          <img v-if="member.photo" :src="member.photo" :alt="name" class="w-full h-full object-cover" />
          <span v-else>{{ initials }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-[19px] font-semibold text-ink-900 break-words">{{ name }}</h1>
          <p class="text-[13px] text-ink-500">@{{ member.username }} · {{ ROLE_LABELS[member.role] || member.role }}</p>
        </div>
        <div class="text-right">
          <p class="text-[12px] text-ink-400">Order dibuat</p>
          <p class="text-[24px] font-semibold text-ink-900 tabular-nums">{{ member.orderCount }}</p>
        </div>
      </div>

      <div class="bg-white rounded-card shadow-card overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h2 class="text-[15px] font-semibold text-ink-900">Order buatan {{ member.username }}</h2>
          <span class="text-[12px] text-ink-400">Bergabung {{ shortDate(member.createdAt) }}</span>
        </div>

        <div v-if="orders.length === 0" class="py-12 text-center text-[13.5px] text-ink-400">
          Belum ada order yang dibuat anggota ini.
        </div>
        <ul v-else class="divide-y divide-ink-100">
          <li
            v-for="o in orders"
            :key="o.id"
            class="flex items-center gap-3 px-5 py-3 hover:bg-ink-500/5 transition cursor-pointer"
            @click="router.push(`/orders/${o.id}`)"
          >
            <div class="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-ink-100 bg-cream-100 flex items-center justify-center">
              <img v-if="o.image" :src="o.image" :alt="nameOf(o)" class="w-full h-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[13.5px] font-medium text-ink-900 truncate">{{ nameOf(o) }}</p>
              <p class="text-[12px] text-ink-400 truncate">{{ shortDate(o.orderDate) }}<template v-if="o.category"> · {{ o.category }}</template></p>
            </div>
            <span class="text-[13px] font-medium text-ink-800 tabular-nums hidden sm:block">{{ amount(o.price) }}</span>
            <StatusBadge :status="o.status" />
          </li>
        </ul>
        <p v-if="ordersTotal > orders.length" class="px-5 py-3 border-t border-ink-100 text-[12px] text-ink-400">
          Menampilkan {{ orders.length }} dari {{ ordersTotal }} order terbaru.
        </p>
      </div>
    </template>
  </div>
</template>
