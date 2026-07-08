"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const supabase_js_1 = require("@supabase/supabase-js");
const supabasePlugin = (0, fastify_plugin_1.default)(async (app) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        throw new Error('Missing Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
    }
    const supabaseAnon = (0, supabase_js_1.createClient)(supabaseUrl, anonKey);
    const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    app.decorate('supabase', supabaseAnon);
    app.decorate('supabaseAdmin', supabaseAdmin);
});
exports.default = supabasePlugin;
//# sourceMappingURL=supabase.js.map