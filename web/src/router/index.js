// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { useAuth } from '../composables/useAuth'

const routes = [
  // Halaman login (di luar layout dashboard)
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { public: true, title: 'Masuk' },
  },
  {
    path: '/',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/Ringkasan.vue'),
        meta: { title: 'Ringkasan', subtitle: 'Ringkasan pesanan, produk, penjualan, dan pendapatan' },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('../views/Orders.vue'),
        meta: { title: 'Semua Pesanan', subtitle: 'Cari, tambah, dan kelola seluruh pesanan desain' },
      },
      {
        path: 'orders/:id',
        name: 'order-detail',
        component: () => import('../views/OrderDetail.vue'),
        meta: { title: 'Detail Pesanan', subtitle: 'Lihat dan perbarui detail satu pesanan' },
      },
      // ===== Detail Produk (tetap ada, tapi tidak ada List Produk global) =====
      {
        path: 'produk/:id',
        name: 'produk-detail',
        component: () => import('../views/Productdetail.vue'),
        meta: { title: 'Detail Produk', subtitle: 'Lihat pembeli, jumlah terjual, dan waktu penjualan produk' },
      },
      // ===== Route Kategori =====
      {
        path: 'kategori',
        name: 'kategori',
        component: () => import('../views/ProdukKategori.vue'),
        meta: { title: 'Kategori Produk', subtitle: 'Produk dikelompokkan berdasarkan Style dan Substyle' },
      },
      {
        path: 'kategori/:name',
        name: 'kategori-detail',
        component: () => import('../views/KategoriDetail.vue'),
        meta: { title: 'Isi Kategori', subtitle: 'Daftar produk dalam kategori' },
      },
      {
        path: 'pengaturan',
        name: 'pengaturan',
        component: () => import('../views/Pengaturan.vue'),
        meta: { title: 'Pengaturan', subtitle: 'Kelola username dan kata sandi untuk masuk dashboard' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Penjaga halaman: belum masuk → ke /login, sudah masuk → jangan buka /login lagi
router.beforeEach((to) => {
  const { isLoggedIn } = useAuth()

  if (to.meta.public) {
    return isLoggedIn.value && to.name === 'login' ? '/' : true
  }

  if (!isLoggedIn.value) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  return true
})

export default router