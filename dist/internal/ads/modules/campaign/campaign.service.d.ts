import { SupabaseClient } from '@supabase/supabase-js';
export interface Campaign {
    id?: string;
    title: string;
    description?: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    destination?: 'carousel' | 'shorts';
    carousel_slot?: number;
    click_url?: string;
    contacts?: string;
    lien?: string;
    target_gender?: string;
    target_user_type?: string;
    target_users?: string[];
    min_age?: number;
    max_age?: number;
    target_age?: number;
    age_tolerance?: number;
    location?: string;
    status?: 'active' | 'inactive';
    created_at?: string;
    institution_id?: string;
    institution_type?: 'universite' | 'centre_formation';
    send_notifications?: boolean;
    notification_message?: string;
}
export declare class CampaignService {
    private supabase;
    constructor(supabase: SupabaseClient);
    createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign>;
    /**
     * Envoyer les notifications pour une campagne lancée
     */
    private notifyCampaignLaunch;
    getCampaigns(limit?: number, offset?: number): Promise<{
        campaigns: Campaign[];
        total: number;
    }>;
    getCampaignById(id: string): Promise<Campaign | null>;
    updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign>;
    deleteCampaign(id: string): Promise<void>;
    /**
     * Envoyer les notifications manuellement pour une campagne existante
     * Utile pour tester ou renvoyer les notifications
     */
    sendCampaignNotifications(campaignId: string): Promise<{
        success: boolean;
        deliveredCount: number;
        message: string;
    }>;
}
//# sourceMappingURL=campaign.service.d.ts.map