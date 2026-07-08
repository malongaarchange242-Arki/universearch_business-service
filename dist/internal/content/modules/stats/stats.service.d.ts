import { SupabaseClient } from '@supabase/supabase-js';
export interface OrganizationViewsStats {
    organization_id: string;
    organization_type: 'universite' | 'centre_formation';
    total_posts: number;
    total_views: number;
}
export interface TopFollowerInteraction {
    user_id: string;
    display_name: string;
    likes: number;
    comments: number;
    views: number;
    shares: number;
    score: number;
    last_interaction_at: string | null;
}
export declare const getOrganizationViewsTotal: (supabase: SupabaseClient, organizationId: string, organizationType: "universite" | "centre_formation") => Promise<OrganizationViewsStats>;
export declare const getOrganizationTopFollowers: (supabase: SupabaseClient, organizationId: string, organizationType: "universite" | "centre_formation", limit?: number, contentAuthorId?: string | null) => Promise<TopFollowerInteraction[]>;
//# sourceMappingURL=stats.service.d.ts.map