import FastifyPlugin from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabasePlugin = FastifyPlugin(async (app) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
  }

  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  app.decorate('supabase', supabaseAnon);
  app.decorate('supabaseAdmin', supabaseAdmin);
});

export default supabasePlugin;
