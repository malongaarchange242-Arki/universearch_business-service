// src/modules/interactions/interactions.routes.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as InteractionsController from './interactions.controller';
import {
  createCommentSchema,
  getViewsSchema,
  recordViewSchema,
} from './interactions.schema';
import { authenticate } from '../../middleware';

export const interactionsRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  /**
   * POST /posts/:id/like - Aimer un post
   * Protégé: authentifié
   */
  app.post(
    '/posts/:id/like',
    { preHandler: [authenticate] },
    InteractionsController.likePost as any
  );

  app.get(
    '/posts/:id/like-status',
    { preHandler: [authenticate] },
    InteractionsController.getLikeStatus as any
  );

  /**
   * DELETE /posts/:id/like - Retirer un like
   * Protégé: authentifié
   */
  app.delete(
    '/posts/:id/like',
    { preHandler: [authenticate] },
    InteractionsController.unlikePost as any
  );

  /**
   * POST /posts/:id/comment - Commenter un post
   * Protégé: authentifié
   */
  app.post(
    '/posts/:id/comment',
    {
      schema: createCommentSchema,
      preHandler: [authenticate],
    },
    InteractionsController.commentPost as any
  );

  /**
   * POST /posts/:id/view - Enregistrer une vue
   * Public, avec user_id si Authorization fournie
   */
  app.post(
    '/posts/:id/view',
    {
      schema: recordViewSchema,
    },
    InteractionsController.recordView as any
  );

  /**
   * GET /posts/:id/views - Lister les vues d'un post
   * Public
   */
  app.get(
    '/posts/:id/views',
    {
      schema: getViewsSchema,
    },
    InteractionsController.getViews as any
  );
};
