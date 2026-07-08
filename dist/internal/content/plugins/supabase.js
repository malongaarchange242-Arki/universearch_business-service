"use strict";
// src/plugins/supabase.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const supabasePlugin = (0, fastify_plugin_1.default)(async (app, _options) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        throw new Error('Missing Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
    }
    // Client anonyme pour requêtes publiques (avec RLS)
    const supabaseAnon = (0, supabase_js_1.createClient)(supabaseUrl, anonKey);
    // Client service role pour opérations backend (bypass RLS)
    // ⚠️ Utiliser UNIQUEMENT côté backend, JAMAIS côté frontend
    const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    app.decorate('supabase', supabaseAnon);
    app.decorate('supabaseAdmin', supabaseAdmin);
    app.log.info('✅ Supabase clients initialized (anon + service role)');
});
exports.default = supabasePlugin;
//# sourceMappingURL=supabase.js.map