const fs = require('fs/promises');
const path = require('path');

const db = require('../../lib/db');

const startViewRequest = require(
  '../requests/start'
);

const completeViewRequest = require(
  '../requests/complete'
);

const CREATE_SQL_PATH = path.join(
  __dirname,
  'create.sql'
);

const UPDATE_SQL_PATH = path.join(
  __dirname,
  'update.sql'
);

const DELETE_SQL_PATH = path.join(
  __dirname,
  'delete.sql'
);

async function executeSql({
  sqlPath,
  change,
  teamMemberId,
}) {
  const sql = await fs.readFile(
    sqlPath,
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

async function executeCreate({
  change,
  teamMemberId,
}) {
  console.log(
    '[CLIENTS ACTION] Executing CREATE'
  );

  return executeSql({
    sqlPath: CREATE_SQL_PATH,
    change,
    teamMemberId,
  });
}

async function executeUpdate({
  change,
  teamMemberId,
}) {
  console.log(
    '[CLIENTS ACTION] Executing UPDATE'
  );

  return executeSql({
    sqlPath: UPDATE_SQL_PATH,
    change,
    teamMemberId,
  });
}

async function executeDelete({
  change,
  teamMemberId,
}) {
  console.log(
    '[CLIENTS ACTION] Executing DELETE'
  );

  return executeSql({
    sqlPath: DELETE_SQL_PATH,
    change,
    teamMemberId,
  });
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
        change?.operation || ''
      )
        .trim()
        .toLowerCase();

      console.log(
        `[CLIENTS ACTION] Operation: ${operation}`
      );

      switch (operation) {
        case 'create': {
          const result = await executeCreate({
            change,
            teamMemberId,
          });

          results.push({
            operation,
            result,
          });

          break;
        }

        case 'update': {
          const result = await executeUpdate({
            change,
            teamMemberId,
          });

          results.push({
            operation,
            result,
          });

          break;
        }

        case 'delete': {
          const result = await executeDelete({
            change,
            teamMemberId,
          });

          results.push({
            operation,
            result,
          });

          break;
        }

        default:
          throw new Error(
            `UNKNOWN_CLIENT_OPERATION: ${operation}`
          );
      }
    }

    await completeViewRequest(requestId);

    console.log(
      `[CLIENTS ACTION] Background completed: ${requestId}`
    );

    return results;
  } catch (error) {
    console.error(
      `[CLIENTS ACTION] Background failed: ${requestId}`,
      error
    );

    // Kol kas paliekam running.
    // Po expires_at requestas nustos blokuoti view.
    return null;
  }
}

async function clientsSaveHandler(req, res) {
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
      req.body?.view_key || 'sales_clients'
    ).trim();

    // 1. Sukuriam running view_request
    const viewRequest =
      await startViewRequest({
        teamMemberId,
        viewKey,
        actionKey: 'clients_save',
        payload: req.body,
      });

    // 2. Iškart atsakom frontendui
    res.status(202).json({
      ok: true,
      accepted: true,
      request_id: viewRequest.request_id,
    });

    // 3. Create / update / delete vyksta background'e
    setImmediate(() => {
      void processChanges({
        changes,
        teamMemberId,
        requestId: viewRequest.id,
      });
    });
  } catch (error) {
    console.error(
      '[CLIENTS ACTION] Failed to accept request:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: 'CLIENTS_ACTION_FAILED',
      });
    }
  }
}

module.exports = clientsSaveHandler;