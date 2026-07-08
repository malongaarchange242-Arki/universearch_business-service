import { FastifyReply, FastifyRequest } from 'fastify';
import { redisConnection } from '../queues/videoProcessing.queue';

const windowSeconds = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS || 60);
const maxUploads = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 5);

export const uploadRateLimit = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const userId = (request.user as any)?.id || request.ip || 'anonymous';
  const key = `rate-limit:uploads:${userId}`;
  const count = await redisConnection.incr(key);

  if (count === 1) {
    await redisConnection.expire(key, windowSeconds);
  }

  if (count > maxUploads) {
    const ttl = await redisConnection.ttl(key);
    reply.header('Retry-After', Math.max(ttl, 1).toString());
    reply.code(429).send({
      success: false,
      error: `Upload rate limit exceeded. Max ${maxUploads} uploads per ${windowSeconds} seconds.`,
    });
  }
};
