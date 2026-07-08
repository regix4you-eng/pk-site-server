const fs = require('fs/promises');
const path = require('path');

const db = require('../../lib/db');

const startViewRequest = require(
  '../requests/start'
);

const completeViewRequest = require(
  '../requests/complete'
);

const ACCEPT_SQL_PATH = path.join(
  __dirname,
  'accept.sql'
);

async function executeAccept({
  clientId,
  teamMemberId,
}) {
  console.log(
    `[SALES ACCEPT] Executing for client: ${clientId}`
  );

  const sql = await fs.readFile(
    ACCEPT_SQL_PATH,
    'utf8'
  );

  const result = await db.query(
    sql,
    [
      clientId,
      teamMemberId,
    ]
  );

  const row = result.rows[0] || null;

  if (!row) {
    throw new Error(
      'SALES_ACCEPT_EMPTY_RESULT'
    );
  }

  if (!row.ok) {
    throw new Error(
      row.error ||
      'SALES_ACCEPT_FAILED'
    );
  }

  return row;
}

async function processAccept({
  clientId,
  teamMemberId,
  requestId,
}) {
  try {
    const result = await executeAccept({
      clientId,
      teamMemberId,
    });

    await completeViewRequest(
      requestId
    );

    console.log(
      `[SALES ACCEPT] Background completed: ${requestId}`
    );

    return result;
  } catch (error) {
    console.error(
      `[SALES ACCEPT] Background failed: ${requestId}`,
      error
    );

    // Kol kas paliekam running.
    // Po expires_at requestas nustos blokuoti view.
    return null;
  }
}

async function salesAcceptHandler(req, res) {
  try {
    const clientId = String(
      req.body?.id ||
      req.body?.client_id ||
      ''
    ).trim();

    if (!clientId) {
      return res.status(400).json({
        ok: false,
        error: 'CLIENT_ID_REQUIRED',
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
      'sales_updates'
    ).trim();

    const viewRequest =
      await startViewRequest({
        teamMemberId,
        viewKey,
        actionKey: 'sales_accept',
        payload: req.body,
      });

    // Iškart atsakom frontendui
    res.status(202).json({
      ok: true,
      accepted: true,
      request_id:
        viewRequest.request_id,
    });

    // SQL vykdom background'e
    setImmediate(() => {
      void processAccept({
        clientId,
        teamMemberId,
        requestId: viewRequest.id,
      });
    });
  } catch (error) {
    console.error(
      '[SALES ACCEPT] Failed to accept request:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: 'SALES_ACCEPT_FAILED',
      });
    }
  }
}

module.exports = salesAcceptHandler;