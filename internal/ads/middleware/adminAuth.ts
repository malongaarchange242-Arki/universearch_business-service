import { FastifyRequest, FastifyReply } from 'fastify';

const adminToken = process.env.VIDEO_QUEUE_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

export const validateAdminToken = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!adminToken) {
    reply.code(500).send({
      success: false,
      error: 'Server misconfiguration: admin token missing.',
    });
    return;
  }

  const authHeader = (request.headers.authorization as string | undefined) || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = bearerToken || (request.headers['x-admin-token'] as string | undefined);

  if (!token || token !== adminToken) {
    reply.code(401).send({
      success: false,
      error: 'Unauthorized access to internal queue metrics.',
    });
  }
};
