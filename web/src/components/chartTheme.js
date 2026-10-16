// Tema bersama untuk Chart.js: ikut mode terang/gelap (class `dark` di <html>)
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Chart, BarElement, ArcElement, LineElement, PointElement, LineController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

Chart.register(BarElement, ArcElement, LineElement, PointElement, LineController, CategoryScale, LinearScale, Tooltip, Legend)

export const PALETTE = ['#2C7A74', '#6FA9A2', '#D9A441', '#A3CBC6', '#C9774B', '#869A95', '#163F3C', '#E4C887']

export function useChartColors() {
  const isDark = ref(document.documentElement.classList.contains('dark'))
  let observer
  onMounted(() => {
    observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  })
  onBeforeUnmount(() => observer?.disconnect())
  return isDark
}
