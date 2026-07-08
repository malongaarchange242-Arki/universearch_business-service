import { FastifyReply, FastifyRequest } from 'fastify';
import { redisConnection } from '../config/videoProcessing.queue';

const windowSeconds = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS || 60);
const maxUploads = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 5);
const dailyWindowSeconds = Number(process.env.UPLOAD_DAILY_RATE_LIMIT_WINDOW_SECONDS || 86_400);
const dailyMaxUploads = Number(process.env.UPLOAD_DAILY_RATE_LIMIT_MAX || 200);

export const uploadRateLimit = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const userId =
    (request.headers['x-user-id'] as string | undefined) ||
    (request.headers.authorization as string | undefined) ||
    request.ip ||
    'anonymous';
  const shortKey = `rate-limit:ads-uploads:${userId}`;
  const dailyKey = `rate-limit:ads-uploads:daily:${userId}`;

  const [count, dailyCount] = await Promise.all([
    redisConnection.incr(shortKey),
    redisConnection.incr(dailyKey),
  ]);

  if (count === 1) {
    await redisConnection.expire(shortKey, windowSeconds);
  }

  if (dailyCount === 1) {
    await redisConnection.expire(dailyKey, dailyWindowSeconds);
  }

  if (dailyCount > dailyMaxUploads) {
    const ttl = await redisConnection.ttl(dailyKey);
    reply.header('Retry-After', Math.max(ttl, 1).toString());
    reply.code(429).send({
      success: false,
      error: `Upload daily quota exceeded. Max ${dailyMaxUploads} uploads per ${dailyWindowSeconds / 3600} hour(s).`,
    });
    return;
  }

  if (count > maxUploads) {
    const ttl = await redisConnection.ttl(shortKey);
    reply.header('Retry-After', Math.max(ttl, 1).toString());
    reply.code(429).send({
      success: false,
      error: `Upload rate limit exceeded. Max ${maxUploads} uploads per ${windowSeconds} seconds.`,
    });
    return;
  }
};
