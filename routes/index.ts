import { FastifyInstance } from 'fastify';
import { registerRoutes as registerAdsModuleRoutes } from '../internal/ads/routes';
import feedbacksRoutes from '../internal/content/routes/feedbacks';
import { activitiesRoutes } from '../internal/content/modules/activities/activities.routes';
import { feedRoutes } from '../internal/content/modules/feed/feed.routes';
import { interactionsRoutes } from '../internal/content/modules/interactions/interactions.routes';
import { postsRoutes } from '../internal/content/modules/posts/posts.routes';
import { statsRoutes } from '../internal/content/modules/stats/stats.routes';
import { registerTrackingRoutes } from '../internal/tracking/routes';

export const registerAdsRoutes = (app: FastifyInstance) => {
  registerAdsModuleRoutes(app);
};

export const registerContentRoutes = async (app: FastifyInstance) => {
  app.register(postsRoutes);
  app.register(interactionsRoutes);
  app.register(activitiesRoutes);
  app.register(feedRoutes);
  app.register(statsRoutes);
  app.register(feedbacksRoutes);
};

export const registerBusinessRoutes = async (app: FastifyInstance) => {
  registerAdsRoutes(app);
  await registerContentRoutes(app);
  await registerTrackingRoutes(app);
};
