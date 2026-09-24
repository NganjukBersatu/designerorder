<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-ink-200 bg-white hover:border-ink-300 focus:border-brand-400 outline-none text-sm transition"
      :class="modelValue ? 'text-ink-900' : 'text-ink-400'"
      @click="open = !open"
    >
      <span class="truncate">{{ modelValue || placeholder }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="text-ink-400 transition-transform shrink-0 ml-2"
        :class="{ 'rotate-180': open }"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute z-10 mt-1.5 w-full rounded-xl border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1 max-h-56 overflow-y-auto"
    >
      <button
        v-if="allowEmpty"
        type="button"
        class="w-full text-left px-3 py-2 text-sm transition"
        :class="!modelValue ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-400 hover:bg-ink-50'"
        @click="select('')"
      >
        {{ placeholder }}
      </button>

      <button
        v-for="opt in options"
        :key="opt"
        type="button"
        class="w-full text-left px-3 py-2 text-sm transition"
        :class="opt === modelValue ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-ink-50'"
        @click="select(opt)"
      >
        {{ opt }}
      </button>

      <p v-if="!options.length" class="px-3 py-2 text-[12px] text-ink-400">
        Belum ada pilihan.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Pilih...' },
  // Tampilkan pilihan "kosongkan" (setara <option value="">Pilih...</option>) di atas daftar.
  allowEmpty: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)

function select(value) {
  emit('update:modelValue', value)
  open.value = false
}

function onClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>