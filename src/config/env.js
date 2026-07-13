require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 3000,

  n8nUrl: process.env.N8N_URL,

  coreErrorWebhookUrl:
    process.env.CORE_ERROR_WEBHOOK_URL,

  supabaseUrl: process.env.SUPABASE_URL,
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY,
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL,

  databaseUrl: process.env.DATABASE_URL,
};

const requiredVariables = [
  ['N8N_URL', env.n8nUrl],
  ['SUPABASE_URL', env.supabaseUrl],
  [
    'SUPABASE_PUBLISHABLE_KEY',
    env.supabasePublishableKey,
  ],
  ['DATABASE_URL', env.databaseUrl],
  [
    'CORE_ERROR_WEBHOOK_URL',
    env.coreErrorWebhookUrl,
  ],
];

for (const [name, value] of requiredVariables) {
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
}

module.exports = env;