// src/modules/posts/posts.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as PostsService from './posts.service';
import { resolveAuthenticatedUser } from '../../middleware/authenticate';
import { MediaService } from '../media/media.service';
import {
  addVideoProcessingJob,
  getVideoProcessingJobStatus,
} from '../../queues/videoProcessing.queue';

const DEFAULT_POST_LIMIT = 50;
const MAX_POST_LIMIT = 1000;

const clampPostLimit = (value: unknown): number => {
  const requested = value ? parseInt(String(value), 10) : DEFAULT_POST_LIMIT;
  if (!Number.isFinite(requested) || requested < 1) return DEFAULT_POST_LIMIT;
  return Math.min(requested, MAX_POST_LIMIT);
};

/**
 * Créer un post
 */
export const createPost = async (
  request: FastifyRequest<{ Body: PostsService.CreatePostPayload }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    // Log attempt
    request.log.info({ msg: 'Create post attempt', userId: user?.id, role: user?.role });

    // Sanitize client body: do NOT trust author_id / author_type from client
    const body: any = request.body || {};
    const titre = body.titre || body.title || '';
    const description = body.description || body.content || body.desc || null;
    const media_url = body.media_url || body.mediaUrl || null;
    const thumbnail_url = body.thumbnail_url || body.thumbnailUrl || null;
    const media_type = body.media_type || body.mediaType || null;
    const category = body.category || body.categorie || null;
    const rawHashtags = body.hashtags || body.hashtag || null;
    const hashtags = Array.isArray(rawHashtags)
      ? rawHashtags.filter(Boolean)
      : typeof rawHashtags === 'string'
        ? rawHashtags.trim().split(/\s+/).filter(Boolean)
        : null;
    const media_processing_status = body.media_processing_status || body.mediaProcessingStatus || null;
    const media_processing_error = body.media_processing_error || body.mediaProcessingError || null;

    const payload: PostsService.CreatePostPayload = {
      titre: titre,
      description: description,
      category: category,
      hashtags: hashtags,
      media_url: media_url,
      thumbnail_url: thumbnail_url,
      media_type: media_type,
      media_processing_status,
      media_processing_error,
    };

    const post = await PostsService.createPost(
      supabase,
      user.id,
      user.role,
      payload
    );

    // Response already contains server-authoritative fields
    reply.status(201).send({ success: true, data: post });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Upload a file server-side to Supabase Storage and return its public URL
 * Expects multipart/form-data with field `file`.
 */
export const uploadFile = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // 🔥 Use service role client for server-side uploads (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    // Debug: log incoming upload headers for troubleshooting
    request.log.info({ msg: 'Incoming upload request', headers: request.headers });

    const contentType = (request.headers['content-type'] || request.headers['Content-Type'] || '').toString();
    if (!contentType || !contentType.includes('multipart/form-data')) {
      request.log.warn({ msg: 'Upload rejected: invalid content-type', contentType });
      return reply.status(400).send({ success: false, error: 'Invalid Content-Type: expected multipart/form-data' });
    }

    // fastify-multipart with attachFieldsToBody: true exposes files in request.body
    const bodyAny: any = (request as any).body || {};
    let file = bodyAny.file;

    if (!file) {
      request.log.warn({ msg: 'No file field found in request.body' });
      return reply.status(400).send({ success: false, error: 'No file provided in multipart/form-data (field name: file)' });
    }

    // Handle the file object (could be UploadFile or similar)
    let buffer: Buffer | null = null;
    try {
      if (typeof file.toBuffer === 'function') {
        buffer = await file.toBuffer();
      } else if (Buffer.isBuffer(file)) {
        buffer = file;
      } else if (file._buf && Buffer.isBuffer(file._buf)) {
        buffer = file._buf;
      } else if (file.buffer && Buffer.isBuffer(file.buffer)) {
        buffer = file.buffer;
      } else {
        request.log.error({ msg: 'Unsupported file object type', fileKeys: Object.keys(file) });
        return reply.status(400).send({ success: false, error: 'Unsupported file format' });
      }
    } catch (e) {
      request.log.error({ msg: 'Failed to read file buffer', error: e });
      return reply.status(500).send({ success: false, error: 'Failed to read uploaded file content' });
    }

    if (!buffer) {
      return reply.status(500).send({ success: false, error: 'Failed to read uploaded file content' });
    }

    const resolvedFile = {
      filename: file.filename || file.name || `upload_${Date.now()}`,
      mimetype: file.mimetype || file.type || 'application/octet-stream',
    };

    request.log.info({ msg: 'Received file metadata', filename: resolvedFile.filename, mimetype: resolvedFile.mimetype });

    const isVideo = resolvedFile.mimetype.toString().startsWith('video/');

    if (isVideo) {
      const mediaService = new MediaService(supabase);
      const query = request.query as any;
      const asyncMode =
        query?.async === 'true' ||
        query?.async === '1' ||
        request.headers['x-video-processing'] === 'async';
      const ownerId = (request.user as any)?.id || 'unknown';
      const postId = query?.post_id || query?.postId || null;
      const priority = query?.priority ? Number(query.priority) : undefined;

      if (asyncMode) {
        const raw = await mediaService.uploadRawVideo(
          buffer,
          resolvedFile.filename || 'upload.video',
          ownerId,
          resolvedFile.mimetype || 'application/octet-stream'
        );

        const job = await addVideoProcessingJob(
          {
            source: 'content',
            rawBucket: raw.bucket,
            outputBucket: 'videos',
            outputPrefix: 'posts',
            thumbnailPrefix: 'thumbnails/posts',
            rawPath: raw.path,
            rawUrl: raw.rawUrl,
            originalFilename: resolvedFile.filename || 'upload.video',
            ownerId,
            postId: postId || null,
          },
          { priority: Number.isFinite(priority) ? priority : 5 }
        );

        if (postId) {
          await supabase
            .from('posts')
            .update({
              media_processing_status: 'queued',
              media_processing_error: null,
            })
            .eq('id', postId)
            .eq('author_id', ownerId);
        }

        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Headers', 'Range, Content-Type');
        reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

        return reply.code(202).send({
          success: true,
          status: 'processing',
          placeholder: true,
          jobId: job.id,
          rawUrl: raw.rawUrl,
          bucket: raw.bucket,
          path: raw.path,
          postId,
          media_type: 'video',
        });
      }

      const processed = await mediaService.processAndUploadVideo(
        buffer,
        resolvedFile.filename || 'upload.video',
        ownerId
      );

      request.log.info({ msg: 'Video normalized and uploaded with ffmpeg', url: processed.url, bucket: processed.bucket, path: processed.path });

      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Headers', 'Range, Content-Type');
      reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      return reply.code(201).send({
        success: true,
        url: processed.url,
        videoUrl: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        bucket: processed.bucket,
        path: processed.path,
        thumbnailPath: processed.thumbnailPath,
        media_type: 'video',
      });
    }

    const bucket = isVideo ? 'videos' : 'images';
    const ext = (resolvedFile.filename || 'bin').split('.').pop() || 'bin';
    const uuid = randomUUID();
    const filePath = `posts/${uuid}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(filePath, buffer, { contentType: resolvedFile.mimetype, upsert: false });
    if (uploadError) {
      request.log.error({ msg: 'Upload error', error: uploadError });
      return reply.status(500).send({ success: false, error: uploadError.message || 'Storage upload failed' });
    }

    const { data: publicData, error: publicError } = await supabase.storage.from(bucket).getPublicUrl(filePath);
    if (publicError) {
      request.log.error({ msg: 'getPublicUrl error', error: publicError });
      return reply.status(500).send({ success: false, error: publicError.message || 'Failed to obtain public URL' });
    }

    const publicUrl = publicData?.publicUrl || publicData?.publicURL || publicData?.public_url || null;
    if (!publicUrl) {
      request.log.error({ msg: 'Public URL missing after getPublicUrl', publicData });
      return reply.status(500).send({ success: false, error: 'Failed to obtain public URL' });
    }

    request.log.info({ msg: 'Upload completed', url: publicUrl, bucket, path: filePath });

    // Ajouter headers CORS pour compatibilité Flutter (images et vidéos)
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Headers', 'Range, Content-Type');
    reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    reply.code(201).send({ success: true, url: publicUrl, bucket, path: filePath });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({ success: false, error: (error as Error).message });
  }
};

export const getUploadJob = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  const job = await getVideoProcessingJobStatus(request.params.id);

  if (!job) {
    return reply.status(404).send({
      success: false,
      error: 'Upload job not found',
    });
  }

  reply.send({
    success: true,
    data: job,
  });
};

/**
 * Lister les posts (public)
 */
export const listPosts = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const user = (request.user as any) || null;

    // Check for query parameters: entity_id, entity_type, limit
    const query = request.query as any;
    const entityId = query?.entity_id;
    const entityType = query?.entity_type;
    const limit = clampPostLimit(query?.limit);

    // If entity_id and entity_type are provided, filter by entity
    if (entityId && entityType) {
      const posts = await PostsService.listPostsByEntity(
        supabase,
        entityId,
        entityType === 'universite' ? 'universite' : 'centre',
        limit
      );
      reply.send({ success: true, data: posts });
      return;
    }

    // Apply strict organisation-scoped filter:
    // - If user.role === 'universite' => filter author_type='universite' and author_id=user.id
    // - If user.role === 'centre_formation' => filter author_type='centre_formation' and author_id=user.id
    // - Otherwise (admin, public, etc.) => no filter (see all posts)
    let filter: any = undefined;
    try {
      const role = (user && user.role) ? user.role.toString().toLowerCase() : '';
      if (role === 'universite') {
        filter = { author_type: 'universite', author_id: user.id };
      } else if (role === 'centre_formation') {
        filter = { author_type: 'centre_formation', author_id: user.id };
      }
    } catch (e) {
      request.log.warn({ msg: 'Could not determine user role for post filtering', error: e });
    }

    const posts = await PostsService.listPosts(supabase, limit, filter);
    reply.send({ success: true, data: posts });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ success: false, error: (error as Error).message });
  }
};

/**
 * Récupérer un post
 */
export const getPost = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;

    const post = await PostsService.getPost(supabase, request.params.id);

    reply.send({
      success: true,
      data: post,
    });
  } catch (error) {
    request.log.error(error);
    reply.status(404).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Mettre à jour un post
 */
export const updatePost = async (
  request: FastifyRequest<{ Params: { id: string }; Body: PostsService.UpdatePostPayload }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    const post = await PostsService.updatePost(
      supabase,
      request.params.id,
      user.id,
      request.body
    );

    reply.send({
      success: true,
      data: post,
    });
  } catch (error) {
    request.log.error(error);
    const statusCode = (error as Error).message.includes('Unauthorized') ? 403 : 400;
    reply.status(statusCode).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Supprimer un post
 */
export const deletePost = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;

    await PostsService.deletePost(supabase, request.params.id, user.id);

    reply.send({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    const statusCode = (error as Error).message.includes('Unauthorized') ? 403 : 400;
    reply.status(statusCode).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Créer un commentaire sur un post
 * POST /posts/:id/comments
 */
export const createSignedUrl = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabaseDefault = (request.server as any).supabase;
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    const supabase = serviceKey ? createClient(supabaseUrl, serviceKey) : supabaseDefault;

    const bodyAny: any = (request.body as any) || {};
    const bucket = (bodyAny.bucket || 'videos').toString();
    const path = bodyAny.path || bodyAny.filePath || bodyAny.key;
    const expires = Number(bodyAny.expires || 60);

    if (!path) return reply.status(400).send({ success: false, error: 'Missing path parameter' });

    request.log.info({ msg: 'Creating signed URL', bucket, path, expires });

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
    if (error) {
      request.log.error({ msg: 'createSignedUrl error', error });
      return reply.status(500).send({ success: false, error: error.message || 'Failed to create signed URL' });
    }

    return reply.send({ success: true, signedUrl: data?.signedUrl });
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ success: false, error: (err as Error).message });
  }
};

// --- new handlers below ---

export const createComment = async (
  request: FastifyRequest<{ Params: { id: string }; Body: { contenu?: string; commentaire?: string; content?: string; parent_comment_id?: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = (request.user as any);
    // 🔥 Use service role client to bypass RLS (backend is trusted)
    const supabase = (request.server as any).supabaseAdmin;
    const contenu =
      (request.body as any)?.contenu ||
      (request.body as any)?.commentaire ||
      (request.body as any)?.content ||
      '';
    const parentCommentId = (request.body as any)?.parent_comment_id || null;

    if (!contenu || typeof contenu !== 'string') {
      return reply.status(400).send({ success: false, error: 'contenu is required' });
    }

    const comment = await PostsService.createComment(
      supabase,
      user.id,
      request.params.id,
      contenu,
      parentCommentId,
      user.role
    );
    reply.status(201).send({ success: true, data: comment });
  } catch (error) {
    request.log.error(error);
    reply.status(400).send({ success: false, error: (error as Error).message });
  }
};

/**
 * List comments for a post (public)
 * GET /posts/:id/comments
 */
export const listComments = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const limit = Number((request.query as any)?.limit || 50);
    const scope = ((request.query as any)?.scope || '').toString().toLowerCase();
    let comments: any[];

    if (scope === 'viewer') {
      const viewer = await resolveAuthenticatedUser(request);
      if (!viewer) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required for viewer-scoped comments',
        });
      }

      comments = await PostsService.listViewerScopedComments(
        supabase,
        request.params.id,
        viewer.id,
        limit
      );
    } else {
      comments = await PostsService.listComments(
        supabase,
        request.params.id,
        limit
      );
    }

    reply.send({ success: true, data: comments });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ success: false, error: (error as Error).message });
  }
};

/**
 * Lister les posts par entité (université ou centre)
 * Query params: entity_id, entity_type, limit
 */
export const listPostsByEntity = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const supabase = (request.server as any).supabaseAdmin;
    const query = request.query as any;

    const entityId = query?.entity_id;
    const entityType = query?.entity_type;
    const limit = clampPostLimit(query?.limit);

    if (!entityId || !entityType) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required query parameters: entity_id, entity_type',
      });
    }

    const posts = await PostsService.listPostsByEntity(
      supabase,
      entityId,
      entityType === 'universite' ? 'universite' : 'centre',
      limit
    );

    reply.send({ success: true, data: posts });
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ success: false, error: (error as Error).message });
  }
};
