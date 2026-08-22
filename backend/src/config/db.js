import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('[PostgreSQL] Conectado exitosamente a la base de datos abc_studio');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Error inesperado en el pool de conexión:', err);
  process.exit(-1);
});

export default pool;
