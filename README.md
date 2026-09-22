# Designer Orders

Ruang kerja produksi buat tim desain 3D (VRoid, VRChat, AR, dsb). Nyatet
pesanan custom dari buyer, kelola katalog produk yang dijual (lengkap sama
paket & riwayat penjualan), dan lacak tugas/service internal tim — semuanya
per tim, multi-tenant, dengan login asli.

Backend Express (JavaScript biasa) + PostgreSQL, frontend Vue 3 + Tailwind.

```
api/    → backend (Express + pg + JWT auth)
web/    → frontend (Vue 3 + Vite + Tailwind)
docker-compose.yml → PostgreSQL buat development
```

## 1. Siapkan database (Docker)

```bash
docker compose up -d
```

Ini bakal nyalain PostgreSQL di `localhost:5432` (user `postgres`, database
`designer_orders`). Password default ada di `docker-compose.yml` — kalau
kamu ganti di situ, samain juga di `api/.env`.

Semua tabel (`teams`, `users`, `orders`, `products`, `product_packages`,
`product_links`, `sales`, `tasks`, `task_links`, dst) **dibuat otomatis**
oleh backend saat pertama kali dijalankan — gak perlu migrasi manual. Kalau
mau lihat skemanya tanpa nyalain backend, cek `api/src/sql/schema.sql`
(dokumentasi, bukan yang beneran dieksekusi — yang jalan itu
`ensureSchema()` di `api/src/config/db.js`).

## 2. Jalankan backend (api/)

```bash
cd api
npm install
cp .env.example .env      # Mac/Linux — di Windows: copy .env.example .env
```

Buka `.env`, pastikan `DB_PASSWORD` cocok sama `docker-compose.yml`, dan isi
`JWT_SECRET` dengan string acak (dipakai buat nandatangan token login —
jangan dikosongin, apalagi di production).

```bash
npm run dev
```

Backend jalan di `http://localhost:3000`.

## 3. Jalankan frontend (web/)

Buka terminal baru:

```bash
cd web
npm install
npm run dev
```

Frontend jalan di `http://localhost:5173` (atau port lain yang ditampilkan)
dan otomatis meneruskan semua request `/api/...` ke backend di port 3000
(diatur di `vite.config.js`).

## 4. Login pertama kali

Belum ada akun bawaan. Buka `/login`, klik **"Buat tim baru"**, isi nama
tim + username + password — akun itu otomatis jadi **owner** tim tersebut.
Owner/admin bisa nambah anggota lain lewat **Pengaturan → Anggota Tim**.

## Konsep inti

- **Tim (multi-tenant)** — satu tim = satu workspace (mis. satu client).
  Semua data (order, produk, tugas) terikat ke `team_id`; tim lain gak akan
  pernah lihat data tim lain. Satu tim bisa punya banyak akun.
- **Role**: `owner` > `admin` > `member` (biasa). Role **cuma** ngatur siapa
  yang boleh tambah/hapus anggota tim — di luar itu (produk, order, tugas,
  kategori) semua role bebas akses penuh.
  - Owner: kelola siapa saja, gak bisa dihapus dari akunnya sendiri.
  - Admin: cuma boleh tambah/hapus anggota **biasa**.
  - Biasa: gak bisa kelola anggota sama sekali.

## Fitur

### Ringkasan (Dashboard)
Total pesanan & pendapatan, status pesanan, grafik pendapatan bulanan,
performa kategori, produk terlaris, penjualan terbaru, **ringkasan per
kategori produk**, dan daftar transaksi bulan berjalan (bisa diunduh CSV /
dicetak).

### Semua Pesanan (Orders)
Pesanan custom/komisi dari buyer. Bisa diisi manual (custom order) atau
**diambil dari produk katalog yang sudah ada** — kalau dari katalog,
Kategori/Style otomatis ikut, dan Paket-nya dropdown dari paket produk itu
(field Kategori/Jenis Karakter/Style disembunyikan karena udah otomatis).
Status: Menunggu / Dikerjakan / Selesai.

### Kategori & Produk
Produk dikelompokkan berdasarkan Style (jadi "Kategori" di sidebar).
Tiap produk punya:
- Gambar, Style, Substyle, Designer (dropdown dari anggota tim), tanggal
  dibuat & upload, Status Produksi, Platform (multi-pilih), harga, catatan.
- **Link DB** — bisa lebih dari satu link.
- **Paket** (`product_packages`) — satu produk bisa punya beberapa paket
  (nama, harga, isi/deliverable-nya sendiri-sendiri), sesuai yang
  ditawarkan di tiap platform jualan (mis. Etsy Paket A vs Paket B).
- **Riwayat penjualan** — tiap transaksi = 1 pembeli, 1 qty. Paket-nya
  opsional: kosongkan kalau dijual satuan, atau pilih dari paket yang
  sudah didaftarkan.

### Tugas
Kerjaan/service internal tim, terpisah dari produk yang dijual — dipakai
buat nyatet apa yang lagi dikerjain tim, prioritas sebelum bikin produk
sendiri. **Self-assign**: siapa pun di tim bisa bikin tugas buat dirinya
sendiri (atau assign ke designer lain lewat field Designer).

Field-nya sengaja disamakan dengan Produk — gambar, kategori, substyle,
designer, tanggal, status produksi, Link DB, catatan — **kecuali harga**
(tugas gak dijual) dan **platform** (tugas gak dipajang di marketplace).
Status kerjaannya sendiri: Menunggu / Dikerjakan / Selesai — klik badge
statusnya langsung buat gonta-ganti cepat.

Filter: "Tugas saya" vs "Semua tim", plus ringkasan jumlah per status.

### Pengaturan
- **Pilihan Produk** — Kategori/Style, Substyle, Designer, Status Produksi,
  Platform. Dipakai di form produk & filter.
- **Pilihan Tugas** — Kategori Tugas, Substyle Tugas, Status Produksi
  Tugas, Designer Tugas. **Terpisah total** dari Pilihan Produk (dua
  taksonomi yang beda konteks: jenis produk jualan vs jenis kerjaan/service).
- **Akun** — ganti username & kata sandi milik sendiri.
- **Anggota Tim** — lihat semua anggota tim, tambah/hapus (sesuai hak role).

## Struktur data (ringkas)

```
teams ─┬─ users (role: owner/admin/member)
       ├─ orders ── product_id (opsional, nyambung ke katalog)
       ├─ products ─┬─ product_links (Link DB, banyak)
       │            ├─ product_packages (paket per produk)
       │            └─ sales (riwayat penjualan)
       └─ tasks ──── task_links (Link DB, banyak)
```

## Catatan pengembangan

- `web/src/views/ListProduk.vue` ada di repo tapi **tidak terdaftar** di
  router (`web/src/router/index.js`) — halaman mati, gak bisa diakses lewat
  UI. Kalau memang dibutuhkan, tinggal daftarin route-nya; kalau enggak,
  aman buat dihapus.
- Backend selalu jalanin `ensureSchema()` tiap start — aman dipanggil
  berkali-kali (pakai `CREATE TABLE IF NOT EXISTS` + migrasi `ALTER TABLE
  ... IF NOT EXISTS`), jadi update skema baru otomatis ke-apply pas
  restart, gak perlu migrasi manual.
