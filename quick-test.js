import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ballet_management',
  password: 'postgres123',
  port: 5432,
});

try {
  const client = await pool.connect();
  const result = await client.query('SELECT NOW() as current_time, version()');
  console.log('✅ SUCCESS! Connected to PostgreSQL');
  console.log('Current time:', result.rows[0].current_time);
  console.log('Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
  client.release();
  await pool.end();
} catch (error) {
  console.log('❌ Connection failed:', error.message);
  console.log('Error details:', error.code);
}