# Designer Orders

Aplikasi manajemen pesanan jasa desain karakter. Backend Express (JavaScript
biasa) + PostgreSQL, frontend Vue 3 + Tailwind.

```
api/    → backend (Express + pg)
web/    → frontend (Vue 3 + Vite + Tailwind)
```

## 1. Siapkan database

Pastikan PostgreSQL sudah terpasang & menyala di komputer kamu, lalu buat
database kosong:

```sql
CREATE DATABASE designer_orders;
```

Tabel `orders` akan **dibuat otomatis** oleh backend saat pertama kali
dijalankan — tidak perlu migrasi manual.

## 2. Jalankan backend (api/)

```bash
cd api
npm install
copy .env.example .env      # Windows (atau: cp .env.example .env di Mac/Linux)
```

Buka file `.env`, isi `DB_PASSWORD` sesuai password PostgreSQL kamu (dan
`DB_USER`/`DB_NAME` kalau berbeda dari default). Lalu:

```bash
npm run dev
```

Backend akan jalan di `http://localhost:3000`.

## 3. Jalankan frontend (web/)

Buka terminal baru:

```bash
cd web
npm install
npm run dev
```

Frontend akan jalan di `http://localhost:5173` (atau port lain yang
ditampilkan di terminal) dan otomatis meneruskan semua request `/api/...`
ke backend di port 3000 (sudah diatur di `vite.config.js`).

## Fitur

- Dashboard: total pesanan, pendapatan, status, grafik pendapatan bulanan,
  performa kategori, pesanan terbaru
- Semua Pesanan: cari, filter status, tambah, edit, hapus
- Detail Pesanan: edit lengkap + ringkasan nilai
