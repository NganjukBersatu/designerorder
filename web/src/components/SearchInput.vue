<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

// Kotak cari yang dipakai di semua halaman daftar (tampilannya sama dengan List Order).
// Ketikan ditunda `debounce` ms sebelum v-model berubah, jadi halaman yang memuat dari server
// tidak menembak request di setiap huruf.
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Cari...' },
  ariaLabel: { type: String, default: '' },
  debounce: { type: Number, default: 300 },
  // 'default' = gaya List Order (rounded-lg); 'soft' = gaya halaman produk/kategori (rounded-xl, latar krem)
  variant: { type: String, default: 'default' },
})
const emit = defineEmits(['update:modelValue'])

const local = ref(props.modelValue)
let timer = null

const inputClass = computed(() =>
  props.variant === 'soft'
    ? 'w-full rounded-xl border border-ink-200 bg-cream-50 focus:bg-white pl-10 pr-9 py-2.5 text-sm text-ink-800 focus:border-brand-400 outline-none transition'
    : 'w-full rounded-lg border border-ink-200 pl-9 pr-9 py-2 text-[13.5px] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none'
)
const iconClass = computed(() => (props.variant === 'soft' ? 'left-3.5 text-ink-400' : 'left-3 text-ink-300'))

watch(() => props.modelValue, (v) => {
  if (v !== local.value) local.value = v // diubah dari luar (mis. reset filter)
})

function onInput(e) {
  local.value = e.target.value
  clearTimeout(timer)
  timer = setTimeout(() => emit('update:modelValue', local.value), props.debounce)
}

function clear() {
  clearTimeout(timer)
  local.value = ''
  emit('update:modelValue', '')
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="relative min-w-0">
    <svg class="w-4 h-4 absolute top-1/2 -translate-y-1/2 pointer-events-none" :class="iconClass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
    <input
      :value="local"
      type="search"
      :placeholder="placeholder"
      :aria-label="ariaLabel || placeholder"
      :class="inputClass"
      class="[&::-webkit-search-cancel-button]:appearance-none"
      @input="onInput"
      @keydown.esc="clear"
    />
    <button
      v-if="local"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-ink-300 hover:text-ink-600 hover:bg-ink-500/5 transition"
      title="Hapus pencarian"
      aria-label="Hapus pencarian"
      @click="clear"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
    </button>
  </div>
</template>
