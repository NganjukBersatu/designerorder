<script setup>
// Tombol ikon untuk mengosongkan semua filter (tanpa teks, label ada di title/aria-label).
defineProps({ label: { type: String, default: 'Reset filter' } })
</script>

<template>
  <button
    type="button"
    class="w-9 h-9 shrink-0 rounded-lg border border-ink-200 bg-white flex items-center justify-center text-ink-500 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition"
    :title="label"
    :aria-label="label"
  >
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
  </button>
</template>
