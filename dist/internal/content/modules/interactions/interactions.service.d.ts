import { SupabaseClient } from '@supabase/supabase-js';
export interface LikeResponse {
    id: string;
    post_id: string;
    user_id: string;
    created_at: string;
}
export interface CommentPayload {
    commentaire: string;
}
export interface CommentResponse {
    id: string;
    post_id: string;
    user_id: string;
    commentaire: string;
    date_comment: string;
}
export interface ViewPayload {
    view_duration?: number | null;
}
export interface PostViewResponse {
    id: string;
    post_id: string;
    user_id: string | null;
    view_duration: number | null;
    date_view: string;
}
export type ViewCooldownType = 'post' | 'profile' | 'ad';
export declare const getViewCooldownMs: (type: ViewCooldownType) => number;
export declare const isPostLikedByUser: (supabase: SupabaseClient, postId: string, userId: string) => Promise<boolean>;
/**
 * Aimer un post
 */
export declare const likePost: (supabase: SupabaseClient, postId: string, userId: string) => Promise<LikeResponse>;
/**
 * Retirer un like
 */
export declare const unlikePost: (supabase: SupabaseClient, postId: string, userId: string) => Promise<void>;
/**
 * Commenter un post
 */
export declare const commentPost: (supabase: SupabaseClient, postId: string, userId: string, payload: CommentPayload) => Promise<CommentResponse>;
/**
 * Récupérer les commentaires d'un post
 */
export declare const getComments: (supabase: SupabaseClient, postId: string, page?: number, limit?: number) => Promise<{
    data: CommentResponse[];
    total: number;
    page: number;
    limit: number;
}>;
/**
 * Enregistrer une vue sur un post
 */
export declare const recordPostView: (supabase: SupabaseClient, postId: string, userId: string | null, payload?: ViewPayload) => Promise<PostViewResponse>;
/**
 * Récupérer les vues d'un post
 */
export declare const getPostViews: (supabase: SupabaseClient, postId: string, page?: number, limit?: number) => Promise<{
    data: PostViewResponse[];
    total: number;
    page: number;
    limit: number;
}>;
//# sourceMappingURL=interactions.service.d.ts.map