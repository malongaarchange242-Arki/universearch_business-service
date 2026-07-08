// src/plugins/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import FastifyPlugin from 'fastify-plugin';

const supabasePlugin = FastifyPlugin(async (app, _options) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
  }

  // Client anonyme pour requêtes publiques (avec RLS)
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  // Client service role pour opérations backend (bypass RLS)
  // ⚠️ Utiliser UNIQUEMENT côté backend, JAMAIS côté frontend
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  app.decorate('supabase', supabaseAnon);
  app.decorate('supabaseAdmin', supabaseAdmin);

  app.log.info('✅ Supabase clients initialized (anon + service role)');
});

export default supabasePlugin;

// Extend FastifyInstance type
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;
    supabaseAdmin: SupabaseClient;
  }
}
