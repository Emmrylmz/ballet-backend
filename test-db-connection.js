import pg from 'pg';

const { Pool } = pg;

async function testConnection() {
  const configs = [
    {
      name: 'No password',
      config: {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres', 
        port: 5432,
      }
    },
    {
      name: 'Empty password',
      config: {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: '',
        port: 5432,
      }
    },
    {
      name: 'Password = postgres',
      config: {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
      }
    },
    {
      name: 'Correct credentials from .env',
      config: {
        user: 'postgres',
        host: 'localhost',
        database: 'ballet_management',
        password: 'postgres123',
        port: 5432,
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\nTesting: ${name}`);
    console.log('Config:', { ...config, password: config.password ? '***' : config.password });
    
    const pool = new Pool(config);
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ SUCCESS:', result.rows[0]);
      client.release();
      await pool.end();
      break; // Stop on first success
    } catch (error) {
      console.log('❌ FAILED:', error.message);
      try { await pool.end(); } catch (e) { /* ignore */ }
    }
  }
}

testConnection().catch(console.error);