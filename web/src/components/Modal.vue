<script setup>
defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px]" @click="emit('close')" />
      <div class="relative bg-white rounded-card shadow-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white">
          <h3 class="text-[16px] font-semibold text-ink-900">{{ title }}</h3>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 transition"
            @click="emit('close')"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="p-6">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

