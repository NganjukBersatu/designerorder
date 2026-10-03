<script setup>
import { useCurrency } from '../composables/useCurrency'

// Kolom harga + pilihan mata uang. v-model = angka harga, v-model:currency = kode mata uang.
// `lockCurrency` mengunci pilihan (mis. produk di dalam bundling, atau bundling yang mengikuti isinya).
defineProps({
  modelValue: { type: [Number, String], default: '' },
  currency: { type: String, default: 'USD' },
  lockCurrency: { type: Boolean, default: false },
  placeholder: { type: String, default: '0.00' },
})
defineEmits(['update:modelValue', 'update:currency'])

const { currencies } = useCurrency()
const field =
  'px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition'
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :value="modelValue"
      type="number"
      min="0"
      step="any"
      :placeholder="placeholder"
      :class="[field, 'w-full min-w-0']"
      @input="$emit('update:modelValue', $event.target.value === '' ? '' : Number($event.target.value))"
    />
    <select
      :value="currency"
      :disabled="lockCurrency"
      :class="[field, 'w-28 shrink-0', lockCurrency ? 'bg-cream-100 text-ink-500 cursor-not-allowed' : '']"
      aria-label="Mata uang"
      @change="$emit('update:currency', $event.target.value)"
    >
      <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
    </select>
  </div>
</template>
