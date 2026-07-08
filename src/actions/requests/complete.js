const db = require('../../lib/db');

async function completeViewRequest(requestId) {
  const result = await db.query(
    `
      update public.view_requests
      set
        status = 'completed',
        finished_at = now()

      where id = $1::uuid
        and status = 'running'

      returning
        id,
        request_id,
        team_member_id,
        view_key,
        action_key,
        status,
        finished_at
    `,
    [requestId]
  );

  const request = result.rows[0];

  if (!request) {
    console.warn(
      `[ACTION REQUEST] Nothing completed for id: ${requestId}`
    );

    return null;
  }

  console.log(
    `[ACTION REQUEST] Completed: ${request.request_id}`
  );

  return request;
}

module.exports = completeViewRequest;