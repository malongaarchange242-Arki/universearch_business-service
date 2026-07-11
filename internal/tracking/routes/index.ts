import { FastifyInstance } from 'fastify';
import { proxyTrackingBatch } from '../services/tracking.proxy';

export const registerTrackingRoutes = async (app: FastifyInstance) => {
  app.post('/tracking/batch', proxyTrackingBatch);
  app.post('/api/v1/tracking/batch', proxyTrackingBatch);
  app.post('/api/tracking', proxyTrackingBatch);
  app.post('/api/tracking/batch', proxyTrackingBatch);
};
