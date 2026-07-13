const fs = require('fs/promises');
const path = require('path');

const db = require('../../lib/db');

const startViewRequest = require(
  '../requests/start'
);

const completeViewRequest = require(
  '../requests/complete'
);

const failViewRequest = require(
  '../requests/fail'
);

const {
  reportError,
} = require('../../lib/report-error');

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
  const sql = await fs.readFile(sqlPath, 'utf8');

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
  console.log('[CLIENTS ACTION] Executing CREATE');

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
  console.log('[CLIENTS ACTION] Executing UPDATE');

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
  console.log('[CLIENTS ACTION] Executing DELETE');

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
  publicRequestId,
  viewKey,
  userId,
  route,
  method,
}) {
  const results = [];

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index];

    const operation = String(
      change?.operation || ''
    )
      .trim()
      .toLowerCase();

    console.log(
      `[CLIENTS ACTION] Operation ${index + 1}/${changes.length}: ${operation}`
    );

    try {
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
    } catch (error) {
      console.error(
        `[CLIENTS ACTION] Change failed ${index + 1}/${changes.length}:`,
        error
      );

      await failViewRequest(
        requestId,
        error.message
      );

      await reportError({
        error,
        source: 'background_action',
        route,
        method,
        actionKey: 'clients_save',
        viewKey,
        requestId: publicRequestId,
        viewRequestId: requestId,
        userId,
        teamMemberId,
        changeIndex: index,
        operation,
        entityId:
          change?.id ||
          change?.temp_id ||
          null,
        payload: change,
        context: {
          total_changes: changes.length,
        },
      });

      return null;
    }
  }

  await completeViewRequest(requestId);

  console.log(
    `[CLIENTS ACTION] Background completed: ${requestId}`
  );

  return results;
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
      req.body?.view_key ||
      'sales_clients'
    ).trim();

    const viewRequest =
      await startViewRequest({
        teamMemberId,
        viewKey,
        actionKey: 'clients_save',
        payload: req.body,
      });

    res.status(202).json({
      ok: true,
      accepted: true,
      request_id:
        viewRequest.request_id,
    });

    setImmediate(() => {
      void processChanges({
        changes,
        teamMemberId,
        requestId:
          viewRequest.id,
        publicRequestId:
          viewRequest.request_id,
        viewKey,
        userId:
          req.user?.id || null,
        route:
          req.originalUrl,
        method:
          req.method,
      });
    });
  } catch (error) {
    console.error(
      '[CLIENTS ACTION] Failed to accept request:',
      error
    );

    await reportError({
      error,
      source: 'route_handler',
      route: req.originalUrl,
      method: req.method,
      actionKey: 'clients_save',
      viewKey:
        req.body?.view_key ||
        'sales_clients',
      userId:
        req.user?.id || null,
      teamMemberId:
        req.context?.team_member_id ||
        null,
      payload:
        req.body || null,
    });

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: 'CLIENTS_ACTION_FAILED',
      });
    }
  }
}

module.exports = clientsSaveHandler;