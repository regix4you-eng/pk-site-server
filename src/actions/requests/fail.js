const db = require('../../lib/db');

async function failViewRequest(
  requestId,
  errorMessage
) {
  const result = await db.query(
    `
      update public.view_requests

      set
        status = 'failed',
        finished_at = now(),
        payload =
          coalesce(payload, '{}'::jsonb)
          ||
          jsonb_build_object(
            'error',
            $2::text
          )

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
    [
      requestId,
      errorMessage || 'Unknown error',
    ]
  );

  const request = result.rows[0];

  if (!request) {
    console.warn(
      `[ACTION REQUEST] Nothing failed for id: ${requestId}`
    );

    return null;
  }

  console.log(
    `[ACTION REQUEST] Failed: ${request.request_id}`
  );

  return request;
}

module.exports = failViewRequest;