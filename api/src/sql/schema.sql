-- Skema ini dibuat OTOMATIS oleh api/src/config/db.js saat server dijalankan.
-- File ini hanya untuk referensi / kalau mau menjalankan manual lewat psql.

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_date DATE NOT NULL,
  designer_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  character_type VARCHAR(100) NOT NULL,
  style VARCHAR(100) NOT NULL,
  total_order INTEGER NOT NULL DEFAULT 1,
  buyer_name VARCHAR(150) NOT NULL,
  buyer_reference VARCHAR(255),
  store_name VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Progress', 'Done')),
  completion_date DATE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
