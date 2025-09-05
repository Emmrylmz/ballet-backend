import { Pool } from 'pg';
import config from './index.js';
const pool = new Pool(config.database);
export default pool;
