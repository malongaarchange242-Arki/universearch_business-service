"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = exports.app = void 0;
require("./internal/shared/types/fastify");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const supabase_1 = __importDefault(require("./internal/shared/plugins/supabase"));
const auth_1 = __importDefault(require("./internal/shared/plugins/auth"));
const routes_1 = require("./routes");
exports.app = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
    bodyLimit: 50 * 1024 * 1024,
    requestTimeout: 30000,
});
exports.app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.status(error.statusCode ?? 500).send({
        success: false,
        error: error.message ?? 'Internal Server Error',
    });
});
const initializeApp = async () => {
    await exports.app.register(cors_1.default, {
        origin: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    await exports.app.register(multipart_1.default, {
        attachFieldsToBody: true,
        limits: {
            fileSize: 50 * 1024 * 1024,
        },
    });
    await exports.app.register(supabase_1.default);
    await exports.app.register(auth_1.default);
    exports.app.head('/health', async () => ({ status: 'ok' }));
    exports.app.get('/health', async () => ({
        status: 'ok',
        service: 'business-service',
        timestamp: new Date().toISOString(),
    }));
    exports.app.post('/health', async () => ({
        status: 'ok',
        service: 'business-service',
        timestamp: new Date().toISOString(),
    }));
    exports.app.route({
        method: ['GET', 'POST'],
        url: '/health/db',
        handler: async () => {
            try {
                const supabaseUrl = process.env.SUPABASE_URL;
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                if (!supabaseUrl || !serviceRoleKey) {
                    throw new Error('Missing Supabase credentials');
                }
                const response = await Promise.race([
                    fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
                        method: 'GET',
                        headers: {
                            apikey: serviceRoleKey,
                            Authorization: `Bearer ${serviceRoleKey}`,
                            Accept: 'application/json',
                        },
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000)),
                ]);
                if (!response.ok && response.status !== 404) {
                    throw new Error(`Supabase REST returned ${response.status}`);
                }
                return { database: 'connected' };
            }
            catch (error) {
                exports.app.log.warn({ err: error }, 'Health DB check failed');
                return { database: 'error' };
            }
        },
    });
    await exports.app.register(async (fastify) => {
        await (0, routes_1.registerBusinessRoutes)(fastify);
    });
};
exports.initializeApp = initializeApp;
//# sourceMappingURL=app.js.map