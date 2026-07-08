"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalRateLimit = void 0;
const videoProcessing_queue_1 = require("../config/videoProcessing.queue");
const windowSeconds = Number(process.env.INTERNAL_ADMIN_RATE_LIMIT_WINDOW_SECONDS || 60);
const maxRequests = Number(process.env.INTERNAL_ADMIN_RATE_LIMIT_MAX || 20);
const internalRateLimit = async (request, reply) => {
    const authHeader = request.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = bearerToken || request.headers['x-admin-token'] || request.ip;
    const key = `rate-limit:internal-admin:${token}`;
    const count = await videoProcessing_queue_1.redisConnection.incr(key);
    if (count === 1) {
        await videoProcessing_queue_1.redisConnection.expire(key, windowSeconds);
    }
    if (count > maxRequests) {
        const ttl = await videoProcessing_queue_1.redisConnection.ttl(key);
        reply.header('Retry-After', Math.max(ttl, 1).toString());
        reply.code(429).send({
            success: false,
            error: `Internal admin rate limit exceeded. Max ${maxRequests} requests per ${windowSeconds} seconds.`,
        });
    }
};
exports.internalRateLimit = internalRateLimit;
//# sourceMappingURL=internalRateLimit.js.map