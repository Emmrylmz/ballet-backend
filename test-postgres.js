import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Use the default postgres database
  password: 'postgres123',
  port: 5432,
});

try {
  const client = await pool.connect();
  const result = await client.query('SELECT NOW() as current_time');
  console.log('✅ SUCCESS! Connected to PostgreSQL');
  console.log('Current time:', result.rows[0].current_time);
  client.release();
  await pool.end();
} catch (error) {
  console.log('❌ Connection failed:', error.message);
  console.log('Error code:', error.code);
}