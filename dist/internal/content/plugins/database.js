"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const databasePlugin = async (fastify) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    fastify.decorate('supabase', supabase);
};
exports.default = databasePlugin;
//# sourceMappingURL=database.js.map