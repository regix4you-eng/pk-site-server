const express = require('express');

const healthRoutes = require(
  './routes/health.routes'
);

const viewsRoutes = require(
  './routes/views.routes'
);

const actionsRoutes = require(
  './routes/actions.routes'
);

const n8nProxy = require(
  './proxy/n8n.proxy'
);

const app = express();

// Log'inam visus requestus
app.use((req, res, next) => {
  console.log(
    `[CORE] ${req.method} ${req.originalUrl}`
  );

  next();
});

// Laikinas CORS developmentui
app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Node Core route'ai
app.use(healthRoutes);
app.use(viewsRoutes);
app.use(actionsRoutes);

// Visa kita toliau fallbackina į n8n
app.use(n8nProxy);

module.exports = app;