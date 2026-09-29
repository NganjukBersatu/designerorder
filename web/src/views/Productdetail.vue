<template>
  <div class="w-full">
    <!-- ==================== PRODUK DITEMUKAN ==================== -->
    <template v-if="product">
      <!-- Bar atas: kembali + aksi -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          @click="goBack"
          class="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Kategori
        </button>

        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="openEditModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          <button
            @click="showDeleteConfirm = true"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-danger-600 hover:bg-danger-50 text-sm font-medium transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Hapus
          </button>

          <button
            @click="openSaleModal"
            class="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Catat Penjualan
          </button>
        </div>
      </div>

      <!-- Gambar + judul produk -->
      <div class="mb-6 flex items-start gap-5">
        <div class="w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden border border-ink-100 bg-cream-100 shadow-card flex items-center justify-center">
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="flex flex-col items-center gap-1.5 px-3 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-[12px] text-ink-400 leading-tight">Belum ada gambar</span>
          </div>
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-2xl font-semibold text-ink-900">{{ product.name }}</h2>
            <span
              :class="[
                'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium',
                sold ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700'
              ]"
            >
              {{ sold ? 'Terjual' : 'Belum Terjual' }}
            </span>
          </div>
          <p class="text-sm text-ink-500 mt-1">
            {{ product.style || '—' }} / {{ product.substyle || '—' }}
          </p>
        </div>
      </div>

      <!-- Statistik penjualan -->
      <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-ok-500"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Total Terjual</p>
          <p class="text-[28px] leading-none font-semibold text-ok-600">
            {{ totalQty }} <span class="text-sm font-normal text-ink-400">unit</span>
          </p>
        </div>

        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Jumlah Transaksi</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ productSales.length }}</p>
        </div>

        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Total Pendapatan</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ formatPrice(revenue) }}</p>
        </div>

        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-warn-400"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Terakhir Terjual</p>
          <p class="text-[15px] leading-tight font-semibold text-ink-900 mt-2">
            {{ lastSale ? formatDateTime(lastSale.soldAt) : '—' }}
          </p>
        </div>
      </div>

      <!-- Informasi produk -->
      <div class="mb-6 bg-white rounded-card shadow-card border border-ink-100 p-5">
        <h3 class="text-base font-semibold text-ink-900 mb-4">Informasi Produk</h3>
        <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Designer</dt>
            <dd class="text-ink-800 font-medium">{{ product.designer || '—' }}</dd>
          </div>
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Tanggal Dibuat</dt>
            <dd class="text-ink-800 font-medium">{{ product.date ? formatDateTime(product.date) : '—' }}</dd>
          </div>
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Tanggal Upload ke Platform</dt>
            <dd class="text-ink-800 font-medium">{{ product.uploadDate ? formatDateTime(product.uploadDate) : '—' }}</dd>
          </div>
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Status Produksi</dt>
            <dd class="text-ink-800 font-medium">{{ product.productionStatus || '—' }}</dd>
          </div>
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Platform</dt>
            <dd class="text-ink-800 font-medium">{{ product.platform || '—' }}</dd>
          </div>
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Harga</dt>
            <dd class="text-ink-800 font-medium tabular-nums">
              {{ product.price ? formatPrice(product.price) : '—' }}
            </dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <dt class="text-[13px] text-ink-500 mb-1.5">Paket Produk</dt>
            <dd v-if="product.packages && product.packages.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div
                v-for="pk in product.packages"
                :key="pk.id"
                class="rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium text-ink-800 text-[13.5px]">{{ pk.name }}</span>
                  <span class="text-ink-700 text-[13px] font-medium tabular-nums shrink-0">{{ formatPrice(pk.price) }}</span>
                </div>
                <p v-if="pk.description" class="text-[12px] text-ink-500 mt-1">{{ pk.description }}</p>
              </div>
            </dd>
            <dd v-else class="text-ink-300">—</dd>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <dt class="text-[13px] text-ink-500 mb-0.5">Link DB</dt>
            <dd class="font-medium">
              <div v-if="links.length" class="flex flex-wrap gap-x-5 gap-y-1.5">
                <a
                  v-for="(link, i) in links"
                  :key="i"
                  :href="link"
                  :title="link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {{ links.length > 1 ? `Buka Dropbox ${i + 1}` : 'Buka Dropbox' }}
                </a>
              </div>
              <span v-else class="text-ink-300">—</span>
            </dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <dt class="text-[13px] text-ink-500 mb-0.5">Catatan</dt>
            <dd class="text-ink-700">{{ product.note || '—' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Riwayat penjualan -->
      <div class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-ink-900">Riwayat Penjualan</h3>
            <p class="text-[13px] text-ink-500 mt-0.5">Siapa yang membeli produk ini, berapa banyak, dan kapan.</p>
          </div>

          <!-- Cari -->
          <div v-if="productSales.length" class="relative w-full lg:w-72 shrink-0">
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
              v-model="saleSearchQuery"
              type="text"
              placeholder="Cari pembeli, platform, atau paket..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm transition text-ink-800"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-cream-100 text-ink-500 border-b border-ink-100">
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap w-12">No</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[180px]">Pembeli</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[110px]">Platform</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[140px]">Paket</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap min-w-[100px]">Total</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Tanggal &amp; Jam Terjual</th>
                <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap w-24">Aksi</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(sale, index) in filteredSales"
                :key="sale.id"
                class="border-b border-ink-50 hover:bg-cream-50/70 transition"
              >
                <td class="px-4 py-4 text-ink-400">{{ index + 1 }}</td>
                <td class="px-4 py-4 font-medium text-ink-800">{{ sale.buyer }}</td>
                <td class="px-4 py-4 text-ink-600">{{ sale.platform || '—' }}</td>
                <td class="px-4 py-4">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium',
                      sale.package ? 'bg-cream-100 text-ink-700' : 'bg-ink-50 text-ink-500'
                    ]"
                  >
                    {{ sale.package || 'Satuan' }}
                  </span>
                  <span v-if="sale.qty > 1" class="ml-1.5 text-ink-400 tabular-nums text-[13px]">×{{ sale.qty }}</span>
                </td>
                <td class="px-4 py-4 text-right text-ink-700 font-medium tabular-nums">
                  {{ formatPrice((product.price || 0) * sale.qty) }}
                </td>
                <td class="px-4 py-4 text-ink-500 text-[13px]">{{ formatDateTime(sale.soldAt) }}</td>
                <td class="px-4 py-4 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      @click="openEditSale(sale)"
                      class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition"
                      title="Edit transaksi"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="removeSaleRow(sale)"
                      class="p-1.5 rounded-lg hover:bg-danger-50 text-danger-600 transition"
                      title="Hapus transaksi"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredSales.length === 0">
                <td colspan="7" class="px-4 py-14 text-center text-ink-400">
                  <template v-if="productSales.length === 0">
                    Belum ada penjualan. Klik <strong>Catat Penjualan</strong> untuk menambahkan pembeli pertama.
                  </template>
                  <template v-else>
                    Tidak ada transaksi yang cocok dengan pencarian.
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==================== PRODUK TIDAK DITEMUKAN ==================== -->
    <div v-else class="bg-white rounded-card shadow-card border border-ink-100 px-6 py-16 text-center">
      <p class="text-ink-800 font-medium mb-1">Produk tidak ditemukan</p>
      <p class="text-sm text-ink-500 mb-5">Produk ini mungkin sudah dihapus.</p>
      <button
        @click="goBack"
        class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
      >
        Kembali ke Kategori
      </button>
    </div>

    <!-- ==================== MODAL EDIT PRODUK ==================== -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="closeEditModal"></div>

        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100">
            <h2 class="text-lg font-semibold text-ink-900">Edit Produk</h2>
            <button
              @click="closeEditModal"
              class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition"
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
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Gambar Produk</label>
              <div class="flex items-center gap-4">
                <div class="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-ink-200 bg-cream-100 flex items-center justify-center">
                  <img v-if="editForm.image" :src="editForm.image" alt="Pratinjau gambar" class="w-full h-full object-cover" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <div class="flex flex-col items-start gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition cursor-pointer">
                      {{ editForm.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
                      <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
                    </label>
                    <button
                      v-if="editForm.image"
                      type="button"
                      @click="clearImage"
                      class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                  <p v-if="imageError" class="text-xs text-danger-600">{{ imageError }}</p>
                  <p v-else class="text-xs text-ink-400">JPG, PNG, atau WEBP. Ukuran otomatis diperkecil.</p>
                </div>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Produk</label>
              <input v-model="editForm.name" type="text" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Style</label>
              <OptionSelect v-model="editForm.style" :options="optionsOf('style')" placeholder="Pilih style" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Substyle</label>
              <select
                v-model="editForm.substyle"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih substyle</option>
                <option v-for="sub in substyleOptions" :key="sub" :value="sub">{{ sub }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Designer</label>
              <select
                v-model="editForm.designer"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih designer</option>
                <option v-for="d in designerOptions" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Status Produksi</label>
              <select
                v-model="editForm.productionStatus"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih status produksi</option>
                <option v-for="s in productionStatusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal Dibuat</label>
              <input v-model="editForm.date" type="datetime-local" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal Upload ke Platform</label>
              <input v-model="editForm.uploadDate" type="datetime-local" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Platform</label>
              <PlatformPicker v-model="editForm.platform" :options="optionsOf('platform')" />
            </div>

            <div class="sm:col-span-2">
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-ink-700">Link DB</label>
                <button
                  type="button"
                  @click="addLinkField"
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
                    class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                    :placeholder="`https://www.dropbox.com/... (link ${i + 1})`"
                  />
                  <button
                    v-if="editForm.linkDbs.length > 1"
                    type="button"
                    @click="removeLinkField(i)"
                    class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition"
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
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Harga ($)</label>
              <input v-model.number="editForm.price" type="number" min="0" step="0.5" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition" placeholder="0.00" />
            </div>

            <div class="sm:col-span-2">
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-ink-700">Paket Produk</label>
                <button
                  type="button"
                  @click="addPackageField"
                  class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Paket
                </button>
              </div>
              <p class="text-xs text-ink-400 mb-2">Isi paket disesuaikan dengan yang ditawarkan ke client di tiap platform jualan.</p>
              <div class="space-y-2">
                <div v-for="(pkg, i) in editForm.packages" :key="i" class="flex items-start gap-2 rounded-xl border border-ink-200 p-3">
                  <div class="flex-1 space-y-2">
                    <div class="flex gap-2">
                      <input
                        v-model="pkg.name"
                        type="text"
                        class="flex-1 px-3 py-2 rounded-lg border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                        placeholder="Nama paket, mis. Basic"
                      />
                      <input
                        v-model.number="pkg.price"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-28 px-3 py-2 rounded-lg border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                        placeholder="Harga"
                      />
                    </div>
                    <textarea
                      v-model="pkg.description"
                      rows="2"
                      class="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-brand-400 outline-none text-sm transition resize-none"
                      placeholder="Isi paket, mis. Model + texture, tanpa rig"
                    ></textarea>
                  </div>
                  <button
                    type="button"
                    @click="removePackageField(i)"
                    class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition shrink-0"
                    title="Hapus paket"
                    aria-label="Hapus paket"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p v-if="editForm.packages.length === 0" class="text-[12px] text-ink-400">Belum ada paket. Klik "Tambah Paket" untuk menambahkan.</p>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Catatan</label>
              <textarea v-model="editForm.note" rows="2" class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition resize-none" placeholder="Catatan tambahan..."></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 bg-cream-50 rounded-b-2xl">
            <button
              @click="closeEditModal"
              class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-white text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              @click="submitEdit"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== KONFIRMASI HAPUS PRODUK ==================== -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="showDeleteConfirm = false"></div>

        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 class="text-lg font-semibold text-ink-900 mb-1">Hapus produk ini?</h2>
          <p class="text-sm text-ink-500 mb-6">
            <span class="font-medium text-ink-700">{{ product?.name }}</span> akan dihapus<template v-if="productSales.length > 0"> beserta {{ productSales.length }} transaksi penjualannya</template>. Tindakan ini tidak bisa dibatalkan.
          </p>

          <div class="flex justify-end gap-3">
            <button
              @click="showDeleteConfirm = false"
              class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              @click="confirmDelete"
              class="px-5 py-2.5 rounded-xl bg-danger-600 hover:opacity-90 text-white text-sm font-medium transition shadow-sm"
            >
              Hapus Produk
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== MODAL CATAT PENJUALAN ==================== -->
    <Teleport to="body">
      <div v-if="showSaleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="closeSaleModal"></div>

        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100">
            <h2 class="text-lg font-semibold text-ink-900">{{ isEditingSale ? 'Edit Penjualan' : 'Catat Penjualan' }}</h2>
            <button
              @click="closeSaleModal"
              class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition"
              aria-label="Tutup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Pembeli</label>
              <input
                v-model="saleForm.buyer"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Nama / username pembeli"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Paket (opsional)</label>
              <input
                v-model="saleForm.package"
                type="text"
                list="package-options"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                :placeholder="product.packages?.length ? 'Pilih paket, atau kosongkan kalau satuan' : 'Dijual satuan, kosongkan saja'"
              />
              <datalist id="package-options">
                <option v-for="pk in product.packages" :key="pk.id" :value="pk.name" />
              </datalist>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Platform</label>
              <input
                v-model="saleForm.platform"
                type="text"
                list="platform-options"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Booth / Etsy"
              />
              <datalist id="platform-options">
                <option v-for="plat in optionsOf('platform')" :key="plat" :value="plat" />
              </datalist>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal &amp; Jam Terjual</label>
              <input
                v-model="saleForm.soldAt"
                type="datetime-local"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 bg-cream-50 rounded-b-2xl">
            <button
              @click="closeSaleModal"
              class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-white text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              @click="submitSale"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
            >
              {{ isEditingSale ? 'Simpan Perubahan' : 'Simpan Penjualan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProducts, formatDateTime, formatPrice, nowLocal, normalizeUrl } from '../composables/useProducts'
import { fileToCompressedDataUrl } from '../utils/imageFile'
import { getLinks, cleanLinks } from '../utils/links'
import { useOptions } from '../composables/useOptions'
import { useTeamMembers } from '../composables/useTeamMembers'
import OptionSelect from '../components/OptionSelect.vue'
import PlatformPicker from '../components/PlatformPicker.vue'

const route = useRoute()
const router = useRouter()
const { products, getProduct, salesOf, totalSold, isSold, addSale, removeSale, updateSale, updateProduct, removeProduct } = useProducts()
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

// ========== DATA ==========
const product = computed(() => getProduct(route.params.id))
const productSales = computed(() => salesOf(route.params.id))
const totalQty = computed(() => totalSold(route.params.id))
const sold = computed(() => isSold(route.params.id))
const lastSale = computed(() => productSales.value[0] || null) // sudah diurutkan terbaru
const revenue = computed(() => totalQty.value * (product.value?.price || 0))
const links = computed(() => getLinks(product.value))

// ========== PENCARIAN RIWAYAT PENJUALAN ==========
const saleSearchQuery = ref('')
const filteredSales = computed(() => {
  const q = saleSearchQuery.value.toLowerCase().trim()
  if (!q) return productSales.value
  return productSales.value.filter(sale =>
    (sale.buyer || '').toLowerCase().includes(q) ||
    (sale.platform || '').toLowerCase().includes(q) ||
    (sale.package || '').toLowerCase().includes(q)
  )
})

function goBack() {
  const style = product.value?.style?.trim()
  if (style) {
    // Langsung kembali ke list produk di kategori yang sesuai
    router.push(`/kategori/${encodeURIComponent(style)}`)
  } else if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/kategori')
  }
}

// ========== MODAL CATAT / EDIT PENJUALAN ==========
const showSaleModal = ref(false)
const saleForm = ref({ buyer: '', package: '', platform: '', soldAt: '' })
const editingSaleId = ref(null)
const editingSaleQty = ref(1)
const isEditingSale = computed(() => editingSaleId.value !== null)

// Pastikan nilai cocok untuk <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
function toInputValue(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16)
  const d = new Date(value)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openSaleModal() {
  editingSaleId.value = null
  saleForm.value = { buyer: '', package: '', platform: '', soldAt: nowLocal() }
  showSaleModal.value = true
}

function openEditSale(sale) {
  editingSaleId.value = sale.id
  editingSaleQty.value = sale.qty || 1
  saleForm.value = {
    buyer: sale.buyer || '',
    package: sale.package || '',
    platform: sale.platform || '',
    soldAt: toInputValue(sale.soldAt)
  }
  showSaleModal.value = true
}

function closeSaleModal() {
  showSaleModal.value = false
  editingSaleId.value = null
}

// Simpan hasil edit transaksi.
// Kalau useProducts sudah punya updateSale(id, data), itu yang dipakai.
// Kalau belum, transaksi lama diganti: hapus yang lama lalu simpan versi barunya.
async function saveSaleEdit(id, payload) {
  if (typeof updateSale === 'function') {
    await updateSale(id, payload)
  } else {
    await removeSale(id)
    await addSale(route.params.id, payload)
  }
}

async function submitSale() {
  if (!saleForm.value.buyer.trim()) {
    alert('Nama Pembeli wajib diisi')
    return
  }
  // Paket opsional: produk yang dijual satuan (tanpa paket) boleh kosongin ini.
  if (!saleForm.value.soldAt) {
    alert('Tanggal & jam terjual wajib diisi')
    return
  }

  const data = {
    buyer: saleForm.value.buyer.trim(),
    package: saleForm.value.package.trim(),
    platform: saleForm.value.platform.trim(),
    soldAt: saleForm.value.soldAt
  }

  if (isEditingSale.value) {
    // qty transaksi dipertahankan seperti semula
    await saveSaleEdit(editingSaleId.value, { ...data, qty: editingSaleQty.value })
  } else {
    // satu transaksi = 1 unit terjual (agar total & pendapatan tetap terhitung)
    addSale(route.params.id, { ...data, qty: 1 })
  }
  closeSaleModal()
}

function removeSaleRow(sale) {
  if (confirm(`Hapus transaksi dari "${sale.buyer}"?`)) {
    removeSale(sale.id)
  }
}

// ========== EDIT PRODUK ==========
const showEditModal = ref(false)
const editForm = ref({})
const imageError = ref('')

function openEditModal() {
  const p = product.value
  if (!p) return
  editForm.value = {
    image: p.image || '',
    name: p.name || '',
    style: p.style || '',
    substyle: p.substyle || '',
    designer: p.designer || '',
    date: p.date || '',              // Tanggal Dibuat
    uploadDate: p.uploadDate || '',  // Tanggal Upload ke Platform
    productionStatus: p.productionStatus || '',
    platform: p.platform || '',
    linkDbs: getLinks(p).length ? getLinks(p) : [''], // bisa lebih dari satu link
    price: p.price || 0,
    note: p.note || '',
    packages: (p.packages || []).map((pk) => ({ ...pk }))
  }
  imageError.value = ''
  showEditModal.value = true
}

function addPackageField() {
  editForm.value.packages.push({ name: '', price: 0, description: '' })
}

function removePackageField(index) {
  editForm.value.packages.splice(index, 1)
}

function closeEditModal() {
  showEditModal.value = false
}

async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // supaya file yang sama bisa dipilih ulang
  if (!file) return
  try {
    editForm.value.image = await fileToCompressedDataUrl(file)
    imageError.value = ''
  } catch (err) {
    imageError.value = err.message
  }
}

function clearImage() {
  editForm.value.image = ''
  imageError.value = ''
}

function addLinkField() {
  editForm.value.linkDbs.push('')
}

function removeLinkField(index) {
  editForm.value.linkDbs.splice(index, 1)
  if (editForm.value.linkDbs.length === 0) editForm.value.linkDbs.push('')
}

function submitEdit() {
  if (!editForm.value.name.trim()) {
    alert('Nama Produk wajib diisi')
    return
  }

  const cleaned = cleanLinks(editForm.value.linkDbs, normalizeUrl)

  updateProduct(product.value.id, {
    image: editForm.value.image,
    name: editForm.value.name.trim(),
    style: editForm.value.style.trim(),
    substyle: editForm.value.substyle.trim(),
    designer: editForm.value.designer.trim(),
    date: editForm.value.date,
    uploadDate: editForm.value.uploadDate,
    productionStatus: editForm.value.productionStatus.trim(),
    platform: editForm.value.platform.trim(),
    linkDb: cleaned[0] || '', // link pertama, supaya kompatibel dengan data lama
    linkDbs: cleaned,
    price: editForm.value.price || 0,
    note: editForm.value.note.trim(),
    packages: editForm.value.packages
  })
  closeEditModal()
}

// ========== HAPUS PRODUK ==========
const showDeleteConfirm = ref(false)

async function confirmDelete() {
  const id = product.value?.id
  const style = product.value?.style?.trim()
  showDeleteConfirm.value = false
  if (id == null) return

  // Pindah halaman dulu supaya tidak sempat muncul "Produk tidak ditemukan"
  if (style) {
    await router.replace(`/kategori/${encodeURIComponent(style)}`)
  } else {
    await router.replace('/kategori')
  }
  removeProduct(id)
}

// Kalau dibuka dari tombol centang di List Produk (?jual=1), langsung buka form
onMounted(() => {
  if (route.query.jual && product.value) {
    openSaleModal()
    router.replace({ path: route.path }) // bersihkan query
  }
})
</script>