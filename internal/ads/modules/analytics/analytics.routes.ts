// src/modules/analytics/analytics.routes.ts

import { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

export async function analyticsRoutes(app: FastifyInstance) {
  const analyticsService = new AnalyticsService(app.supabase);
  const analyticsController = new AnalyticsController(analyticsService);

  // POST /ads/impression
  app.post('/impression', analyticsController.recordImpression.bind(analyticsController));

  // POST /ads/click
  app.post('/click', analyticsController.recordClick.bind(analyticsController));

  // POST /ads/view
  app.post('/view', analyticsController.recordView.bind(analyticsController));

  // GET /ads/views/:adId
  app.get('/views/:adId', analyticsController.getViews.bind(analyticsController));

  // GET /ads/views-count/:adId
  app.get('/views-count/:adId', async (request, reply) => {
    try {
      const { adId } = request.params as { adId: string };
      const count = await analyticsService.getViewsCount(adId);
      reply.send({ success: true, views_count: count });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  });

  // POST /ads/like
  app.post('/like', analyticsController.recordLike.bind(analyticsController));

  // DELETE /ads/like
  app.delete('/like', analyticsController.removeLike.bind(analyticsController));

  // GET /ads/likes/:adId
  app.get('/likes/:adId', analyticsController.getLikes.bind(analyticsController));

  // GET /ads/likes-count/:adId
  app.get('/likes-count/:adId', async (request, reply) => {
    try {
      const { adId } = request.params as { adId: string };
      const count = await analyticsService.getLikesCount(adId);
      reply.send({ success: true, likes_count: count });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  });

  // POST /ads/comment
  app.post('/comment', analyticsController.postComment.bind(analyticsController));

  // GET /ads/comments/:adId
  app.get('/comments/:adId', analyticsController.getComments.bind(analyticsController));

  // GET /ads/comments-count/:adId
  app.get('/comments-count/:adId', async (request, reply) => {
    try {
      const { adId } = request.params as { adId: string };
      const count = await analyticsService.getCommentsCount(adId);
      reply.send({ success: true, comments_count: count });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  });
}
