const fs = require('fs/promises');
const path = require('path');

const db = require('../../lib/db');

const startViewRequest = require(
  '../requests/start'
);

const completeViewRequest = require(
  '../requests/complete'
);

const UPDATE_SQL_PATH = path.join(
  __dirname,
  'update.sql'
);

async function executeUpdate({
  change,
  teamMemberId,
}) {
  console.log(
    '[SERVICES ACTION] Executing UPDATE'
  );

  const sql = await fs.readFile(
    UPDATE_SQL_PATH,
    'utf8'
  );

  const result = await db.query(
    sql,
    [
      JSON.stringify(change),
      teamMemberId,
    ]
  );

  return result.rows[0] || null;
}

async function processChanges({
  changes,
  teamMemberId,
  requestId,
}) {
  try {
    const results = [];

    for (const change of changes) {
      const operation = String(
        change?.operation || 'update'
      )
        .trim()
        .toLowerCase();

      if (operation !== 'update') {
        throw new Error(
          `UNSUPPORTED_SERVICE_OPERATION: ${operation}`
        );
      }

      const result = await executeUpdate({
        change,
        teamMemberId,
      });

      results.push({
        operation,
        result,
      });
    }

    await completeViewRequest(requestId);

    console.log(
      `[SERVICES ACTION] Background completed: ${requestId}`
    );

    return results;
  } catch (error) {
    console.error(
      `[SERVICES ACTION] Background failed: ${requestId}`,
      error
    );

    // Kol kas lieka running.
    // Po expires_at nustos blokuoti view.
    return null;
  }
}

async function servicesSaveHandler(req, res) {
  try {
    const changes = req.body?.changes;

    if (!Array.isArray(changes)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CHANGES',
      });
    }

    if (changes.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'EMPTY_CHANGES',
      });
    }

    const teamMemberId =
      req.context?.team_member_id;

    if (!teamMemberId) {
      return res.status(500).json({
        ok: false,
        error: 'TEAM_MEMBER_CONTEXT_MISSING',
      });
    }

    const viewKey = String(
      req.body?.view_key || 'services'
    ).trim();

    // 1. Sukuriam running view_request
    const viewRequest =
      await startViewRequest({
        teamMemberId,
        viewKey,
        actionKey: 'services_save',
        payload: req.body,
      });

    // 2. Iškart atsakom frontendui
    res.status(202).json({
      ok: true,
      accepted: true,
      request_id: viewRequest.request_id,
    });

    // 3. Update'ai vyksta background'e
    setImmediate(() => {
      void processChanges({
        changes,
        teamMemberId,
        requestId: viewRequest.id,
      });
    });
  } catch (error) {
    console.error(
      '[SERVICES ACTION] Failed to accept request:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: 'SERVICES_ACTION_FAILED',
      });
    }
  }
}

module.exports = servicesSaveHandler;