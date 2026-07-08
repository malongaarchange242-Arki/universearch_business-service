// src/modules/stats/stats.controller.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import * as StatsService from './stats.service';
import { resolveAuthenticatedUser } from '../../middleware/authenticate';

const normalizeOrganizationType = (
  rawValue: string | null | undefined
): 'universite' | 'centre_formation' | null => {
  const normalized = String(rawValue || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('univers')) return 'universite';
  if (normalized.includes('centre')) return 'centre_formation';
  return null;
};

export const getOrganizationViewsTotal = async (
  request: FastifyRequest<{ Querystring: { organization_id?: string; organization_type?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const queryOrgId = String(request.query.organization_id || '').trim();
    const queryOrgType = normalizeOrganizationType(request.query.organization_type);

    let organizationId = queryOrgId;
    let organizationType = queryOrgType;

    if (!organizationId || !organizationType) {
      const viewer = await resolveAuthenticatedUser(request);

      if (!viewer) {
        return reply.status(400).send({
          success: false,
          error:
            'Missing organization_id/organization_type query parameters or Authorization header',
        });
      }

      organizationId = organizationId || viewer.id;
      organizationType =
        organizationType || normalizeOrganizationType(viewer.role) || null;
    }

    if (!organizationId || !organizationType) {
      return reply.status(400).send({
        success: false,
        error: 'Unable to resolve organization context',
      });
    }

    const stats = await StatsService.getOrganizationViewsTotal(
      supabase,
      organizationId,
      organizationType
    );

    reply.send({
      success: true,
      data: stats,
      total_views: stats.total_views,
      total_posts: stats.total_posts,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const getOrganizationTopFollowers = async (
  request: FastifyRequest<{ Querystring: { organization_id?: string; organization_type?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const queryOrgId = String(request.query.organization_id || '').trim();
    const queryOrgType = normalizeOrganizationType(request.query.organization_type);

    request.log.info({
      event: 'TopFollowersRequest',
      queryOrgId,
      queryOrgType,
    });

    let organizationId = queryOrgId;
    let organizationType = queryOrgType;

    if (!organizationId || !organizationType) {
      const viewer = await resolveAuthenticatedUser(request);

      if (!viewer) {
        return reply.status(400).send({
          success: false,
          error:
            'Missing organization_id/organization_type query parameters or Authorization header',
        });
      }

      organizationId = organizationId || viewer.id;
      organizationType =
        organizationType || normalizeOrganizationType(viewer.role) || null;
    }

    if (!organizationId || !organizationType) {
      return reply.status(400).send({
        success: false,
        error: 'Unable to resolve organization context',
      });
    }

    const followers = await StatsService.getOrganizationTopFollowers(
      supabase,
      organizationId,
      organizationType
    );

    request.log.info({
      event: 'TopFollowersResult',
      organizationId,
      organizationType,
      count: followers.length,
    });

    reply.send({
      success: true,
      data: followers,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};
