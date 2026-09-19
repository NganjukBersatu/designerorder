import { createRouter, createWebHistory } from 'vue-router'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const routes = [
  {
    path: '/',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: 'Ringkasan', subtitle: 'Ringkasan pesanan, status kerja, dan pendapatan' },
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
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
