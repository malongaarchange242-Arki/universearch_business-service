// src/modules/activities/activities.controller.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import * as ActivitiesService from './activities.service';
import { resolveAuthenticatedUser } from '../../middleware/authenticate';

const getSupabase = (request: FastifyRequest) =>
  (request.server as any).supabaseAdmin;

const normalizeOrganizationType = (
  value: string | null | undefined
): 'universite' | 'centre_formation' | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('univers')) return 'universite';
  if (normalized.includes('centre')) return 'centre_formation';
  return null;
};

export const createActivity = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }

  const payload = request.body as ActivitiesService.CreateActivityPayload;
  const activity = await ActivitiesService.createActivity(
    getSupabase(request),
    payload,
    user.id
  );

  reply.code(201).send({ success: true, data: activity });
};

export const listActivities = async (
  request: FastifyRequest<{ Querystring: { organization_id?: string; organization_type?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  const user = request.user ?? (await resolveAuthenticatedUser(request));
  const currentUserId = user?.id ?? null;
  const organizationId = String(request.query.organization_id || '').trim() || null;
  const organizationType = normalizeOrganizationType(request.query.organization_type);
  const activities = await ActivitiesService.listActivities(
    getSupabase(request),
    {
      currentUserId,
      organizationId,
      organizationType,
    }
  );
  reply.send({ success: true, data: activities });
};

export const getActivity = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const { id } = request.params as { id: string };
  const currentUserId = request.user?.id ?? null;
  const activity = await ActivitiesService.getActivity(getSupabase(request), id);

  if (!activity) {
    return reply.status(404).send({ success: false, error: 'Activity not found' });
  }

  if (!activity.is_public && activity.created_by_id !== currentUserId) {
    return reply.status(403).send({ success: false, error: 'Forbidden' });
  }

  reply.send({ success: true, data: activity });
};

export const updateActivity = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params as { id: string };
  const payload = request.body as ActivitiesService.UpdateActivityPayload;
  const activity = await ActivitiesService.updateActivity(
    getSupabase(request),
    id,
    payload,
    user.id
  );
  reply.send({ success: true, data: activity });
};

export const deleteActivity = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params as { id: string };
  await ActivitiesService.deleteActivity(getSupabase(request), id, user.id);
  reply.send({ success: true, message: 'Activity deleted' });
};
