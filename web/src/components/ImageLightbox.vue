<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useImagePreview } from '../composables/useImagePreview'

const { preview, close } = useImagePreview()

function onKey(e) {
  if (e.key === 'Escape') close()
}

// Halaman di belakang tidak ikut menggulir selama pratinjau terbuka
watch(preview, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="preview"
        data-lightbox
        class="fixed inset-0 z-[10050] flex flex-col bg-black/85 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Pratinjau gambar"
        @click.self="close"
      >
        <div class="flex items-center justify-between gap-3 px-4 py-3 shrink-0" @click.self="close">
          <p class="min-w-0 truncate text-[13px] text-white/80">{{ preview.alt }}</p>
          <div class="flex shrink-0 items-center gap-2">
            <a
              :href="preview.src"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-lg border border-white/20 px-3 py-1.5 text-[12.5px] text-white/90 transition hover:bg-white/10"
            >
              Buka di tab baru
            </a>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10"
              aria-label="Tutup pratinjau"
              @click="close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 items-center justify-center p-4" @click.self="close">
          <img
            :src="preview.src"
            :alt="preview.alt"
            class="no-preview max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.15s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
