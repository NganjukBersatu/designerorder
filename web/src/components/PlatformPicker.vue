<template>
  <div>
    <div v-if="allOptions.length" class="flex flex-wrap gap-2">
      <button
        v-for="opt in allOptions"
        :key="opt"
        type="button"
        @click="toggle(opt)"
        :aria-pressed="isOn(opt)"
        :class="[
          'px-3.5 py-2 rounded-xl border text-sm font-medium transition',
          isOn(opt)
            ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
            : 'border-ink-200 text-ink-600 hover:bg-ink-50'
        ]"
      >
        {{ opt }}
      </button>
    </div>
    <p v-else class="text-xs text-ink-400">Belum ada pilihan. Tambahkan di menu Pengaturan.</p>
    <p v-if="allOptions.length" class="text-xs text-ink-400 mt-1.5">Boleh pilih lebih dari satu.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { splitPlatforms, joinPlatforms } from '../utils/platforms'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const selected = computed(() => splitPlatforms(props.modelValue))

// Platform lama yang sudah tidak ada di daftar tetap muncul selama masih terpilih
const allOptions = computed(() => {
  const list = [...props.options]
  for (const s of selected.value) {
    if (!list.includes(s)) list.push(s)
  }
  return list
})

const isOn = opt => selected.value.includes(opt)

function toggle(opt) {
  const next = isOn(opt)
    ? selected.value.filter(s => s !== opt)
    : [...selected.value, opt]
  // urutan mengikuti urutan pilihan di Pengaturan
  next.sort((a, b) => allOptions.value.indexOf(a) - allOptions.value.indexOf(b))
  emit('update:modelValue', joinPlatforms(next))
}
</script>