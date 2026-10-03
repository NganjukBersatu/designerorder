<script setup>
import { ref } from 'vue'

// Kolom kata sandi standar: setiap kolom sandi di aplikasi punya ikon mata untuk melihat isinya.
// Dipakai persis seperti <input>: v-model, placeholder, autocomplete, class, id, dan event lain
// (mis. @keyup) diteruskan ke input-nya.
defineOptions({ inheritAttrs: false })
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])

const visible = ref(false)
</script>

<template>
  <div class="relative w-full">
    <input
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      class="pr-11"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      type="button"
      class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
      :aria-label="visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
      :aria-pressed="visible"
      :title="visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
      @click="visible = !visible"
    >
      <!-- mata terbuka (sandi tersembunyi) -->
      <svg v-if="!visible" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <!-- mata dicoret (sandi terlihat) -->
      <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.94 10.94 0 0112 19C5 19 1 12 1 12a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
        <path d="M1 1l22 22" />
      </svg>
    </button>
  </div>
</template>
