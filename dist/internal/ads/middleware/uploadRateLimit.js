"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRateLimit = void 0;
const videoProcessing_queue_1 = require("../config/videoProcessing.queue");
const windowSeconds = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS || 60);
const maxUploads = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 5);
const dailyWindowSeconds = Number(process.env.UPLOAD_DAILY_RATE_LIMIT_WINDOW_SECONDS || 86400);
const dailyMaxUploads = Number(process.env.UPLOAD_DAILY_RATE_LIMIT_MAX || 200);
const uploadRateLimit = async (request, reply) => {
    const userId = request.headers['x-user-id'] ||
        request.headers.authorization ||
        request.ip ||
        'anonymous';
    const shortKey = `rate-limit:ads-uploads:${userId}`;
    const dailyKey = `rate-limit:ads-uploads:daily:${userId}`;
    const [count, dailyCount] = await Promise.all([
        videoProcessing_queue_1.redisConnection.incr(shortKey),
        videoProcessing_queue_1.redisConnection.incr(dailyKey),
    ]);
    if (count === 1) {
        await videoProcessing_queue_1.redisConnection.expire(shortKey, windowSeconds);
    }
    if (dailyCount === 1) {
        await videoProcessing_queue_1.redisConnection.expire(dailyKey, dailyWindowSeconds);
    }
    if (dailyCount > dailyMaxUploads) {
        const ttl = await videoProcessing_queue_1.redisConnection.ttl(dailyKey);
        reply.header('Retry-After', Math.max(ttl, 1).toString());
        reply.code(429).send({
            success: false,
            error: `Upload daily quota exceeded. Max ${dailyMaxUploads} uploads per ${dailyWindowSeconds / 3600} hour(s).`,
        });
        return;
    }
    if (count > maxUploads) {
        const ttl = await videoProcessing_queue_1.redisConnection.ttl(shortKey);
        reply.header('Retry-After', Math.max(ttl, 1).toString());
        reply.code(429).send({
            success: false,
            error: `Upload rate limit exceeded. Max ${maxUploads} uploads per ${windowSeconds} seconds.`,
        });
        return;
    }
};
exports.uploadRateLimit = uploadRateLimit;
//# sourceMappingURL=uploadRateLimit.js.map