<template>
  <div class="w-full page-fill">
    <!-- ==================== KATEGORI DITEMUKAN ==================== -->
    <template v-if="categoryExists">
      <!-- Kembali -->
      <div class="mb-6">
        <button
          @click="goBack"
          class="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Kategori
        </button>
      </div>

      <!-- Judul kategori -->
      <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-2xl font-semibold text-ink-900">{{ name }}</h2>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-cream-100 text-ink-600 text-[12px] font-medium tabular-nums">
              {{ items.length }} produk<template v-if="categoryBundles.length"> · {{ categoryBundles.length }} bundling</template>
            </span>
          </div>
          <p class="text-sm text-ink-500 mt-1">Semua produk dengan Style {{ name }}.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="openBundleModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-500 text-brand-600 hover:bg-brand-50 text-sm font-medium transition"
          >
            Buat Bundling
          </button>
          <button
            type="button"
            @click="openAddModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Produk
          </button>
        </div>
      </div>

      <!-- Isi kategori: daftar produk -->
      <div class="bg-white dark:bg-cream-900 rounded-card shadow-card border border-ink-100 dark:border-ink-800 card-fill">
        <div class="shrink-0 px-5 py-4 border-b border-ink-100 dark:border-ink-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <!-- Filter Substyle -->
          <div v-if="substyleChips.length > 1" class="flex flex-wrap gap-2">
            <button
              v-for="chip in substyleChips"
              :key="chip.key"
              type="button"
              @click="activeSub = chip.key"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition',
                activeSub === chip.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-cream-100 dark:bg-cream-800 text-ink-600 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-700'
              ]"
            >
              {{ chip.label }}
              <span :class="['text-xs tabular-nums', activeSub === chip.key ? 'text-white/70' : 'text-ink-400']">
                {{ chip.count }}
              </span>
            </button>
          </div>
          <h3 v-else class="text-base font-semibold text-ink-900">Daftar Produk</h3>

          <!-- Cari -->
          <div class="relative w-full lg:w-72">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari produk di kategori ini..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-cream-50 dark:bg-cream-800 focus:bg-white dark:focus:bg-ink-800 focus:border-brand-400 outline-none text-sm transition text-ink-800 dark:text-ink-100"
            />
          </div>
        </div>

        <!-- Filter lanjutan -->
        <div class="shrink-0 px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex flex-wrap items-center gap-2.5">
          <select v-model="filters.productionStatus" :class="filterSelect" aria-label="Filter status produksi">
            <option value="">Semua status produksi</option>
            <option v-for="o in filterOptions.productionStatus" :key="o" :value="o">{{ o }}</option>
          </select>
          <select v-model="filters.platform" :class="filterSelect" aria-label="Filter platform">
            <option value="">Semua platform</option>
            <option v-for="o in filterOptions.platform" :key="o" :value="o">{{ o }}</option>
          </select>
          <select v-model="filters.designer" :class="filterSelect" aria-label="Filter designer">
            <option value="">Semua designer</option>
            <option v-for="o in filterOptions.designer" :key="o" :value="o">{{ o }}</option>
          </select>
          <select v-model="filters.sold" :class="filterSelect" aria-label="Filter status jual">
            <option value="">Semua status jual</option>
            <option value="sold">Terjual</option>
            <option value="unsold">Belum terjual</option>
          </select>
          <button
            v-if="hasFilter"
            type="button"
            class="px-3 py-2 rounded-xl text-sm font-medium text-brand-600 hover:bg-brand-50 transition"
            @click="resetFilters"
          >
            Reset filter
          </button>
          <span class="ml-auto text-[13px] text-ink-400 tabular-nums">
            {{ filteredItems.length + filteredBundles.length }} dari {{ items.length + categoryBundles.length }}
          </span>
        </div>

        <div class="scroll-fill">
          <table v-rtable class="rtable-xl w-full text-sm">
            <thead>
              <tr class="bg-cream-100 dark:bg-cream-800 text-ink-500 dark:text-ink-300 border-b border-ink-100 dark:border-ink-800">
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap w-12 sticky left-0 z-20 bg-cream-100 dark:bg-cream-800">No</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[260px]">Nama Produk</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Substyle</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[110px]">Designer</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[160px]">Tanggal Dibuat</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Tanggal Upload Platform</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Status Produksi</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Platform</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[160px]">Link DB</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap min-w-[100px]">Harga</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap w-28">Jumlah Terjual</th>
                <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap min-w-[120px]">Status Jual</th>
                <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap w-16">Aksi</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[140px]">Catatan</th>
              </tr>
            </thead>
            <tbody>
              <!-- Bundling di kategori ini (dihitung sebagai satu produk) -->
              <tr
                v-for="(b, bIndex) in filteredBundles"
                :key="b.id"
                @click="router.push(`/bundling/${b.id}`)"
                class="border-b border-ink-50 dark:border-ink-800 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition group cursor-pointer"
              >
                <td class="px-4 py-4 text-ink-400 sticky left-0 z-10 bg-white dark:bg-cream-900 group-hover:bg-black/[0.03] dark:group-hover:bg-white/[0.06]">{{ bIndex + 1 }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-ink-100 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 flex items-center justify-center">
                      <img v-if="b.image" :src="b.image" :alt="b.name" class="w-full h-full object-cover" loading="lazy" />
                      <span v-else class="text-[10px] text-ink-300">Bundling</span>
                    </div>
                    <div class="min-w-0">
                      <span class="font-medium text-ink-800 dark:text-ink-100">{{ b.name }}</span>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="inline-flex px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium">Bundling</span>
                        <span class="text-[12px] text-ink-400">{{ b.itemCount }} produk</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 text-ink-600 dark:text-ink-300">{{ b.substyle || '—' }}</td>
                <td class="px-4 py-4 text-ink-300">—</td>
                <td class="px-4 py-4 text-ink-500 dark:text-ink-400 text-[13px]">{{ b.createdAt ? formatDateTime(b.createdAt) : '—' }}</td>
                <td class="px-4 py-4 text-ink-300">—</td>
                <td class="px-4 py-4 text-ink-300">—</td>
                <td class="px-4 py-4"><PlatformBadges :platform="b.platform" /></td>
                <td class="px-4 py-4">
                  <div v-if="b.linkDbs.length" class="flex flex-col gap-1">
                    <a
                      v-for="(link, i) in b.linkDbs"
                      :key="i"
                      :href="link"
                      :title="link"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click.stop
                      class="inline-flex items-center gap-1.5 text-brand-600 hover:underline whitespace-nowrap"
                    >{{ b.linkDbs.length > 1 ? `Dropbox ${i + 1}` : 'Buka Dropbox' }}</a>
                  </div>
                  <span v-else class="text-ink-300">—</span>
                </td>
                <td class="px-4 py-4 text-right text-ink-700 dark:text-ink-100 font-medium tabular-nums">{{ b.price ? formatPrice(b.price, b.currency) : '—' }}</td>
                <td class="px-4 py-4 text-right text-ink-700 dark:text-ink-100 tabular-nums">{{ b.soldQty }}</td>
                <td class="px-4 py-4 text-center">
                  <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium', b.soldQty > 0 ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700']">
                    {{ b.soldQty > 0 ? 'Terjual' : 'Belum Terjual' }}
                  </span>
                </td>
                <td class="px-4 py-4 text-center" @click.stop>
                  <button
                    class="p-1.5 rounded-lg hover:bg-ok-100 text-ok-600 transition"
                    title="Catat penjualan"
                    @click="router.push({ path: `/bundling/${b.id}`, query: { jual: 1 } })"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  </button>
                </td>
                <td class="px-4 py-4 text-ink-500 dark:text-ink-400">{{ b.note || '—' }}</td>
              </tr>

              <tr
                v-for="(item, index) in filteredItems"
                :key="item.id"
                @click="goToProduct(item.id)"
                class="border-b border-ink-50 dark:border-ink-800 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition group cursor-pointer"
              >
                <td class="px-4 py-4 text-ink-400 sticky left-0 z-10 bg-white dark:bg-cream-900 group-hover:bg-black/[0.03] dark:group-hover:bg-white/[0.06]">
                  {{ filteredBundles.length + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-ink-100 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 flex items-center justify-center">
                      <img
                        v-if="item.image"
                        :src="item.image"
                        :alt="item.name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span class="font-medium text-ink-800 dark:text-ink-100">{{ item.name || '—' }}</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-ink-600 dark:text-ink-300">{{ item.substyle || '—' }}</td>
                <td class="px-4 py-4 text-ink-600 dark:text-ink-300">{{ item.designer || '—' }}</td>
                <td class="px-4 py-4 text-ink-500 dark:text-ink-400 text-[13px]">
                  {{ item.date ? formatDateTime(item.date) : '—' }}
                </td>
                <td class="px-4 py-4 text-ink-500 dark:text-ink-400 text-[13px]">
                  {{ item.uploadDate ? formatDateTime(item.uploadDate) : '—' }}
                </td>
                <td class="px-4 py-4">
                  <span
                    v-if="item.productionStatus"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap"
                    :class="productionStatusClasses(item.productionStatus)"
                  >
                    {{ item.productionStatus }}
                  </span>
                  <span v-else class="text-ink-300">—</span>
                </td>
                <td class="px-4 py-4"><PlatformBadges :platform="item.platform" /></td>
                <td class="px-4 py-4">
                  <div v-if="getLinks(item).length" class="flex flex-col gap-1">
                    <a
                      v-for="(link, i) in getLinks(item)"
                      :key="i"
                      :href="link"
                      :title="link"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click.stop
                      class="inline-flex items-center gap-1.5 text-brand-600 hover:underline whitespace-nowrap"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {{ getLinks(item).length > 1 ? `Dropbox ${i + 1}` : 'Buka Dropbox' }}
                    </a>
                  </div>
                  <span v-else class="text-ink-300">—</span>
                </td>
                <td class="px-4 py-4 text-right text-ink-700 dark:text-ink-100 font-medium tabular-nums">
                  {{ item.price ? formatPrice(item.price, item.currency) : '—' }}
                </td>
                <td class="px-4 py-4 text-right text-ink-700 dark:text-ink-100 tabular-nums">{{ totalSold(item.id) }}</td>
                <td class="px-4 py-4 text-center">
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium',
                      isSold(item.id) ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700'
                    ]"
                  >
                    {{ isSold(item.id) ? 'Terjual' : 'Belum Terjual' }}
                  </span>
                </td>

                <!-- Aksi -->
                <td class="px-4 py-4 text-center relative" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <button
                      @click="recordSale(item.id)"
                      class="p-1.5 rounded-lg hover:bg-ok-100 text-ok-600 transition"
                      title="Catat penjualan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-300 transition"
                      title="Aksi lain"
                      aria-label="Aksi lain"
                      @click.stop="toggleMenu(item.id, $event)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6h.01M12 12h.01M12 18h.01" />
                      </svg>
                    </button>
                  </div>

                  <Teleport to="body">
                    <div v-if="openMenuId === item.id" class="fixed inset-0 z-30" @click="closeMenu"></div>
                    <div
                      v-if="openMenuId === item.id"
                      class="fixed w-36 bg-white dark:bg-cream-800 rounded-xl shadow-lg border border-ink-100 dark:border-ink-800 py-1.5 z-40 text-left"
                      :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }"
                    >
                      <button
                        type="button"
                        class="w-full text-left px-3.5 py-2 text-[13px] text-ink-700 dark:text-ink-100 hover:bg-cream-50 dark:hover:bg-ink-700 transition"
                        @click.stop="editProduct(item)"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="w-full text-left px-3.5 py-2 text-[13px] text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition"
                        @click.stop="askRemove(item)"
                      >
                        Hapus
                      </button>
                    </div>
                  </Teleport>
                </td>

                <td class="px-4 py-4 text-ink-500 dark:text-ink-400">{{ item.note || '—' }}</td>
              </tr>

              <tr v-if="filteredItems.length + filteredBundles.length === 0">
                <td colspan="14" class="px-4 py-16 text-center text-ink-400">
                  <template v-if="items.length + categoryBundles.length === 0">
                    Belum ada produk di kategori ini. Klik <strong>Tambah Produk</strong> untuk menambahkan yang pertama.
                  </template>
                  <template v-else>
                    Tidak ada produk yang cocok dengan filter / pencarian.
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==================== KATEGORI TIDAK DITEMUKAN ==================== -->
    <div v-else class="bg-white dark:bg-cream-900 rounded-card shadow-card border border-ink-100 dark:border-ink-800 px-6 py-16 text-center">
      <p class="text-ink-800 dark:text-ink-100 font-medium mb-1">Kategori tidak ditemukan</p>
      <p class="text-sm text-ink-500 mb-5">Kategori ini mungkin sudah dihapus atau namanya berubah.</p>
      <button
        @click="goBack"
        class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
      >
        Kembali ke Kategori
      </button>
    </div>

    <!-- ==================== MODAL BUAT BUNDLING ==================== -->
    <BundleForm
      :open="showBundleModal"
      mode="create"
      :category="name"
      :candidates="items"
      :substyle-options="substyleOptions"
      :platform-options="optionsOf('platform')"
      :saving="savingBundle"
      :error="bundleError"
      @close="showBundleModal = false"
      @save="submitBundle"
    />

    <!-- ==================== MODAL TAMBAH PRODUK ==================== -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="closeAddModal"></div>
        <div class="relative bg-white dark:bg-cream-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-800">
            <h2 class="text-lg font-semibold text-ink-900 dark:text-ink-50">Tambah Produk</h2>
            <button
              @click="closeAddModal"
              class="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-300 transition"
              aria-label="Tutup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-5 fx-grid [--fx-min:14rem] gap-4">
            <!-- Gambar produk -->
            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Gambar Produk</label>
              <div class="flex items-center gap-4">
                <div class="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 flex items-center justify-center">
                  <img v-if="addForm.image" :src="addForm.image" alt="Pratinjau gambar" class="w-full h-full object-cover" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div class="flex flex-col items-start gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 text-sm font-medium transition cursor-pointer">
                      {{ addForm.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
                      <input type="file" accept="image/*" class="hidden" @change="onPickAddImage" />
                    </label>
                    <button
                      v-if="addForm.image"
                      type="button"
                      @click="addForm.image = ''"
                      class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 text-sm font-medium transition"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                  <p v-if="addImageError" class="text-xs text-danger-600">{{ addImageError }}</p>
                  <p v-else class="text-xs text-ink-400">JPG, PNG, atau WEBP. Ukuran otomatis diperkecil.</p>
                </div>
              </div>
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Nama Produk</label>
              <input v-model="addForm.name" type="text" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" placeholder="Nama produk" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Style</label>
              <input
                :value="name"
                type="text"
                disabled
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 text-ink-500 dark:text-ink-400 text-sm cursor-not-allowed"
              />
              <p class="text-xs text-ink-400 mt-1">Otomatis mengikuti kategori {{ name }} yang sedang dibuka.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Substyle</label>
              <select
                v-model="addForm.substyle"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih substyle</option>
                <option v-for="sub in substyleOptions" :key="sub" :value="sub">{{ sub }}</option>
              </select>
              <p v-if="!substyleOptions.length" class="text-[12px] text-ink-400 mt-1">
                Belum ada pilihan substyle, tambahkan dulu di halaman Pengaturan.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Designer</label>
              <select
                v-model="addForm.designerId"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Belum dipilih</option>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.displayName || m.username }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Status Produksi</label>
              <select
                v-model="addForm.productionStatus"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih status produksi</option>
                <option v-for="s in productionStatusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Tanggal Dibuat</label>
              <input v-model="addForm.date" type="datetime-local" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Tanggal Upload ke Platform</label>
              <input v-model="addForm.uploadDate" type="datetime-local" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Platform</label>
              <PlatformPicker v-model="addForm.platform" :options="optionsOf('platform')" />
            </div>

            <div class="fx-full">
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-ink-700 dark:text-ink-200">Link DB</label>
                <button
                  type="button"
                  @click="addForm.linkDbs.push('')"
                  class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Link
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(link, i) in addForm.linkDbs" :key="i" class="flex items-center gap-2">
                  <input
                    v-model="addForm.linkDbs[i]"
                    type="text"
                    class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
                    :placeholder="`https://www.dropbox.com/... (link ${i + 1})`"
                  />
                  <button
                    v-if="addForm.linkDbs.length > 1"
                    type="button"
                    @click="addForm.linkDbs.splice(i, 1)"
                    class="p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 text-danger-600 transition"
                    title="Hapus link"
                    aria-label="Hapus link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Harga</label>
              <PriceInput v-model="addForm.price" v-model:currency="addForm.currency" />
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Catatan</label>
              <textarea v-model="addForm.note" rows="2" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition resize-none" placeholder="Catatan tambahan..."></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 dark:border-ink-800 bg-cream-50 dark:bg-cream-800 rounded-b-2xl">
            <button
              @click="closeAddModal"
              class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-200 hover:bg-white dark:hover:bg-ink-700 text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              @click="submitAdd"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
            >
              Simpan Produk
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== MODAL EDIT PRODUK ==================== -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="closeEditModal"></div>
        <div class="relative bg-white dark:bg-cream-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-800">
            <h2 class="text-lg font-semibold text-ink-900 dark:text-ink-50">Edit Produk</h2>
            <button
              @click="closeEditModal"
              class="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500 dark:text-ink-300 transition"
              aria-label="Tutup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-5 fx-grid [--fx-min:14rem] gap-4">
            <!-- Gambar produk -->
            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Gambar Produk</label>
              <div class="flex items-center gap-4">
                <div class="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 flex items-center justify-center">
                  <img v-if="editForm.image" :src="editForm.image" alt="Pratinjau gambar" class="w-full h-full object-cover" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div class="flex flex-col items-start gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 text-sm font-medium transition cursor-pointer">
                      {{ editForm.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
                      <input type="file" accept="image/*" class="hidden" @change="onPickEditImage" />
                    </label>
                    <button
                      v-if="editForm.image"
                      type="button"
                      @click="editForm.image = ''"
                      class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 text-sm font-medium transition"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                  <p v-if="editImageError" class="text-xs text-danger-600">{{ editImageError }}</p>
                  <p v-else class="text-xs text-ink-400">JPG, PNG, atau WEBP. Ukuran otomatis diperkecil.</p>
                </div>
              </div>
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Nama Produk</label>
              <input v-model="editForm.name" type="text" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" placeholder="Nama produk" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Style</label>
              <input
                :value="name"
                type="text"
                disabled
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-cream-100 dark:bg-cream-800 text-ink-500 dark:text-ink-400 text-sm cursor-not-allowed"
              />
              <p class="text-xs text-ink-400 mt-1">Style mengikuti kategori {{ name }}.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Substyle</label>
              <select
                v-model="editForm.substyle"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih substyle</option>
                <option v-for="sub in substyleOptions" :key="sub" :value="sub">{{ sub }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Designer</label>
              <select
                v-model="editForm.designerId"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Belum dipilih</option>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.displayName || m.username }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Status Produksi</label>
              <select
                v-model="editForm.productionStatus"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih status produksi</option>
                <option v-for="s in productionStatusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Tanggal Dibuat</label>
              <input v-model="editForm.date" type="datetime-local" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Tanggal Upload ke Platform</label>
              <input v-model="editForm.uploadDate" type="datetime-local" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Platform</label>
              <PlatformPicker v-model="editForm.platform" :options="optionsOf('platform')" />
            </div>

            <div class="fx-full">
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-ink-700 dark:text-ink-200">Link DB</label>
                <button
                  type="button"
                  @click="editForm.linkDbs.push('')"
                  class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Link
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(link, i) in editForm.linkDbs" :key="i" class="flex items-center gap-2">
                  <input
                    v-model="editForm.linkDbs[i]"
                    type="text"
                    class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
                    :placeholder="`https://www.dropbox.com/... (link ${i + 1})`"
                  />
                  <button
                    v-if="editForm.linkDbs.length > 1"
                    type="button"
                    @click="editForm.linkDbs.splice(i, 1)"
                    class="p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 text-danger-600 transition"
                    title="Hapus link"
                    aria-label="Hapus link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Harga</label>
              <PriceInput v-model="editForm.price" v-model:currency="editForm.currency" />
            </div>

            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Catatan</label>
              <textarea v-model="editForm.note" rows="2" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition resize-none" placeholder="Catatan tambahan..."></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 dark:border-ink-800 bg-cream-50 dark:bg-cream-800 rounded-b-2xl">
            <button
              @click="closeEditModal"
              class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-200 hover:bg-white dark:hover:bg-ink-700 text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              @click="submitEdit"
              :disabled="savingEdit"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm disabled:opacity-60"
            >
              {{ savingEdit ? 'Menyimpan…' : 'Simpan Perubahan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== MODAL KONFIRMASI HAPUS ==================== -->
    <Teleport to="body">
      <div v-if="productToDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="cancelRemove"></div>
        <div class="relative bg-white dark:bg-cream-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-ink-900 dark:text-ink-50 mb-1.5">Hapus produk?</h3>
          <p class="text-[13.5px] text-ink-500 mb-5">
            Produk "<strong>{{ productToDelete.name }}</strong>" akan dihapus permanen dan tidak bisa dikembalikan.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 text-[13.5px] font-medium transition"
              @click="cancelRemove"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="deleting"
              class="px-4 py-2.5 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-[13.5px] font-medium transition disabled:opacity-60"
              @click="confirmRemove"
            >
              {{ deleting ? 'Menghapus…' : 'Ya, hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProducts, formatPrice, formatDateTime, nowLocal, normalizeUrl } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'
import { useTeamMembers } from '../composables/useTeamMembers'
import { uploadImage } from '../utils/imageFile'
import { getLinks, cleanLinks } from '../utils/links'
import { splitPlatforms } from '../utils/platforms'
import PlatformBadges from '../components/PlatformBadges.vue'
import OptionSelect from '../components/OptionSelect.vue'
import PlatformPicker from '../components/PlatformPicker.vue'
import BundleForm from '../components/BundleForm.vue'
import PriceInput from '../components/PriceInput.vue'
import { useBundles } from '../composables/useBundles'

const route = useRoute()
const router = useRouter()

const { products, totalSold, isSold, addProduct, updateProduct, removeProduct } = useProducts()
const { optionsOf, mergeOptions } = useOptions()
const { members } = useTeamMembers()
const { bundlesOf, addBundle } = useBundles()

const substyleOptions = computed(() =>
  mergeOptions('substyle', [...new Set(products.value.map(p => p.substyle).filter(Boolean))].sort())
)
const productionStatusOptions = computed(() =>
  mergeOptions('productionStatus', [...new Set(products.value.map(p => p.productionStatus).filter(Boolean))].sort())
)

const NONE = '__none'

// ========== DATA KATEGORI ==========
const name = computed(() => String(route.params.name || ''))
const items = computed(() =>
  products.value.filter(p => (p.style || '').trim() === name.value)
)
const categoryBundles = computed(() => bundlesOf(name.value))
const categoryExists = computed(
  () => items.value.length > 0 || categoryBundles.value.length > 0 || optionsOf('style').includes(name.value)
)

// ========== WARNA BADGE STATUS PRODUKSI ==========
// Status produksi adalah teks bebas (custom dari halaman Pengaturan, bukan
// enum tetap), jadi warnanya di-generate otomatis dari nama status supaya
// tiap status konsisten dapat warna yang sama tiap kali dirender.
const PRODUCTION_STATUS_PALETTE = [
  'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
]

function productionStatusClasses(status) {
  if (!status) return ''
  let hash = 0
  for (let i = 0; i < status.length; i++) {
    hash = status.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % PRODUCTION_STATUS_PALETTE.length
  return PRODUCTION_STATUS_PALETTE[idx]
}

// ========== FILTER SUBSTYLE & PENCARIAN ==========
const activeSub = ref('all')
const searchQuery = ref('')

watch(
  () => [route.params.name, route.query.substyle],
  () => {
    const sub = route.query.substyle
    activeSub.value = typeof sub === 'string' && sub ? sub : 'all'
    searchQuery.value = ''
  },
  { immediate: true }
)

const substyleChips = computed(() => {
  const chips = [{ key: 'all', label: 'Semua', count: items.value.length + categoryBundles.value.length }]
  const subs = new Map()
  let none = 0
  for (const p of [...items.value, ...categoryBundles.value]) {
    const sub = (p.substyle || '').trim()
    if (sub) subs.set(sub, (subs.get(sub) || 0) + 1)
    else none++
  }
  const sorted = [...subs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  for (const [label, count] of sorted) chips.push({ key: label, label, count })
  if (none && subs.size) chips.push({ key: NONE, label: 'Tanpa substyle', count: none })
  return chips
})

// Filter lanjutan (dropdown). Semua kondisi digabung dengan "dan".
const filterSelect =
  'px-3 py-2 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-700 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition'
const filters = ref({ productionStatus: '', platform: '', designer: '', sold: '' })
const hasFilter = computed(() => Object.values(filters.value).some(Boolean))
function resetFilters() {
  filters.value = { productionStatus: '', platform: '', designer: '', sold: '' }
}
watch(() => route.params.name, resetFilters)

// Pilihan filter diambil dari data kategori ini saja, jadi tidak ada opsi yang pasti kosong
const filterOptions = computed(() => {
  const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return {
    productionStatus: uniq(items.value.map((p) => p.productionStatus)),
    platform: uniq([...items.value, ...categoryBundles.value].flatMap((p) => splitPlatforms(p.platform))),
    designer: uniq(items.value.map((p) => p.designer)),
  }
})

const matchesSearch = (q, fields) => !q || fields.some((f) => (f || '').toLowerCase().includes(q))
const matchesSub = (p) => {
  const sub = (p.substyle || '').trim()
  if (activeSub.value === NONE) return !sub
  return activeSub.value === 'all' || sub === activeSub.value
}
const matchesSold = (soldQty) =>
  !filters.value.sold || (filters.value.sold === 'sold' ? soldQty > 0 : soldQty === 0)
const matchesPlatform = (p) => !filters.value.platform || splitPlatforms(p.platform).includes(filters.value.platform)

const filteredItems = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const f = filters.value
  return items.value.filter(
    (p) =>
      matchesSub(p) &&
      matchesSearch(q, [p.name, p.substyle, p.designer, p.platform, p.productionStatus, p.note]) &&
      (!f.productionStatus || p.productionStatus === f.productionStatus) &&
      (!f.designer || p.designer === f.designer) &&
      matchesPlatform(p) &&
      matchesSold(totalSold(p.id))
  )
})

// Bundling tidak punya designer / status produksi, jadi tersaring keluar kalau filter itu dipakai
const filteredBundles = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const f = filters.value
  if (f.productionStatus || f.designer) return []
  return categoryBundles.value.filter(
    (b) => matchesSub(b) && matchesSearch(q, [b.name, b.substyle, b.platform, b.note]) && matchesPlatform(b) && matchesSold(b.soldQty)
  )
})

// ========== BUAT BUNDLING ==========
const showBundleModal = ref(false)
const savingBundle = ref(false)
const bundleError = ref('')

function openBundleModal() {
  bundleError.value = ''
  showBundleModal.value = true
}
async function submitBundle(payload) {
  savingBundle.value = true
  bundleError.value = ''
  try {
    const created = await addBundle(payload)
    showBundleModal.value = false
    router.push(`/bundling/${created.id}`)
  } catch (err) {
    bundleError.value = err.message
  } finally {
    savingBundle.value = false
  }
}

// ========== NAVIGASI ==========
function goBack() {
  router.push('/kategori')
}
function goToProduct(id) {
  router.push(`/produk/${id}`)
}
function recordSale(id) {
  closeMenu()
  router.push({ path: `/produk/${id}`, query: { jual: 1 } })
}

// ========== MENU TITIK TIGA ==========
const openMenuId = ref(null)
const menuPos = ref({ top: 0, left: 0 })

function toggleMenu(id, event) {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  menuPos.value = {
    top: rect.bottom + 4,
    left: rect.right - 144,
  }
  openMenuId.value = id
}
function closeMenu() {
  openMenuId.value = null
}

// ========== KONFIRMASI HAPUS ==========
const productToDelete = ref(null)
const deleting = ref(false)

function askRemove(item) {
  closeMenu()
  productToDelete.value = item
}
function cancelRemove() {
  productToDelete.value = null
}
async function confirmRemove() {
  if (!productToDelete.value) return
  deleting.value = true
  try {
    await removeProduct(productToDelete.value.id)
    productToDelete.value = null
  } catch (err) {
    alert(err.message)
  } finally {
    deleting.value = false
  }
}

// ========== TAMBAH PRODUK ==========
const showAddModal = ref(false)
const addImageError = ref('')
const addForm = ref(emptyAddForm())

function emptyAddForm() {
  return {
    image: '',
    name: '',
    substyle: '',
    designerId: '',
    date: nowLocal(),
    uploadDate: '',
    productionStatus: '',
    platform: '',
    linkDbs: [''],
    price: 0,
    currency: 'USD',
    note: ''
  }
}

function openAddModal() {
  addForm.value = emptyAddForm()
  addImageError.value = ''
  showAddModal.value = true
}
function closeAddModal() {
  showAddModal.value = false
}

async function onPickAddImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    addForm.value.image = await uploadImage(file, 'product')
    addImageError.value = ''
  } catch (err) {
    addImageError.value = err.message
  }
}

function submitAdd() {
  if (!addForm.value.name.trim()) {
    alert('Nama Produk wajib diisi')
    return
  }
  const cleaned = cleanLinks(addForm.value.linkDbs, normalizeUrl)
  addProduct({
    image: addForm.value.image,
    name: addForm.value.name.trim(),
    style: name.value,
    substyle: addForm.value.substyle.trim(),
    designerId: addForm.value.designerId || null,
    date: addForm.value.date,
    uploadDate: addForm.value.uploadDate,
    productionStatus: addForm.value.productionStatus.trim(),
    platform: addForm.value.platform.trim(),
    linkDb: cleaned[0] || '',
    linkDbs: cleaned,
    price: addForm.value.price || 0,
    currency: addForm.value.currency,
    note: addForm.value.note.trim()
  })
  closeAddModal()
}

// ========== EDIT PRODUK ==========
const showEditModal = ref(false)
const editImageError = ref('')
const savingEdit = ref(false)
const editingId = ref(null)
const editForm = ref(emptyAddForm())

function editProduct(item) {
  closeMenu()
  editingId.value = item.id

  // Ambil link dari getLinks agar konsisten
  const links = getLinks(item)
  editForm.value = {
    image: item.image || '',
    name: item.name || '',
    substyle: item.substyle || '',
    designerId: item.designerId || '',
    date: item.date || '',
    uploadDate: item.uploadDate || '',
    productionStatus: item.productionStatus || '',
    platform: item.platform || '',
    linkDbs: links.length ? [...links] : [''],
    price: item.price ?? 0,
    currency: item.currency || 'USD',
    note: item.note || ''
  }
  editImageError.value = ''
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingId.value = null
}

async function onPickEditImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    editForm.value.image = await uploadImage(file, 'product')
    editImageError.value = ''
  } catch (err) {
    editImageError.value = err.message
  }
}

async function submitEdit() {
  if (!editForm.value.name.trim()) {
    alert('Nama Produk wajib diisi')
    return
  }
  if (!editingId.value) return

  savingEdit.value = true
  try {
    const cleaned = cleanLinks(editForm.value.linkDbs, normalizeUrl)
    await updateProduct(editingId.value, {
      image: editForm.value.image,
      name: editForm.value.name.trim(),
      style: name.value, // tetap mengikuti kategori
      substyle: editForm.value.substyle.trim(),
      designerId: editForm.value.designerId || null,
      date: editForm.value.date,
      uploadDate: editForm.value.uploadDate,
      productionStatus: editForm.value.productionStatus.trim(),
      platform: editForm.value.platform.trim(),
      linkDb: cleaned[0] || '',
      linkDbs: cleaned,
      price: editForm.value.price || 0,
      currency: editForm.value.currency,
      note: editForm.value.note.trim()
    })
    closeEditModal()
  } catch (err) {
    alert(err.message || 'Gagal menyimpan perubahan')
  } finally {
    savingEdit.value = false
  }
}
</script>