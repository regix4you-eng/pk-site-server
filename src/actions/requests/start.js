const db = require('../../lib/db');

async function startViewRequest({
  teamMemberId,
  viewKey,
  actionKey,
  payload,
}) {
  const result = await db.query(
    `
      insert into public.view_requests (
        team_member_id,
        view_key,
        action_key,
        status,
        payload,
        expires_at
      )
      values (
        $1::uuid,
        $2,
        $3,
        'running',
        $4::jsonb,
        now() + interval '2 minutes'
      )
      returning
        id,
        request_id,
        team_member_id,
        view_key,
        action_key,
        status,
        expires_at
    `,
    [
      teamMemberId,
      viewKey,
      actionKey,
      JSON.stringify(payload),
    ]
  );

  const request = result.rows[0];

  if (!request) {
    throw new Error(
      'Failed to create view request'
    );
  }

  console.log(
    `[ACTION REQUEST] Started: ${request.request_id}`
  );

  return request;
}

module.exports = startViewRequest;