<script setup>
// Footer daftar: info jumlah data + navigasi halaman. Tampilannya sama dengan List Order,
// dan dipakai di semua halaman daftar yang dimuat per halaman dari server.
defineProps({
  pagination: { type: Object, default: null }, // { page, limit, total, totalPages }
  label: { type: String, default: 'data' }, // satuan, mis. "order", "transaksi"
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['page'])
</script>

<template>
  <div
    v-if="pagination"
    class="print-hidden shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-ink-100 text-[12.5px] text-ink-400"
  >
    <p>
      <template v-if="pagination.total > 0">
        Menampilkan
        <span class="font-medium text-ink-600">
          {{ (pagination.page - 1) * pagination.limit + 1 }}–{{ Math.min(pagination.page * pagination.limit, pagination.total) }}
        </span>
        dari
        <span class="font-medium text-ink-600">{{ pagination.total }}</span>
        {{ label }}
      </template>
      <template v-else>Tidak ada {{ label }}</template>
    </p>

    <div v-if="pagination.totalPages > 1" class="flex items-center gap-1">
      <button
        type="button"
        class="px-2.5 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-500/5 transition"
        :disabled="loading || pagination.page <= 1"
        @click="emit('page', pagination.page - 1)"
      >
        Sebelumnya
      </button>
      <span class="px-2 text-ink-500">Hal {{ pagination.page }} / {{ pagination.totalPages }}</span>
      <button
        type="button"
        class="px-2.5 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-500/5 transition"
        :disabled="loading || pagination.page >= pagination.totalPages"
        @click="emit('page', pagination.page + 1)"
      >
        Berikutnya
      </button>
    </div>
  </div>
</template>
