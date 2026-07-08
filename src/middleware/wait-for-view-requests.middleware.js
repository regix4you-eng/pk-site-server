const db = require('../lib/db');

const POLL_INTERVAL_MS = 500;
const MAX_WAIT_MS = 30000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getRequestState(teamMemberId) {
  const result = await db.query(
    `
      with request_state as (
        select
          count(*) filter (
            where status = 'running'
          )::int as running_count,

          count(*) filter (
            where status = 'running'
              and (
                expires_at is null
                or expires_at > now()
              )
          )::int as active_running_count,

          count(*) filter (
            where status = 'running'
              and expires_at is not null
              and expires_at <= now()
          )::int as timeout_count

        from public.view_requests

        where team_member_id = $1::uuid
      )

      select
        running_count,
        active_running_count,
        timeout_count,

        (running_count > 0) as has_running,
        (active_running_count > 0) as has_active_running,
        (timeout_count > 0) as has_timeout

      from request_state
    `,
    [teamMemberId]
  );

  return result.rows[0];
}

async function waitForViewRequests(req, res, next) {
  try {
    const teamMemberId =
      req.context?.team_member_id;

    if (!teamMemberId) {
      return res.status(500).json({
        ok: false,
        error: 'TEAM_MEMBER_CONTEXT_MISSING',
      });
    }

    const startedAt = Date.now();

    while (true) {
      const state = await getRequestState(
        teamMemberId
      );

      console.log(
        `[VIEW REQUESTS] active=${state.active_running_count} timeout=${state.timeout_count}`
      );

      if (!state.has_active_running) {
        return next();
      }

      if (
        Date.now() - startedAt >= MAX_WAIT_MS
      ) {
        console.log(
          `[VIEW REQUESTS] Wait timeout for: ${teamMemberId}`
        );

        return res.status(408).json({
          ok: false,
          error: 'VIEW_REQUEST_WAIT_TIMEOUT',
        });
      }

      await sleep(POLL_INTERVAL_MS);
    }
  } catch (error) {
    console.error(
      '[VIEW REQUESTS] Check failed:',
      error
    );

    return res.status(500).json({
      ok: false,
      error: 'VIEW_REQUEST_CHECK_FAILED',
    });
  }
}

module.exports = waitForViewRequests;