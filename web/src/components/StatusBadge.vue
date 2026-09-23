<script setup>
import { computed } from 'vue'
import { STATUS_LABEL, STATUS_COLOR } from '../utils/format.js'

const props = defineProps({ status: { type: String, required: true } })

const classes = computed(() => {
  const tone = STATUS_COLOR[props.status] || 'brand'
  return {
    warn: 'bg-warn-100 text-warn-700 ring-1 ring-inset ring-warn-500/20',
    brand: 'bg-brand-100 text-brand-600 ring-1 ring-inset ring-brand-500/20',
    ok: 'bg-ok-100 text-ok-600 ring-1 ring-inset ring-ok-500/20',
  }[tone]
})
</script>

<template>
  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium" :class="classes">
    {{ STATUS_LABEL[status] || status }}
  </span>
</template>