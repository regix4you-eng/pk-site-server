const express = require('express');

const db = require('../lib/db');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'pk-site-core',
  });
});

router.get('/health/db', async (req, res) => {
  try {
    const result = await db.query(`
      select
        now() as database_time,
        current_database() as database_name
    `);

    return res.json({
      ok: true,
      database: result.rows[0],
    });
  } catch (error) {
    console.error('[DB] Connection test failed:', error);

    return res.status(500).json({
      ok: false,
      error: 'DATABASE_CONNECTION_FAILED',
      message: error.message,
    });
  }
});

module.exports = router;