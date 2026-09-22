<template>
  <div v-if="tags.length" class="flex flex-wrap items-center gap-1.5">
    <span
      v-for="tag in tags"
      :key="tag"
      :class="[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap',
        badgeClass(tag)
      ]"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
      {{ tag }}
    </span>
  </div>
  <span v-else class="text-ink-300">—</span>
</template>

<script setup>
import { computed } from 'vue'
import { splitPlatforms } from '../utils/platforms'

const props = defineProps({
  platform: { type: String, default: '' }
})

// "Etsy & Booth" / "Etsy, Booth" / "Both" dipecah jadi badge terpisah
const tags = computed(() => splitPlatforms(props.platform))

// Warna untuk Etsy dan Booth
const PLATFORM_STYLES = {
  etsy: 'bg-[#FDEBDD] text-[#B4500A]',
  booth: 'bg-[#FCE4EE] text-[#B0245A]'
}

// Platform baru dari Pengaturan otomatis dapat salah satu warna ini
const PLATFORM_FALLBACKS = [
  'bg-[#E3F1EC] text-[#1F6B55]',
  'bg-[#E6EEFB] text-[#2F5DA8]',
  'bg-[#F1E8FA] text-[#6B3FA0]',
  'bg-[#FBF3D9] text-[#8A6A0A]'
]

function badgeClass(name) {
  const known = PLATFORM_STYLES[name.toLowerCase()]
  if (known) return known
  let hash = 0
  for (const ch of name) hash += ch.charCodeAt(0)
  return PLATFORM_FALLBACKS[hash % PLATFORM_FALLBACKS.length]
}
</script>