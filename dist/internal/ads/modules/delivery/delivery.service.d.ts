import { SupabaseClient } from '@supabase/supabase-js';
export interface CarouselAd {
    id: string;
    campaignId: string;
    title: string;
    mediaUrl: string;
    clickUrl: string;
    lien?: string;
    contacts?: string;
    position?: number;
    description?: string;
}
export interface ShortsAd {
    id: string;
    campaignId?: string;
    video: string;
    thumbnail: string;
    title: string;
    description?: string;
    clickUrl?: string;
    ad_type?: string;
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
}
interface UserProfile {
    gender?: string;
    user_type?: string;
    user_id?: string;
    age?: number;
    location?: string;
    quartier?: string;
}
export declare class DeliveryService {
    private supabase;
    private readonly SUPABASE_TIMEOUT_MS;
    constructor(supabase: SupabaseClient);
    private applyLimit;
    private normalizeGender;
    private normalizeUserType;
    private calculateAge;
    private resolveNumericValue;
    private matchesAgeTargeting;
    private sanitizeUserProfile;
    private enrichUserProfile;
    private getAdViewsCount;
    private getAdLikesCount;
    private getAdCommentsCount;
    /**
     * Ignore les placeholders et les URLs non exploitables pour le carousel.
     */
    private hasUsableCarouselImage;
    /**
     * Filtre une campagne en fonction du profil utilisateur
     */
    private matchesUserProfile;
    /**
     * Récupère les annonces pour le carousel sans limite artificielle.
     * Le filtrage se fait avant la réponse finale, et tous les résultats valides sont renvoyés.
     */
    getCarouselAds(userProfile?: UserProfile, limit?: number | null): Promise<CarouselAd[]>;
    /**
     * Récupère les annonces pour les shorts (SANS limite par défaut)
     * ✅ CORRECT: FETCH → FILTER → LIMIT
     */
    getShortsAds(userProfile?: UserProfile, limit?: number | null): Promise<ShortsAd[]>;
}
export {};
//# sourceMappingURL=delivery.service.d.ts.map