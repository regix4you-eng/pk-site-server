const path = require('path');

const viewRegistry = Object.freeze({
  admin: {
    key: 'admin',
    directory: 'admin',
  },

  payments: {
    key: 'payments',
    directory: 'payments',
  },

  sales_dashboard: {
    key: 'sales_dashboard',
    directory: 'sales_dashboard',
  },

  sales_clients: {
    key: 'sales_clients',
    directory: 'sales_clients',
  },

  sales_deadline: {
    key: 'sales_deadline',
    directory: 'sales_deadline',
  },

  sales_paid: {
    key: 'sales_paid',
    directory: 'sales_paid',
  },

  sales_guide: {
    key: 'sales_guide',
    directory: 'sales_guide',
  },

  sales_trash: {
    key: 'sales_trash',
    directory: 'sales_trash',
  },

  sales_updates: {
    key: 'sales_updates',
    directory: 'sales_updates',
  },

  demo: {
    key: 'demo',
    directory: 'demo',
  },

  website: {
    key: 'website',
    directory: 'website',
  },

  web_domains: {
    key: 'web_domains',
    directory: 'web_domains',
  },

  vacations: {
    key: 'vacations',
    directory: 'vacations',
  },

  clients: {
    key: 'clients',
    directory: 'clients',
  },
});

function getViewDefinition(viewKey) {
  const key = String(viewKey || '').trim();

  const view = viewRegistry[key];

  if (!view) {
    return null;
  }

  return {
    ...view,

    queryPath: path.join(
      __dirname,
      view.directory,
      'query.sql'
    ),

    transformPath: path.join(
      __dirname,
      view.directory,
      'transform.js'
    ),
  };
}

function hasView(viewKey) {
  return Boolean(getViewDefinition(viewKey));
}

module.exports = {
  viewRegistry,
  getViewDefinition,
  hasView,
};