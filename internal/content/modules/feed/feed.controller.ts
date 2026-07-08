// src/modules/feed/feed.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import * as FeedService from './feed.service';

/**
 * Récupérer le feed complet
 */
export const getFeed = async (
  request: FastifyRequest<{ Querystring: { page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const page = request.query.page || 1;
    const limit = request.query.limit || 10;

    const result = await FeedService.getFeed(supabase, page, limit);

    reply.send({
      success: true,
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Récupérer le feed des universités
 */
export const getUniversitesFeed = async (
  request: FastifyRequest<{ Querystring: { page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const page = request.query.page || 1;
    const limit = request.query.limit || 10;

    const result = await FeedService.getUniversitesFeed(supabase, page, limit);

    reply.send({
      success: true,
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Récupérer le feed des centres
 */
export const getCentresFeed = async (
  request: FastifyRequest<{ Querystring: { page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const page = request.query.page || 1;
    const limit = request.query.limit || 10;

    const result = await FeedService.getCentresFeed(supabase, page, limit);

    reply.send({
      success: true,
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Récupérer le feed d'une organisation spécifique
 */
export const getOrganizationFeed = async (
  request: FastifyRequest<{ Querystring: { organization_id?: string; organization_type?: string; page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> => {
  const startTime = Date.now();
  const beforeMemory = process.memoryUsage();

  try {
    const supabase = (request.server as any).supabaseAdmin;
    const organizationId = String(request.query.organization_id || '').trim();
    const organizationTypeParam = String(request.query.organization_type || '').trim().toLowerCase();
    const page = request.query.page || 1;
    const limit = request.query.limit || 10;

    if (!organizationId || !organizationTypeParam) {
      request.log.warn({
        msg: 'Missing query params for organization feed',
        organizationId,
        organizationType: organizationTypeParam,
      });

      return reply.status(400).send({
        success: false,
        error: 'Missing required query parameters: organization_id, organization_type',
      });
    }

    const organizationType =
      organizationTypeParam === 'centre' || organizationTypeParam === 'centre_formation'
        ? 'centre_formation'
        : 'universite';

    const result = await FeedService.getOrganizationFeed(
      supabase,
      organizationId,
      organizationType,
      page as number,
      limit as number
    );

    const afterMemory = process.memoryUsage();
    const durationMs = Date.now() - startTime;

    request.log.info({
      msg: 'Organization feed fetched',
      organizationId,
      organizationType,
      page,
      limit,
      durationMs,
      memory: {
        rssBeforeMB: Math.round(beforeMemory.rss / 1024 / 1024),
        rssAfterMB: Math.round(afterMemory.rss / 1024 / 1024),
        heapUsedBeforeMB: Math.round(beforeMemory.heapUsed / 1024 / 1024),
        heapUsedAfterMB: Math.round(afterMemory.heapUsed / 1024 / 1024),
      },
      resultCount: result.data.length,
      total: result.pagination.total,
    });

    reply.send({
      success: true,
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};
