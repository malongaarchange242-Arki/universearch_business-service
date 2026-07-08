import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authMiddleware', authMiddleware);
};

export default authPlugin;
