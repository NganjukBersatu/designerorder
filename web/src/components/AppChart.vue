<script setup>
// Satu-satunya pintu untuk semua grafik di aplikasi: <AppChart type="bar" | "donut" :items="..." />
// Warna, tooltip, mode gelap, dan legenda diatur di sini supaya semua grafik konsisten.
//
// items: [{ label, value, hint? }]  — `hint` = keterangan tambahan di tooltip (opsional)
import { computed } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import { PALETTE, useChartColors } from './chartTheme'

const props = defineProps({
  type: { type: String, default: 'bar', validator: (v) => ['bar', 'donut'].includes(v) },
  items: { type: Array, required: true },
  format: { type: Function, default: (v) => String(v) }, // memformat angka (tooltip, legenda, tengah donat)
  titlePrefix: { type: String, default: '' }, // bar: judul tooltip, mis. "Tanggal"
  centerLabel: { type: String, default: 'Total' }, // donut: teks kecil di tengah
  height: { type: String, default: 'h-60' }, // bar: tinggi grafik (kelas Tailwind)
})

const isDark = useChartColors()
const AXIS = '#869A95'
const colorOf = (i) => PALETTE[i % PALETTE.length]
const total = computed(() => props.items.reduce((s, i) => s + i.value, 0))
const labels = computed(() => props.items.map((i) => i.label))
const values = computed(() => props.items.map((i) => i.value))

const barData = computed(() => ({
  labels: labels.value,
  datasets: [
    { data: values.value, backgroundColor: '#3D8A82', hoverBackgroundColor: '#246560', borderRadius: 4, maxBarThickness: 22 },
  ],
}))
const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (t) => `${props.titlePrefix} ${t[0].label}`.trim(),
        label: (c) => {
          const hint = props.items[c.dataIndex]?.hint
          return `${props.format(c.parsed.y)}${hint ? ` · ${hint}` : ''}`
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: AXIS, maxTicksLimit: 16 } },
    y: {
      beginAtZero: true,
      grid: { color: isDark.value ? 'rgba(255,255,255,0.08)' : '#E4E9E6' },
      border: { display: false },
      ticks: { color: AXIS, maxTicksLimit: 4, precision: 0 },
    },
  },
}))

const donutData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      data: values.value,
      backgroundColor: props.items.map((_, i) => colorOf(i)),
      borderColor: isDark.value ? '#182422' : '#ffffff',
      borderWidth: 2,
    },
  ],
}))
const donutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${props.format(c.parsed)}` } },
  },
}))
</script>

<template>
  <div v-if="type === 'bar'" :class="height">
    <Bar :data="barData" :options="barOptions" />
  </div>

  <div v-else class="flex flex-col sm:flex-row items-center gap-5">
    <div class="relative w-40 h-40 shrink-0">
      <Doughnut :data="donutData" :options="donutOptions" />
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span class="text-[11px] text-ink-400">{{ centerLabel }}</span>
        <span class="text-[15px] font-semibold text-ink-900">{{ format(total) }}</span>
      </div>
    </div>

    <ul class="flex-1 w-full min-w-0 space-y-2">
      <li v-for="(s, i) in items" :key="s.label" class="flex items-center gap-2.5 text-[13px]">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: colorOf(i) }" />
        <span class="flex-1 truncate text-ink-700">{{ s.label }}</span>
        <span class="text-ink-500 tabular-nums">{{ total ? Math.round((s.value / total) * 100) : 0 }}%</span>
        <span class="w-20 text-right font-medium text-ink-800 tabular-nums">{{ format(s.value) }}</span>
      </li>
    </ul>
  </div>
</template>
