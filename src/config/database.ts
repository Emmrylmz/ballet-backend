// This file is deprecated in favor of DatabaseService
// Import DatabaseService from '../services/DatabaseService' instead

import { Pool } from 'pg';
import config from './index.js';

// Legacy pool for backward compatibility during migration
const pool = new Pool(config.database);

export default pool;
