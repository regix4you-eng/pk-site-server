const { createProxyMiddleware } = require('http-proxy-middleware');
const env = require('../config/env');

const n8nProxy = createProxyMiddleware({
  target: env.n8nUrl,
  changeOrigin: true,
});

module.exports = n8nProxy;