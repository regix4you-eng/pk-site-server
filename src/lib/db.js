const { Pool } = require('pg');

const env = require('../config/env');

const db = new Pool({
  connectionString: env.databaseUrl,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

db.on('error', (error) => {
  console.error(
    '[DB] Unexpected pool error:',
    error
  );
});

module.exports = db;