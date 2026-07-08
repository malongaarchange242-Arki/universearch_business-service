import { SupabaseClient } from '@supabase/supabase-js';
export interface CreatePostPayload {
    titre: string;
    description?: string | null;
    category?: string | null;
    hashtags?: string | string[] | null;
    media_url?: string | null;
    thumbnail_url?: string | null;
    media_type?: 'image' | 'video' | null;
    media_processing_status?: 'queued' | 'processing' | 'completed' | 'failed' | null;
    media_processing_error?: string | null;
}
export interface UpdatePostPayload {
    titre?: string;
    description?: string | null;
    category?: string | null;
    hashtags?: string | string[] | null;
    media_url?: string | null;
    thumbnail_url?: string | null;
    media_type?: 'image' | 'video' | null;
    media_processing_status?: 'queued' | 'processing' | 'completed' | 'failed' | null;
    media_processing_error?: string | null;
    statut?: string;
}
export interface PostResponse {
    id: string;
    author_id: string;
    author_type: string;
    titre: string;
    description: string | null;
    category?: string | null;
    hashtags?: string | string[] | null;
    contenu: string;
    media_url: string | null;
    thumbnail_url?: string | null;
    media_type: string | null;
    media_processing_status?: string | null;
    media_processing_error?: string | null;
    statut: string;
    date_creation: string;
    likes_count?: number;
    comments_count?: number;
    shares_count?: number;
    views_count?: number;
}
export declare const createPost: (supabase: SupabaseClient, authorId: string, authorType: string, payload: CreatePostPayload) => Promise<PostResponse>;
/**
 * Lister les posts (rÃƒÂ©cupÃƒÂ©ration publique)
 */
export declare const listPosts: (supabase: SupabaseClient, limit?: number, filter?: {
    author_id?: string;
    author_type?: string;
}) => Promise<PostResponse[]>;
/**
 * Lister les posts par entitÃƒÂ© (universitÃƒÂ© ou centre)
 */
export declare const listPostsByEntity: (supabase: SupabaseClient, entityId: string, entityType: "universite" | "centre", limit?: number) => Promise<PostResponse[]>;
/**
 * CrÃƒÂ©er un commentaire pour un post
 */
export declare const createComment: (supabase: SupabaseClient, userId: string, postId: string, contenu: string, parentCommentId?: string | null, actorRole?: string | null) => Promise<any>;
/**
 * Lister les commentaires d'un post (public)
 */
export declare const listComments: (supabase: SupabaseClient, postId: string, limit?: number) => Promise<any[]>;
export declare const listViewerScopedComments: (supabase: SupabaseClient, postId: string, viewerUserId: string, limit?: number) => Promise<any[]>;
/**
 * RÃƒÂ©cupÃƒÂ©rer un post par ID
 */
export declare const getPost: (supabase: SupabaseClient, postId: string) => Promise<PostResponse & {
    likes_count: number;
    comments_count: number;
    shares_count: number;
    views_count: number;
}>;
/**
 * Mettre ÃƒÂ  jour un post
 */
export declare const updatePost: (supabase: SupabaseClient, postId: string, authorId: string, payload: UpdatePostPayload) => Promise<PostResponse>;
/**
 * Supprimer un post
 */
export declare const deletePost: (supabase: SupabaseClient, postId: string, authorId: string) => Promise<void>;
//# sourceMappingURL=posts.service.d.ts.map