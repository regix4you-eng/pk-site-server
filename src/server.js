const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Core running on http://localhost:${env.port}`);
  console.log(`Proxy target: ${env.n8nUrl}`);
});