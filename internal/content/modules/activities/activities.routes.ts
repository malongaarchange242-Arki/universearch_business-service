// src/modules/activities/activities.routes.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as ActivitiesController from './activities.controller';
import {
  createActivitySchema,
  getActivitySchema,
  updateActivitySchema,
} from './activities.schema';
import { authenticate } from '../../middleware';

export const activitiesRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  app.post(
    '/activities',
    {
      schema: createActivitySchema,
      preHandler: [authenticate],
    },
    ActivitiesController.createActivity as any
  );

  app.get('/activities', ActivitiesController.listActivities as any);

  app.get(
    '/activities/:id',
    {
      schema: getActivitySchema,
    },
    ActivitiesController.getActivity as any
  );

  app.put(
    '/activities/:id',
    {
      schema: updateActivitySchema,
      preHandler: [authenticate],
    },
    ActivitiesController.updateActivity as any
  );

  app.delete(
    '/activities/:id',
    {
      preHandler: [authenticate],
    },
    ActivitiesController.deleteActivity as any
  );
};
