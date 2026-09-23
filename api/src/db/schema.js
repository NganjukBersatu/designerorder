import { pgTable, serial, varchar, date, numeric, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderDate: date('order_date').notNull(),
  designerName: varchar('designer_name', { length: 150 }).notNull(),
  // ... sesuaikan kolom lainnya dengan tabel orders Anda
});