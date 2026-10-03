// Direktif v-rtable: tabel jadi kartu bertumpuk di layar kecil (CSS .rtable di style.css).
// Tabel tetap <table> biasa di layar lebar. Di layar kecil, setiap sel menampilkan nama
// kolomnya (dari <th>) sebagai label lewat atribut data-label, dan kolom utama (kolom
// pertama selain "No") dibuat selebar kartu. Dipasang di <table class="rtable" v-rtable>,
// jadi sel-sel di tiap halaman tidak perlu diedit satu per satu.
function apply(table) {
  const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim())
  if (!heads.length) return
  const primary = heads.findIndex((h) => h && h.toLowerCase() !== 'no')

  for (const tr of table.querySelectorAll('tbody tr')) {
    const cells = [...tr.children]
    if (cells.length !== heads.length) continue // baris khusus (kosong / colspan) dibiarkan
    cells.forEach((td, i) => {
      if (td.dataset.label !== heads[i]) td.dataset.label = heads[i]
      if (i === primary) td.setAttribute('data-primary', '')
      else td.removeAttribute('data-primary')
    })
  }
}

export const vRtable = {
  mounted(el) {
    apply(el)
    // Vue mengganti baris saat data berubah; amati hanya childList (bukan atribut)
    // supaya pengaturan atribut di atas tidak memicu pengamat lagi.
    el._rtObserver = new MutationObserver(() => apply(el))
    el._rtObserver.observe(el, { childList: true, subtree: true })
  },
  updated(el) {
    apply(el)
  },
  unmounted(el) {
    el._rtObserver?.disconnect()
  },
}
