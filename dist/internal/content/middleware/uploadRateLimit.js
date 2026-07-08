"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRateLimit = void 0;
const videoProcessing_queue_1 = require("../queues/videoProcessing.queue");
const windowSeconds = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS || 60);
const maxUploads = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 5);
const uploadRateLimit = async (request, reply) => {
    const userId = request.user?.id || request.ip || 'anonymous';
    const key = `rate-limit:uploads:${userId}`;
    const count = await videoProcessing_queue_1.redisConnection.incr(key);
    if (count === 1) {
        await videoProcessing_queue_1.redisConnection.expire(key, windowSeconds);
    }
    if (count > maxUploads) {
        const ttl = await videoProcessing_queue_1.redisConnection.ttl(key);
        reply.header('Retry-After', Math.max(ttl, 1).toString());
        reply.code(429).send({
            success: false,
            error: `Upload rate limit exceeded. Max ${maxUploads} uploads per ${windowSeconds} seconds.`,
        });
    }
};
exports.uploadRateLimit = uploadRateLimit;
//# sourceMappingURL=uploadRateLimit.js.map