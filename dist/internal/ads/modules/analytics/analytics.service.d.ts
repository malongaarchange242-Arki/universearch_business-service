import { SupabaseClient } from '@supabase/supabase-js';
export interface AdStats {
    id: string;
    ad_id: string;
    impressions: number;
    clicks: number;
    views: number;
    created_at: string;
}
export interface AdView {
    id: string;
    ad_id: string;
    user_id: string | null;
    view_duration: number | null;
    date_view: string;
}
export interface AdViewPayload {
    view_duration?: number | null;
    user_id?: string | null;
}
export interface AdLikePayload {
    user_id?: string | null;
}
export interface AdCommentPayload {
    user_id?: string | null;
    content: string;
}
export interface AdLike {
    id: string;
    ad_id: string;
    user_id: string | null;
    date_liked: string;
}
export interface AdComment {
    id: string;
    ad_id: string;
    user_id: string | null;
    content: string;
    date_comment: string;
}
export declare class AnalyticsService {
    private supabase;
    constructor(supabase: SupabaseClient);
    recordImpression(adId: string): Promise<void>;
    recordClick(adId: string): Promise<void>;
    recordView(adId: string, payload?: AdViewPayload): Promise<AdView>;
    private incrementStat;
    getStats(adId: string): Promise<AdStats[]>;
    getAggregatedStats(adId: string): Promise<{
        impressions: number;
        clicks: number;
        views: number;
    }>;
    getViews(adId: string, limit?: number, page?: number): Promise<{
        data: AdView[];
        total: number;
        page: number;
        limit: number;
    }>;
    getViewsCount(adId: string): Promise<number>;
    recordLike(adId: string, payload?: AdLikePayload): Promise<AdLike>;
    removeLike(adId: string, payload?: AdLikePayload): Promise<void>;
    getLikes(adId: string, limit?: number, page?: number): Promise<{
        data: AdLike[];
        total: number;
        page: number;
        limit: number;
    }>;
    getLikesCount(adId: string): Promise<number>;
    postComment(adId: string, payload: AdCommentPayload): Promise<AdComment>;
    getComments(adId: string, limit?: number, page?: number): Promise<{
        data: AdComment[];
        total: number;
        page: number;
        limit: number;
    }>;
    getCommentsCount(adId: string): Promise<number>;
    private ensureCampaignExists;
}
//# sourceMappingURL=analytics.service.d.ts.map