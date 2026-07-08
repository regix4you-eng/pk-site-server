require('dotenv').config();

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Serverio patikra
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'pk-site-server',
  });
});

// Laikinas testinis proxy į n8n
app.use(
  '/n8n',
  createProxyMiddleware({
    target: process.env.N8N_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/n8n': '',
    },
  })
);

// JSON vietiniams Node endpointams
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});