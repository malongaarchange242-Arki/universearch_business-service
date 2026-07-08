import { SupabaseClient } from '@supabase/supabase-js';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;
    supabaseAdmin: SupabaseClient;
    authMiddleware: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      role: string;
      email?: string;
    };
    userId?: string;
  }
}
