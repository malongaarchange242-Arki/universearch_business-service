import { SupabaseClient } from '@supabase/supabase-js';
declare const supabasePlugin: (app: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, _options: Record<never, never>) => Promise<void>;
export default supabasePlugin;
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
//# sourceMappingURL=supabase.d.ts.map