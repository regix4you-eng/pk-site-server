const env = require('../config/env');

function normalizeError(error) {
  return {
    name:
      error?.name ||
      'Error',

    message:
      error?.message ||
      String(error || 'Unknown error'),

    code:
      error?.code ||
      null,

    detail:
      error?.detail ||
      null,

    hint:
      error?.hint ||
      null,

    constraint:
      error?.constraint ||
      null,

    table:
      error?.table ||
      null,

    column:
      error?.column ||
      null,

    stack:
      error?.stack ||
      null,
  };
}

async function reportError({
  error,
  source,
  route,
  method,
  actionKey,
  viewKey,
  requestId,
  viewRequestId,
  userId,
  teamMemberId,
  changeIndex,
  operation,
  entityId,
  payload,
  context,
}) {
  const body = {
    service: 'pk-site-core',

    source:
      source ||
      'unknown',

    route:
      route ||
      null,

    method:
      method ||
      null,

    action_key:
      actionKey ||
      null,

    view_key:
      viewKey ||
      null,

    request_id:
      requestId ||
      null,

    view_request_id:
      viewRequestId ||
      null,

    user_id:
      userId ||
      null,

    team_member_id:
      teamMemberId ||
      null,

    change_index:
      typeof changeIndex === 'number'
        ? changeIndex
        : null,

    operation:
      operation ||
      null,

    entity_id:
      entityId ||
      null,

    error:
      normalizeError(error),

    payload:
      payload ||
      null,

    context:
      context ||
      null,

    reported_at:
      new Date().toISOString(),
  };

  try {
    console.error(
      '[CORE ERROR]',
      JSON.stringify(body, null, 2)
    );

    const response = await fetch(
      env.coreErrorWebhookUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      console.error(
        '[CORE ERROR] n8n webhook failed:',
        response.status,
        response.statusText
      );
    }

    return body;
  } catch (reportError) {
    console.error(
      '[CORE ERROR] Failed to report error to n8n:',
      reportError
    );

    return body;
  }
}

module.exports = {
  reportError,
  normalizeError,
};