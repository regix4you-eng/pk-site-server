const { createClient } = require('@supabase/supabase-js');

const env = require('../config/env');

const supabase = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

module.exports = supabase;