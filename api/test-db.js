import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function testConnection() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'terbaca (' + process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') + ')' : 'TIDAK TERBACA');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Mencoba konek ke database...');
    await client.connect();
    console.log('✅ Berhasil konek ke database!');

    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('Tabel yang ada:', tables.rows.map(r => r.table_name));

    await client.end();
  } catch (err) {
    console.error('❌ Gagal konek:', err.message);
    process.exit(1);
  }
}

testConnection();