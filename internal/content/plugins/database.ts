// src/plugins/database.ts
import { FastifyPluginAsync } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  fastify.decorate('supabase', supabase);
};

export default databasePlugin;