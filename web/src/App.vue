<script setup>
import { onMounted, onUnmounted } from 'vue'
import ImageLightbox from './components/ImageLightbox.vue'
import { useImagePreview } from './composables/useImagePreview'

const { open } = useImagePreview()

// Klik pada GAMBAR MANA PUN membuka pratinjau layar penuh. Pendengarnya global (fase capture)
// jadi semua halaman, tabel, form, dan modal tercakup tanpa mengubah satu per satu — dan klik
// gambar tidak ikut memicu aksi induknya (mis. baris yang membuka halaman detail).
// Dikecualikan: logo aplikasi dan gambar yang diberi class "no-preview".
function onImageClick(e) {
  const img = e.target
  if (!(img instanceof HTMLImageElement)) return
  if (img.closest('[data-lightbox]') || img.classList.contains('no-preview')) return
  const src = img.currentSrc || img.src
  if (!src || /favicon/.test(src)) return
  e.preventDefault()
  e.stopPropagation()
  open(src, img.alt)
}

onMounted(() => document.addEventListener('click', onImageClick, true))
onUnmounted(() => document.removeEventListener('click', onImageClick, true))
</script>

<template>
  <router-view />
  <ImageLightbox />
</template>
