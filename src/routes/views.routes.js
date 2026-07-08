const express = require('express');
const fs = require('fs/promises');

const db = require('../lib/db');

const requireAuth = require(
  '../middleware/auth.middleware'
);

const loadTeamMemberContext = require(
  '../middleware/team-member-context.middleware'
);

const waitForViewRequests = require(
  '../middleware/wait-for-view-requests.middleware'
);

const {
  getViewDefinition,
  viewRegistry,
} = require('../views/registry');

const router = express.Router();

// Testui: visi registruoti view'ai
router.get('/views', (req, res) => {
  return res.json({
    ok: true,
    source: 'node-core',
    views: Object.keys(viewRegistry),
  });
});

// Realus view requestas
router.get(
  '/views/:viewKey',

  requireAuth,

  loadTeamMemberContext,

  waitForViewRequests,

  async (req, res) => {
    try {
      const { viewKey } = req.params;

      console.log(`[VIEW] Received: ${viewKey}`);

      const view = getViewDefinition(viewKey);

      if (!view) {
        console.log(`[VIEW] Unknown: ${viewKey}`);

        return res.status(404).json({
          ok: false,
          error: 'VIEW_NOT_FOUND',
          view_key: viewKey,
        });
      }

      console.log(
        `[VIEW] Matched: ${view.directory}`
      );

      // 1. Perskaitom SQL
      const sql = await fs.readFile(
        view.queryPath,
        'utf8'
      );

      console.log(
        `[VIEW] Executing SQL: ${viewKey}`
      );

      // 2. Parametrus siunčiam tik jeigu SQL naudoja $1
      const usesTeamMemberId = /\$1\b/.test(sql);

      const params = usesTeamMemberId
        ? [req.context.team_member_id]
        : [];

      console.log(
        `[VIEW] SQL params: ${params.length}`
      );

      // 3. Vykdom SQL
      const result = await db.query(
        sql,
        params
      );

      const input = result.rows[0] || {};

      console.log(
        `[VIEW] SQL completed: ${viewKey}`
      );

      // 4. Užkraunam transformą
      const transformView = require(
        view.transformPath
      );

      // 5. Formuojam ui.v1 JSON
      const response = transformView(input);

      console.log(
        `[VIEW] Response built: ${viewKey}`
      );

      // 6. Grąžinam Base44
      return res.json(response);
    } catch (error) {
      console.error(
        '[VIEW] Execution failed:',
        error
      );

      return res.status(500).json({
        ok: false,
        error: 'VIEW_EXECUTION_FAILED',
        message: error.message,
      });
    }
  }
);

module.exports = router;