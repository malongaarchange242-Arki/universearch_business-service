import { FastifyReply, FastifyRequest } from 'fastify';
import { redisConnection } from '../config/videoProcessing.queue';

const windowSeconds = Number(process.env.INTERNAL_ADMIN_RATE_LIMIT_WINDOW_SECONDS || 60);
const maxRequests = Number(process.env.INTERNAL_ADMIN_RATE_LIMIT_MAX || 20);

export const internalRateLimit = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authHeader = (request.headers.authorization as string | undefined) || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = bearerToken || (request.headers['x-admin-token'] as string | undefined) || request.ip;
  const key = `rate-limit:internal-admin:${token}`;

  const count = await redisConnection.incr(key);
  if (count === 1) {
    await redisConnection.expire(key, windowSeconds);
  }

  if (count > maxRequests) {
    const ttl = await redisConnection.ttl(key);
    reply.header('Retry-After', Math.max(ttl, 1).toString());
    reply.code(429).send({
      success: false,
      error: `Internal admin rate limit exceeded. Max ${maxRequests} requests per ${windowSeconds} seconds.`,
    });
  }
};
