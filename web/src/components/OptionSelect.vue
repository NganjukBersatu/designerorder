<template>
  <div>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="opt in allOptions" :key="opt" :value="opt">{{ opt }}</option>
    </select>
    <p v-if="!options.length" class="text-xs text-ink-400 mt-1.5">
      Belum ada pilihan. Tambahkan di menu Pengaturan.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Pilih...' }
})

defineEmits(['update:modelValue'])

// Nilai lama yang sudah tidak ada di daftar tetap ditampilkan supaya tidak hilang saat edit
const allOptions = computed(() => {
  const list = [...props.options]
  if (props.modelValue && !list.includes(props.modelValue)) list.push(props.modelValue)
  return list
})
</script>