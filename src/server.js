const app = require('./app');
const env = require('./config/env');

const {
  reportError,
} = require('./lib/report-error');

process.on('unhandledRejection', async (reason) => {
  await reportError({
    error:
      reason instanceof Error
        ? reason
        : new Error(String(reason)),
    source: 'unhandled_rejection',
    context: {
      raw_reason: reason,
    },
  });
});

process.on('uncaughtException', async (error) => {
  await reportError({
    error,
    source: 'uncaught_exception',
  });

  process.exit(1);
});

app.listen(env.port, () => {
  console.log(
    `Core running on http://localhost:${env.port}`
  );

  console.log(
    `Proxy target: ${env.n8nUrl}`
  );
});