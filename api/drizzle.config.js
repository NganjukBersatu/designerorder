/** @type {import('drizzle-kit').Config} */
export default {
  schema: './src/db/schema.js', // Sesuaikan dengan lokasi file schema Drizzle Anda
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};