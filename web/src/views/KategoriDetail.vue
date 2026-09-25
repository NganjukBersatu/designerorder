<template>
  <div class="w-full">
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
              {{ items.length }} produk
            </span>
          </div>
          <p class="text-sm text-ink-500 mt-1">Semua produk dengan Style {{ name }}.</p>
        </div>
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

      <!-- Isi kategori: daftar produk -->
      <div class="bg-white dark:bg-cream-900 rounded-card shadow-card border border-ink-100 dark:border-ink-800 overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100 dark:border-ink-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
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
              <tr
                v-for="(item, index) in filteredItems"
                :key="item.id"
                @click="goToProduct(item.id)"
                class="border-b border-ink-50 dark:border-ink-800 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition group cursor-pointer"
              >
                <td class="px-4 py-4 text-ink-400 sticky left-0 z-10 bg-white dark:bg-cream-900 group-hover:bg-black/[0.03] dark:group-hover:bg-white/[0.06]">
                  {{ index + 1 }}
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
                <td class="px-4 py-4 text-ink-600 dark:text-ink-300">{{ item.productionStatus || '—' }}</td>
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
                  {{ item.price ? formatPrice(item.price) : '—' }}
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

              <tr v-if="filteredItems.length === 0">
                <td colspan="14" class="px-4 py-16 text-center text-ink-400">
                  <template v-if="items.length === 0">
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

          <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Gambar produk -->
            <div class="sm:col-span-2">
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

            <div class="sm:col-span-2">
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
                v-model="addForm.designer"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih designer</option>
                <option v-for="d in designerOptions" :key="d" :value="d">{{ d }}</option>
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

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Platform</label>
              <PlatformPicker v-model="addForm.platform" :options="optionsOf('platform')" />
            </div>

            <div class="sm:col-span-2">
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

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Harga ($)</label>
              <input v-model.number="addForm.price" type="number" min="0" step="0.5" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" placeholder="0.00" />
            </div>

            <div class="sm:col-span-2">
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

          <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Gambar produk -->
            <div class="sm:col-span-2">
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

            <div class="sm:col-span-2">
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
                v-model="editForm.designer"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih designer</option>
                <option v-for="d in designerOptions" :key="d" :value="d">{{ d }}</option>
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

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Platform</label>
              <PlatformPicker v-model="editForm.platform" :options="optionsOf('platform')" />
            </div>

            <div class="sm:col-span-2">
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

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5">Harga ($)</label>
              <input v-model.number="editForm.price" type="number" min="0" step="0.5" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-cream-800 text-ink-800 dark:text-ink-100 focus:border-brand-400 outline-none text-sm transition" placeholder="0.00" />
            </div>

            <div class="sm:col-span-2">
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
import { fileToCompressedDataUrl } from '../utils/imageFile'
import { getLinks, cleanLinks } from '../utils/links'
import { splitPlatforms } from '../utils/platforms'
import PlatformBadges from '../components/PlatformBadges.vue'
import OptionSelect from '../components/OptionSelect.vue'
import PlatformPicker from '../components/PlatformPicker.vue'

const route = useRoute()
const router = useRouter()

const { products, totalSold, isSold, addProduct, updateProduct, removeProduct } = useProducts()
const { optionsOf, mergeOptions } = useOptions()
const { members } = useTeamMembers()

const substyleOptions = computed(() =>
  mergeOptions('substyle', [...new Set(products.value.map(p => p.substyle).filter(Boolean))].sort())
)
const designerOptions = computed(() =>
  mergeOptions('designer', members.value.map(m => m.username))
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
const categoryExists = computed(
  () => items.value.length > 0 || optionsOf('style').includes(name.value)
)

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
  const chips = [{ key: 'all', label: 'Semua', count: items.value.length }]
  const subs = new Map()
  let none = 0
  for (const p of items.value) {
    const sub = (p.substyle || '').trim()
    if (sub) subs.set(sub, (subs.get(sub) || 0) + 1)
    else none++
  }
  const sorted = [...subs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  for (const [label, count] of sorted) chips.push({ key: label, label, count })
  if (none && subs.size) chips.push({ key: NONE, label: 'Tanpa substyle', count: none })
  return chips
})

const filteredItems = computed(() => {
  let result = items.value
  if (activeSub.value === NONE) {
    result = result.filter(p => !(p.substyle || '').trim())
  } else if (activeSub.value !== 'all') {
    result = result.filter(p => (p.substyle || '').trim() === activeSub.value)
  }
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    result = result.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.substyle || '').toLowerCase().includes(q) ||
      (p.designer || '').toLowerCase().includes(q) ||
      (p.platform || '').toLowerCase().includes(q) ||
      (p.productionStatus || '').toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q)
    )
  }
  return result
})

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
    designer: '',
    date: nowLocal(),
    uploadDate: '',
    productionStatus: '',
    platform: '',
    linkDbs: [''],
    price: 0,
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
    addForm.value.image = await fileToCompressedDataUrl(file)
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
    designer: addForm.value.designer.trim(),
    date: addForm.value.date,
    uploadDate: addForm.value.uploadDate,
    productionStatus: addForm.value.productionStatus.trim(),
    platform: addForm.value.platform.trim(),
    linkDb: cleaned[0] || '',
    linkDbs: cleaned,
    price: addForm.value.price || 0,
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
    designer: item.designer || '',
    date: item.date || '',
    uploadDate: item.uploadDate || '',
    productionStatus: item.productionStatus || '',
    platform: item.platform || '',
    linkDbs: links.length ? [...links] : [''],
    price: item.price ?? 0,
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
    editForm.value.image = await fileToCompressedDataUrl(file)
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
      designer: editForm.value.designer.trim(),
      date: editForm.value.date,
      uploadDate: editForm.value.uploadDate,
      productionStatus: editForm.value.productionStatus.trim(),
      platform: editForm.value.platform.trim(),
      linkDb: cleaned[0] || '',
      linkDbs: cleaned,
      price: editForm.value.price || 0,
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