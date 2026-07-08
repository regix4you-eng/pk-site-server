const db = require('../lib/db');

async function loadTeamMemberContext(req, res, next) {
  try {
    const authUserId = req.user?.id;

    if (!authUserId) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED',
      });
    }

    const result = await db.query(
      `
        select
          tm.id::text as team_member_id,
          tm.name as user_name,
          tm.email as user_email,
          tm.auth_user_id::text as auth_user_id,

          jr.id::text as role_id,
          jr.name as role_name

        from public.team_members tm

        join public.job_roles jr
          on jr.id = tm.job_role_id

        where tm.auth_user_id = $1::uuid

        limit 1
      `,
      [authUserId]
    );

    const context = result.rows[0];

    if (!context) {
      console.log(
        `[CONTEXT] Team member not found for user: ${authUserId}`
      );

      return res.status(403).json({
        ok: false,
        error: 'TEAM_MEMBER_NOT_FOUND',
      });
    }

    req.context = context;

    console.log(
      `[CONTEXT] Team member: ${context.team_member_id}`
    );

    console.log(
      `[CONTEXT] Role: ${context.role_name}`
    );

    next();
  } catch (error) {
    console.error(
      '[CONTEXT] Failed to load team member context:',
      error
    );

    return res.status(500).json({
      ok: false,
      error: 'TEAM_MEMBER_CONTEXT_FAILED',
    });
  }
}

module.exports = loadTeamMemberContext;