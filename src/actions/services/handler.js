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

const UPDATE_SQL_PATH = path.join(
  __dirname,
  'update.sql'
);

async function executeUpdate({
  change,
  teamMemberId,
}) {
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
  publicRequestId,
  viewKey,
  userId,
  route,
  method,
}) {
  const results = [];

  for (
    let index = 0;
    index < changes.length;
    index += 1
  ) {
    const change = changes[index];

    const operation = String(
      change?.operation || 'update'
    )
      .trim()
      .toLowerCase();

    console.log(
      `[SERVICES ACTION] Operation ${index + 1}/${changes.length}: ${operation}`
    );

    try {
      if (operation !== 'update') {
        throw new Error(
          `UNKNOWN_SERVICE_OPERATION: ${operation}`
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
    } catch (error) {
      console.error(
        `[SERVICES ACTION] Change failed ${index + 1}/${changes.length}:`,
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
        actionKey: 'services_save',
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

  await completeViewRequest(
    requestId
  );

  console.log(
    `[SERVICES ACTION] Background completed: ${requestId}`
  );

  return results;
}

async function servicesSaveHandler(req, res) {
  try {
    const rawChanges =
      req.body?.changes;

    const changes = Array.isArray(rawChanges)
      ? rawChanges
      : rawChanges
        ? [rawChanges]
        : [];

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
      'services'
    ).trim();

    const viewRequest =
      await startViewRequest({
        teamMemberId,
        viewKey,
        actionKey: 'services_save',
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
      '[SERVICES ACTION] Failed to accept request:',
      error
    );

    await reportError({
      error,
      source: 'route_handler',
      route: req.originalUrl,
      method: req.method,
      actionKey: 'services_save',
      viewKey:
        req.body?.view_key ||
        'services',
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
        error: 'SERVICES_ACTION_FAILED',
      });
    }
  }
}

module.exports = servicesSaveHandler;