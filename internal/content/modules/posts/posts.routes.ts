// src/modules/posts/posts.routes.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as PostsController from './posts.controller';
import { createPostSchema, updatePostSchema, createCommentSchema } from './posts.schema';
import { authenticate, authorizeOrg } from '../../middleware';
import { uploadRateLimit } from '../../middleware/uploadRateLimit';

export const postsRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  /**
   * POST /posts - Créer un post
   * Protégé: authentifié + organisation APPROVED
   */
  app.post(
    '/posts',
    {
      schema: createPostSchema,
      preHandler: [authenticate, authorizeOrg],
    },
    PostsController.createPost as any
  );

  /**
   * GET /posts/mine - Lister les posts de l'organisation authentifiée
   * Protégé: authentifié + organisation APPROVED
   */
  app.get(
    '/posts/mine',
    {
      preHandler: [authenticate, authorizeOrg, uploadRateLimit],
    },
    PostsController.listPosts as any
  );

  /**
   * GET /posts/entity - Lister les posts par entité (université ou centre)
   * Public - MUST come BEFORE /posts/:id to avoid being matched by :id parameter
   */
  app.get('/posts/entity', PostsController.listPostsByEntity as any);

  /**
   * GET /posts - Lister les posts (public)
   */
  app.get('/posts', PostsController.listPosts as any);

  /**
   * GET /posts/:id - Récupérer un post
   * Public
   */
  app.get('/posts/:id', PostsController.getPost);

  /**
   * POST /uploads - upload a file to Supabase Storage (server-side)
   * Protected: authenticated + organisation APPROVED
   * Expects multipart/form-data with field `file`.
   */
  app.post(
    '/uploads',
    {
      preHandler: [authenticate, authorizeOrg],
    },
    PostsController.uploadFile as any
  );

  app.get(
    '/uploads/jobs/:id',
    {
      preHandler: [authenticate, authorizeOrg],
    },
    PostsController.getUploadJob as any
  );

  /**
   * POST /signed-url - Create a temporary signed URL for a storage object
   * Protected: authenticated + organisation APPROVED
   * Body: { bucket, path, expires }
   */
  app.post(
    '/signed-url',
    {
      preHandler: [authenticate, authorizeOrg],
    },
    PostsController.createSignedUrl as any
  );

  /**
   * PUT /posts/:id - Modifier un post
   * Protégé: authentifié + organisation APPROVED + propriétaire
   */
  app.put(
    '/posts/:id',
    {
      schema: updatePostSchema,
      preHandler: [authenticate, authorizeOrg],
    },
    PostsController.updatePost as any
  );

  /**
   * DELETE /posts/:id - Supprimer un post
   * Protégé: authentifié + organisation APPROVED + propriétaire
   */
  app.delete(
    '/posts/:id',
    {
      preHandler: [authenticate, authorizeOrg],
    },
    PostsController.deletePost as any
  );

  /**
   * POST /posts/:id/comments - Ajouter un commentaire (auth required)
   */
  app.post(
    '/posts/:id/comments',
    {
      schema: createCommentSchema,
      preHandler: [authenticate],
    },
    PostsController.createComment as any
  );

  /**
   * GET /posts/:id/comments - Lister les commentaires d'un post
   * Public
   */
  app.get('/posts/:id/comments', PostsController.listComments as any);
};
