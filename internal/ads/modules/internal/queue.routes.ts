import { FastifyInstance } from 'fastify';
import { QueueController } from './queue.controller';
import { internalRateLimit } from '../../middleware/internalRateLimit';
import { validateAdminToken } from '../../middleware/adminAuth';

export async function queueAdminRoutes(app: FastifyInstance) {
  const queueController = new QueueController();

  app.get('/stats', {
    preHandler: [validateAdminToken, internalRateLimit],
  }, queueController.getQueueMetrics.bind(queueController));

  app.post<{ Params: { id: string } }>('/retry/:id', {
    preHandler: [validateAdminToken, internalRateLimit],
  }, queueController.retryJob.bind(queueController));

  app.post('/failed/retry-all', {
    preHandler: [validateAdminToken, internalRateLimit],
  }, queueController.retryAllFailedJobs.bind(queueController));
}
