<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../utils/api.js'
import { amount, monthLabel } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'

const loading = ref(true)
const errorMsg = ref('')
const summary = ref(null)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    summary.value = await api.get('/dashboard/summary')
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-card bg-white shadow-card animate-pulse" />
    </div>

    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
    </div>

    <template v-else-if="summary">
      <!-- Kartu statistik -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-card shadow-card p-4">
          <p class="text-[12px] text-ink-400">Total pesanan</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ summary.totalOrders }}</p>
        </div>
        <div class="bg-white rounded-card shadow-card p-4">
          <p class="text-[12px] text-ink-400">Pendapatan total</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ amount(summary.totalRevenue) }}</p>
        </div>
        <div class="bg-white rounded-card shadow-card p-4">
          <p class="text-[12px] text-ink-400">Sedang dikerjakan</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ summary.progressOrders }}</p>
          <p class="text-[11px] text-ink-400 mt-0.5">{{ summary.pendingOrders }} masih menunggu</p>
        </div>
        <div class="bg-white rounded-card shadow-card p-4">
          <p class="text-[12px] text-ink-400">Pendapatan bulan ini</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ amount(summary.monthRevenue) }}</p>
        </div>
      </div>

      <!-- Status pesanan -->
      <div class="bg-white rounded-card shadow-card p-5">
        <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Status pesanan</h2>
        <div class="space-y-3">
          <div v-for="row in [
            { status: 'Pending', count: summary.pendingOrders },
            { status: 'Progress', count: summary.progressOrders },
            { status: 'Done', count: summary.doneOrders },
          ]" :key="row.status" class="flex items-center gap-3">
            <StatusBadge :status="row.status" class="w-24 justify-center" />
            <div class="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
              <div
                class="h-full bg-brand-500 rounded-full"
                :style="{ width: `${summary.totalOrders ? Math.round((row.count / summary.totalOrders) * 100) : 0}%` }"
              />
            </div>
            <span class="text-[12px] text-ink-500 w-16 text-right">{{ row.count }} / {{ summary.totalOrders }}</span>
          </div>
        </div>
      </div>

      <!-- Pendapatan per bulan -->
      <div class="bg-white rounded-card shadow-card p-5">
        <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Pendapatan per bulan</h2>
        <div v-if="summary.monthlyRevenue.length === 0" class="text-[13px] text-ink-400 py-6 text-center">
          Belum ada data pesanan.
        </div>
        <div v-else class="flex items-end gap-2 h-40">
          <div
            v-for="m in summary.monthlyRevenue"
            :key="m.month"
            class="flex-1 flex flex-col items-center justify-end gap-1.5"
          >
            <div
              class="w-full bg-brand-400 rounded-t-md hover:bg-brand-500 transition"
              :style="{
                height: `${Math.max((m.revenue / Math.max(...summary.monthlyRevenue.map((x) => x.revenue), 1)) * 100, m.revenue > 0 ? 4 : 0)}%`,
              }"
              :title="amount(m.revenue)"
            />
            <span class="text-[10px] text-ink-400">{{ monthLabel(m.month) }}</span>
          </div>
        </div>
      </div>

      <!-- Performa kategori -->
      <div v-if="summary.categoryPerformance.length" class="bg-white rounded-card shadow-card p-5">
        <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Performa kategori bulan ini</h2>
        <div class="space-y-3">
          <div v-for="c in summary.categoryPerformance" :key="c.category">
            <div class="flex items-center justify-between text-[13px] mb-1">
              <span class="font-medium text-ink-800">{{ c.category }}</span>
              <span
                :class="c.changePercent > 0 ? 'text-ok-600' : c.changePercent < 0 ? 'text-danger-600' : 'text-ink-400'"
              >
                {{ c.changePercent > 0 ? '↑' : c.changePercent < 0 ? '↓' : '→' }} {{ c.changePercent }}%
              </span>
            </div>
            <div class="flex items-center justify-between text-[12px] text-ink-400">
              <span>{{ c.orders }} order aktif</span>
              <span>{{ amount(c.revenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pesanan terbaru -->
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-[15px] font-semibold text-ink-900">Pesanan terbaru</h2>
          <router-link to="/orders" class="text-[13px] text-brand-500 hover:text-brand-600 font-medium">
            Lihat semua →
          </router-link>
        </div>
        <div v-if="summary.recentOrders.length === 0" class="text-[13px] text-ink-400 py-6 text-center">
          Belum ada pesanan.
        </div>
        <div v-else class="divide-y divide-ink-100">
          <router-link
            v-for="o in summary.recentOrders"
            :key="o.id"
            :to="`/orders/${o.id}`"
            class="flex items-center justify-between gap-3 py-3 hover:bg-ink-50 -mx-2 px-2 rounded-lg transition"
          >
            <div class="min-w-0">
              <p class="text-[13.5px] font-medium text-ink-900 truncate">{{ o.buyerName }}</p>
              <p class="text-[12px] text-ink-400 truncate">{{ o.category }} · {{ o.characterType }}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-[13px] font-medium text-ink-800">{{ amount(o.price) }}</span>
              <StatusBadge :status="o.status" />
            </div>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>
