import { ref } from 'vue'

// Satu state bersama untuk pratinjau gambar (lightbox). Dipakai oleh ImageLightbox.vue dan
// pendengar klik global di App.vue, sehingga SEMUA gambar bisa diperbesar tanpa mengubah
// tiap halaman.
const preview = ref(null) // { src, alt } atau null kalau tertutup

export function useImagePreview() {
  return {
    preview,
    open(src, alt = '') {
      preview.value = { src, alt }
    },
    close() {
      preview.value = null
    },
  }
}
