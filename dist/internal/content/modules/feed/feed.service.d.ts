import { SupabaseClient } from '@supabase/supabase-js';
export interface FeedPost {
    id: string;
    author_id: string;
    author_type: string;
    titre: string | null;
    description: string | null;
    media_url: string | null;
    media_type: string | null;
    statut: string | null;
    date_creation: string;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    views_count: number;
}
export interface FeedResponse {
    data: FeedPost[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}
export declare const getFeed: (supabase: SupabaseClient, page?: number, limit?: number) => Promise<FeedResponse>;
export declare const getUniversitesFeed: (supabase: SupabaseClient, page?: number, limit?: number) => Promise<FeedResponse>;
export declare const getCentresFeed: (supabase: SupabaseClient, page?: number, limit?: number) => Promise<FeedResponse>;
export declare const getOrganizationFeed: (supabase: SupabaseClient, organizationId: string, organizationType: "universite" | "centre_formation", page?: number, limit?: number) => Promise<FeedResponse>;
//# sourceMappingURL=feed.service.d.ts.map