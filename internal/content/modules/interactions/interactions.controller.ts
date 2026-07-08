// src/modules/interactions/interactions.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import * as InteractionsService from './interactions.service';
import { resolveAuthenticatedUser } from '../../middleware/authenticate';

export const getLikeStatus = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = request.user as any;
    const supabase = (request.server as any).supabaseAdmin;
    const liked = await InteractionsService.isPostLikedByUser(
      supabase,
      request.params.id,
      user.id
    );

    reply.send({
      success: true,
      data: {
        post_id: request.params.id,
        liked,
      },
    });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Aimer un post
 */
export const likePost = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    const like = await InteractionsService.likePost(
      supabase,
      request.params.id,
      user.id
    );

    reply.status(201).send({
      success: true,
      data: like,
    });
  } catch (error) {
    request.log.error(error);
    const statusCode = (error as Error).message.includes('already') ? 400 : 404;
    reply.status(statusCode).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Retirer un like
 */
export const unlikePost = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    await InteractionsService.unlikePost(supabase, request.params.id, user.id);

    reply.send({
      success: true,
      message: 'Like removed',
    });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Commenter un post
 */
export const commentPost = async (
  request: FastifyRequest<{ Params: { id: string }; Body: InteractionsService.CommentPayload }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    const comment = await InteractionsService.commentPost(
      supabase,
      request.params.id,
      user.id,
      request.body
    );

    reply.status(201).send({
      success: true,
      data: comment,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Récupérer les commentaires
 */
export const getComments = async (
  request: FastifyRequest<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabase;
    const page = request.query.page || 1;
    const limit = request.query.limit || 20;

    const result = await InteractionsService.getComments(
      supabase,
      request.params.id,
      page,
      limit
    );

    reply.send({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Enregistrer une vue
 */
export const recordView = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: InteractionsService.ViewPayload;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const viewer = await resolveAuthenticatedUser(request);
    const supabase = (request.server as any).supabaseAdmin;

    const view = await InteractionsService.recordPostView(
      supabase,
      request.params.id,
      viewer?.id || null,
      request.body || {}
    );

    const latestViews = await InteractionsService.getPostViews(
      supabase,
      request.params.id,
      1,
      1
    );

    reply.status(201).send({
      success: true,
      data: view,
      views_count: latestViews.total,
    });
  } catch (error) {
    request.log.error(error);
    const statusCode = (error as Error).message.includes('Post not found') ? 404 : 400;
    reply.status(statusCode).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Récupérer les vues d'un post
 */
export const getViews = async (
  request: FastifyRequest<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const page = request.query.page || 1;
    const limit = request.query.limit || 20;

    const result = await InteractionsService.getPostViews(
      supabase,
      request.params.id,
      page,
      limit
    );

    reply.send({
      success: true,
      data: result.data,
      views_count: result.total,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({
      success: false,
      error: (error as Error).message,
    });
  }
};
