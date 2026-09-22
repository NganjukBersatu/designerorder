<template>
  <div>
    <input
      :value="modelValue"
      @input="onInput"
      @change="onChange"
      type="text"
      :placeholder="placeholder"
      autocomplete="off"
      class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
    />
  </div>
</template>

<script setup>
import { useOptions } from '../composables/useOptions'

const props = defineProps({
  modelValue: { type: String, default: '' },
  // options tidak lagi dipakai untuk saran dropdown, hanya dipertahankan supaya
  // pemanggilan lama (:options="optionsOf('...')") tidak perlu diubah.
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Ketik...' },
  // Kunci grup di useOptions (mis. 'substyle', 'designer', 'productionStatus', 'style').
  // Kalau diisi, nilai yang diketik otomatis tersimpan sebagai pilihan baru
  // supaya bisa dipakai lagi di dropdown filter (List Produk, Kategori, dll).
  optionKey: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const { addOption } = useOptions()

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

// Saat user selesai mengetik (blur): kalau ini nilai baru, simpan sebagai
// pilihan baru supaya tersedia lagi lain kali di filter/dropdown lain.
function onChange(e) {
  const value = e.target.value.trim()
  if (!value || !props.optionKey) return

  const alreadyExists = props.options.some(o => o.toLowerCase() === value.toLowerCase())
  if (!alreadyExists) {
    addOption(props.optionKey, value)
  }
}
</script>