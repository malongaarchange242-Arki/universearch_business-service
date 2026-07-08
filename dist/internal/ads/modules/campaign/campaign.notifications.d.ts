import { SupabaseClient } from '@supabase/supabase-js';
export interface CampaignNotificationPayload {
    user_ids: string[];
    type: 'campaign';
    title: string;
    message: string;
    delivery_types: ('in_app' | 'push')[];
    data: {
        campaign_id: string;
        campaign_name: string;
        campaign_title: string;
        campaign_description: string;
        media_url?: string | null;
    };
}
/**
 * Récupérer les utilisateurs à notifier selon les critères de ciblage
 */
export declare const getTargetUsers: (supabase: SupabaseClient, targetAudience: "followers" | "all", instituteId?: string, ageFilters?: {
    minAge?: number;
    maxAge?: number;
}) => Promise<string[]>;
/**
 * Envoyer des notifications broadcast pour une campagne
 */
export declare const broadcastCampaignNotifications: (userIds: string[], campaignId: string, campaignName: string, campaignTitle: string, campaignDescription: string, mediaUrl?: string | null, customMessage?: string) => Promise<{
    success: boolean;
    deliveredCount: number;
    errors: unknown[];
}>;
/**
 * Récupérer info de l'institution qui lance la campagne
 */
export declare const getInstitutionInfo: (supabase: SupabaseClient, instituteId: string, instituteType: "universite" | "centre_formation") => Promise<{
    name: string;
    sigle?: string;
} | null>;
//# sourceMappingURL=campaign.notifications.d.ts.map