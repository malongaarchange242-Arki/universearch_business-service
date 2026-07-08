// src/modules/feed/feed.routes.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as FeedController from './feed.controller';

export const feedRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  /**
   * GET /feed - Feed complet
   * Public avec pagination
   */
  app.get('/feed', FeedController.getFeed);

  /**
   * GET /feed/universites - Feed universités
   * Public avec pagination
   */
  app.get('/feed/universites', FeedController.getUniversitesFeed);

  /**
   * GET /feed/centres - Feed centres de formation
   * Public avec pagination
   */
  app.get('/feed/centres', FeedController.getCentresFeed);

  /**
   * GET /feed/organization - Feed d'une organisation spécifique
   * Public avec pagination
   * Query params: organization_id, organization_type (universite ou centre), page, limit
   */
  app.get('/feed/organization', FeedController.getOrganizationFeed);
};
