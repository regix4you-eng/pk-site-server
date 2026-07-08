const express = require('express');

const normalizeClientRequest = require(
  '../actions/clients/normalize'
);

const requireAuth = require(
  '../middleware/auth.middleware'
);

const loadTeamMemberContext = require(
  '../middleware/team-member-context.middleware'
);

const clientsSaveHandler = require(
  '../actions/clients/handler'
);

const servicesSaveHandler = require(
  '../actions/services/handler'
);

const salesAcceptHandler = require(
  '../actions/sales/accept.handler'
);

const router = express.Router();

const parseJsonBody = express.json({
  limit: '2mb',
});


// =========================================================
// CLIENTS
// =========================================================

router.patch(
  '/actions/clients/save',

  parseJsonBody,

  normalizeClientRequest,

  requireAuth,

  loadTeamMemberContext,

  clientsSaveHandler
);


// =========================================================
// SERVICES
// =========================================================

router.patch(
  '/actions/services/save',

  parseJsonBody,

  normalizeClientRequest,

  requireAuth,

  loadTeamMemberContext,

  servicesSaveHandler
);


// =========================================================
// SALES ACCEPT
// =========================================================

router.patch(
  '/actions/sales/accept',

  parseJsonBody,

  normalizeClientRequest,

  requireAuth,

  loadTeamMemberContext,

  salesAcceptHandler
);


module.exports = router;