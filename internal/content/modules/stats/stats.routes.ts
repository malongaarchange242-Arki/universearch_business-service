// src/modules/stats/stats.routes.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as StatsController from './stats.controller';

export const statsRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  /**
   * GET /stats/organization/views-total
   * Query params optionnels: organization_id, organization_type
   * Sinon le contexte est résolu via le Bearer token.
   */
  app.get(
    '/stats/organization/views-total',
    StatsController.getOrganizationViewsTotal as any
  );

  /**
   * GET /stats/organization/top-followers
   * Query params optionnels: organization_id, organization_type
   * Sinon le contexte est résolu via le Bearer token.
   */
  app.get(
    '/stats/organization/top-followers',
    StatsController.getOrganizationTopFollowers as any
  );
};
