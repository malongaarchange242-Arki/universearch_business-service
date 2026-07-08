import { FastifyRequest, FastifyReply } from 'fastify';
import * as PostsService from './posts.service';
/**
 * Créer un post
 */
export declare const createPost: (request: FastifyRequest<{
    Body: PostsService.CreatePostPayload;
}>, reply: FastifyReply) => Promise<void>;
/**
 * Upload a file server-side to Supabase Storage and return its public URL
 * Expects multipart/form-data with field `file`.
 */
export declare const uploadFile: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const getUploadJob: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Lister les posts (public)
 */
export declare const listPosts: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Récupérer un post
 */
export declare const getPost: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Mettre à jour un post
 */
export declare const updatePost: (request: FastifyRequest<{
    Params: {
        id: string;
    };
    Body: PostsService.UpdatePostPayload;
}>, reply: FastifyReply) => Promise<void>;
/**
 * Supprimer un post
 */
export declare const deletePost: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Créer un commentaire sur un post
 * POST /posts/:id/comments
 */
export declare const createSignedUrl: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const createComment: (request: FastifyRequest<{
    Params: {
        id: string;
    };
    Body: {
        contenu?: string;
        commentaire?: string;
        content?: string;
        parent_comment_id?: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * List comments for a post (public)
 * GET /posts/:id/comments
 */
export declare const listComments: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Lister les posts par entité (université ou centre)
 * Query params: entity_id, entity_type, limit
 */
export declare const listPostsByEntity: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=posts.controller.d.ts.map