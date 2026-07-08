// src/routes.ts

import { FastifyInstance } from 'fastify';
import { campaignRoutes } from './modules/campaign/campaign.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { deliveryRoutes } from './modules/delivery/delivery.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { queueAdminRoutes } from './modules/internal/queue.routes';

export const registerRoutes = (app: FastifyInstance) => {
  app.register(campaignRoutes, { prefix: '/ads' });
  app.register(mediaRoutes, { prefix: '/ads/media' });
  app.register(deliveryRoutes, { prefix: '/ads' });
  app.register(analyticsRoutes, { prefix: '/ads' });
  app.register(queueAdminRoutes, { prefix: '/internal/queues/video-processing' });
};