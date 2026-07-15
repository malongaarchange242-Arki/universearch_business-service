// src/modules/delivery/delivery.service.ts

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

interface StoredProfileRow {
  profile_type?: string | null;
  genre?: string | null;
  date_naissance?: string | null;
  quartier?: string | null;
}

interface StoredUserRow {
  user_type?: string | null;
}

export class DeliveryService {
  private readonly SUPABASE_TIMEOUT_MS = 5000; // 5 seconds timeout

  constructor(private supabase: SupabaseClient) {}

  private applyLimit<T>(items: T[], limit?: number | null): T[] {
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
      return items;
    }

    return items.slice(0, limit);
  }

  private normalizeGender(value?: string | null): string | undefined {
    if (!value) return undefined;

    const normalized = String(value).trim().toLowerCase();
    const genderMap: Record<string, string> = {
      homme: 'men',
      femme: 'women',
      male: 'men',
      female: 'women',
      men: 'men',
      women: 'women',
    };

    return genderMap[normalized] || normalized;
  }

  private normalizeUserType(value?: string | null): string | undefined {
    if (!value) return undefined;

    const normalized = String(value).trim().toLowerCase();
    return normalized || undefined;
  }

  private calculateAge(dateNaissance?: string | null): number | undefined {
    if (!dateNaissance) return undefined;

    const birthDate = new Date(dateNaissance);
    if (Number.isNaN(birthDate.getTime())) {
      return undefined;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();

    if (
      monthDelta < 0 ||
      (monthDelta === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 0 || age > 120) {
      return undefined;
    }

    return age;
  }

  private resolveNumericValue(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private matchesAgeTargeting(campaign: any, userProfile: UserProfile): boolean {
    const userAge = this.resolveNumericValue(userProfile.age);
    const minAge = this.resolveNumericValue(campaign.min_age);
    const maxAge = this.resolveNumericValue(campaign.max_age);
    const targetAge = this.resolveNumericValue(campaign.target_age);
    const ageTolerance = this.resolveNumericValue(campaign.age_tolerance);
    const hasRangeTargeting = minAge !== undefined || maxAge !== undefined;
    const hasToleranceTargeting = targetAge !== undefined && ageTolerance !== undefined;

    if (!hasRangeTargeting && !hasToleranceTargeting) {
      return true;
    }

    if (userAge === undefined) {
      const targetingDescription = hasRangeTargeting
        ? `min_age=${minAge ?? '-'}, max_age=${maxAge ?? '-'}`
        : `target_age=${targetAge}, age_tolerance=${ageTolerance}`;

      console.log(
        `[matchesUserProfile] Ad ${campaign.id} filtered: missing user age for ${targetingDescription}`
      );
      return false;
    }

    if (hasRangeTargeting) {
      if (minAge !== undefined && userAge < minAge) {
        console.log(
          `[matchesUserProfile] Ad ${campaign.id} filtered: age below minimum (min_age=${minAge}, user_age=${userAge})`
        );
        return false;
      }

      if (maxAge !== undefined && userAge > maxAge) {
        console.log(
          `[matchesUserProfile] Ad ${campaign.id} filtered: age above maximum (max_age=${maxAge}, user_age=${userAge})`
        );
        return false;
      }

      return true;
    }

    const toleratedMinAge = targetAge! - ageTolerance!;
    const toleratedMaxAge = targetAge! + ageTolerance!;

    if (userAge < toleratedMinAge || userAge > toleratedMaxAge) {
      console.log(
        `[matchesUserProfile] Ad ${campaign.id} filtered: target age mismatch (target_age=${targetAge}, age_tolerance=${ageTolerance}, user_age=${userAge})`
      );
      return false;
    }

    return true;
  }

  private sanitizeUserProfile(userProfile: UserProfile): UserProfile {
    return Object.fromEntries(
      Object.entries(userProfile).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
    ) as UserProfile;
  }

  private async enrichUserProfile(userProfile: UserProfile): Promise<UserProfile> {
    if (!userProfile.user_id) {
      return this.sanitizeUserProfile(userProfile);
    }

    const enrichedProfile: UserProfile = { ...userProfile };

    try {
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .select('profile_type, genre, date_naissance, quartier')
        .eq('id', userProfile.user_id)
        .maybeSingle<StoredProfileRow>();

      if (profileError) {
        console.warn(
          `[enrichUserProfile] Failed to fetch profile ${userProfile.user_id}: ${profileError.message}`
        );
        return this.sanitizeUserProfile(enrichedProfile);
      }

      if (!enrichedProfile.gender) {
        enrichedProfile.gender = this.normalizeGender(profileData?.genre);
      }

      if (!enrichedProfile.quartier && profileData?.quartier) {
        enrichedProfile.quartier = profileData.quartier;
      }

      if (typeof enrichedProfile.age !== 'number') {
        enrichedProfile.age = this.calculateAge(profileData?.date_naissance);
      }

      if (!enrichedProfile.user_type && profileData?.profile_type === 'utilisateur') {
        const { data: userData, error: userError } = await this.supabase
          .from('utilisateurs')
          .select('user_type')
          .eq('id', userProfile.user_id)
          .maybeSingle<StoredUserRow>();

        if (userError) {
          console.warn(
            `[enrichUserProfile] Failed to fetch user_type ${userProfile.user_id}: ${userError.message}`
          );
          return this.sanitizeUserProfile(enrichedProfile);
        }

        enrichedProfile.user_type = this.normalizeUserType(userData?.user_type);
      }
    } catch (error) {
      console.warn(
        `[enrichUserProfile] Unexpected enrichment error for ${userProfile.user_id}: ${
          (error as Error).message
        }`
      );
    }

    return this.sanitizeUserProfile(enrichedProfile);
  }

  private async getAdViewsCount(adId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('ads_views')
        .select('id', { count: 'exact', head: true })
        .eq('ad_id', adId);

      if (error) {
        console.warn(`Failed to fetch ad views count for ${adId}: ${error.message}`);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.warn(`Failed to fetch ad views count for ${adId}: ${(error as Error).message}`);
      return 0;
    }
  }

  private async getAdLikesCount(adId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('ads_likes')
        .select('id', { count: 'exact', head: true })
        .eq('ad_id', adId);

      if (error) {
        console.warn(`Failed to fetch ad likes count for ${adId}: ${error.message}`);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.warn(`Failed to fetch ad likes count for ${adId}: ${(error as Error).message}`);
      return 0;
    }
  }

  private async getAdCommentsCount(adId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('ads_comments')
        .select('id', { count: 'exact', head: true })
        .eq('ad_id', adId);

      if (error) {
        console.warn(`Failed to fetch ad comments count for ${adId}: ${error.message}`);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.warn(`Failed to fetch ad comments count for ${adId}: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Ignore les placeholders et les URLs non exploitables pour le carousel.
   */
  private hasUsableCarouselImage(campaign: any): boolean {
    const mediaUrl = String(campaign?.media_url || '').trim();
    const mediaType = String(campaign?.media_type || '').trim().toLowerCase();

    if (!mediaUrl) {
      return false;
    }

    if (mediaType && mediaType !== 'image') {
      return false;
    }

    if (mediaUrl.includes('via.placeholder.com')) {
      return false;
    }

    return true;
  }

  /**
   * Filtre une campagne en fonction du profil utilisateur
   */
  private matchesUserProfile(campaign: any, userProfile: UserProfile): boolean {
    // Check specific user targeting first
    if (campaign.target_users && Array.isArray(campaign.target_users) && campaign.target_users.length > 0) {
      if (!userProfile.user_id || !campaign.target_users.includes(userProfile.user_id)) {
        console.log(`[matchesUserProfile] Ad ${campaign.id} filtered: specific user targeting mismatch`);
        return false;
      }
    }

    // Gender matching
    const campaignGender = this.normalizeGender(String(campaign.target_gender || '').trim().toLowerCase());
    if (campaignGender && !['all', 'tous', 'toutes'].includes(campaignGender)) {
      const userGender = this.normalizeGender(userProfile.gender);
      if (!userGender || userGender !== campaignGender) {
        console.log(`[matchesUserProfile] Ad ${campaign.id} filtered: gender mismatch (ad="${campaignGender}", user="${userProfile.gender}")`);
        return false;
      }
    }

    // User type matching (bachelier / etudiant / parent)
    const campaignUserType = String(campaign.target_user_type || '').trim().toLowerCase();
    if (campaignUserType && !['all', 'tous', 'toutes'].includes(campaignUserType)) {
      const userType = String(userProfile.user_type || '').trim().toLowerCase();
      if (!userType || userType !== campaignUserType) {
        console.log(`[matchesUserProfile] Ad ${campaign.id} filtered: user_type mismatch (ad="${campaignUserType}", user="${userProfile.user_type}")`);
        return false;
      }
    }

    // Age matching
    if (!this.matchesAgeTargeting(campaign, userProfile)) {
      return false;
    }

    // Location matching
    const campaignLocation = String(campaign.location || '').trim().toLowerCase();
    if (campaignLocation && !['all', 'tous', 'toutes'].includes(campaignLocation)) {
      const userLocation = String(userProfile.location || '').trim().toLowerCase();
      if (!userLocation || userLocation !== campaignLocation) {
        console.log(`[matchesUserProfile] Ad ${campaign.id} filtered: location mismatch (ad="${campaignLocation}", user="${userProfile.location}")`);
        return false;
      }
    }

    // Quartier matching
    const campaignQuartier = String(campaign.quartier || '').trim().toLowerCase();
    if (campaignQuartier && !['all', 'tous', 'toutes'].includes(campaignQuartier)) {
      const userQuartier = String(userProfile.quartier || '').trim().toLowerCase();
      if (!userQuartier || userQuartier !== campaignQuartier) {
        console.log(`[matchesUserProfile] Ad ${campaign.id} filtered: quartier mismatch (ad="${campaignQuartier}", user="${userProfile.quartier}")`);
        return false;
      }
    }

    console.log(`[matchesUserProfile] Ad ${campaign.id} PASSED filtering`);
    return true;
  }

  /**
   * Récupère les annonces pour le carousel sans limite artificielle.
   * Le filtrage se fait avant la réponse finale, et tous les résultats valides sont renvoyés.
   */
  async getCarouselAds(userProfile: UserProfile = {}, limit: number | null = null): Promise<CarouselAd[]> {
    try {
      const resolvedUserProfile = await this.enrichUserProfile(userProfile);

      // 1️⃣ FETCH: Récupérer TOUTES les annonces
      const queryPromise = this.supabase
        .from('ads_campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('destination', 'carousel')
        .order('carousel_slot', { ascending: true }); // Slots fixes 1..7

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), this.SUPABASE_TIMEOUT_MS)
      );

      const { data: campaigns, error } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        throw error;
      }

      if (!campaigns || campaigns.length === 0) {
        return [];
      }

      // 2️⃣ FILTER: Filtrer selon le profil utilisateur et la qualité media
      console.log(`[getCarouselAds] Total ads fetched: ${campaigns.length}`);
      console.log(`[getCarouselAds] User profile for filtering:`, resolvedUserProfile);
      
      const filteredCampaigns = (campaigns as any[]).filter((campaign: any) =>
        this.matchesUserProfile(campaign, resolvedUserProfile) &&
        this.hasUsableCarouselImage(campaign)
      );
      
      console.log(`[getCarouselAds] Ads after filtering: ${filteredCampaigns.length}`);

      // 3️⃣ LIMIT: Limiter seulement si un paramètre explicite est fourni.
      const visibleCampaigns = this.applyLimit(filteredCampaigns, limit);

      // Map to CarouselAd interface
      const ads: CarouselAd[] = visibleCampaigns.map((campaign, index) => ({
        id: campaign.id,
        campaignId: campaign.id,
        title: campaign.title,
        mediaUrl: campaign.media_url || '',
        clickUrl: campaign.click_url || '',
        // Expose optional fields used by clients: `lien` and `contacts`.
        // Prefer explicit campaign properties, fallback to common alternative columns.
        lien: (campaign.lien as any) || (campaign.links as any) || (campaign.link as any) || (campaign.url as any) || '',
        contacts: (campaign.contacts as any) || (campaign.carousel_1 as any) || (campaign.phone as any) || (campaign.tel as any) || '',
        position: Number.isInteger(campaign.carousel_slot)
          ? campaign.carousel_slot! - 1
          : index,
        description: campaign.description,
      }));

      return ads;
    } catch (error) {
      throw new Error(`Failed to fetch carousel ads: ${(error as Error).message}`);
    }
  }

  /**
   * Récupère les annonces pour les shorts (SANS limite par défaut)
   * ✅ CORRECT: FETCH → FILTER → LIMIT
   */
  async getShortsAds(
    userProfile: UserProfile = {},
    limit: number | null = null
  ): Promise<ShortsAd[]> {
    try {
      const resolvedUserProfile = await this.enrichUserProfile(userProfile);

      // 1️⃣ FETCH: Récupérer TOUTES les annonces
      const queryPromise = this.supabase
        .from('ads_campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('destination', 'shorts')
        .order('created_at', { ascending: false }); // Plus récentes d'abord

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), this.SUPABASE_TIMEOUT_MS)
      );

      const { data: campaigns, error } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        throw error;
      }

      if (!campaigns || campaigns.length === 0) {
        return [];
      }

      // 2️⃣ FILTER: Filtrer selon le profil utilisateur
      console.log(`[getShortsAds] Total ads fetched: ${campaigns.length}`);
      console.log(`[getShortsAds] User profile for filtering:`, resolvedUserProfile);
      
      const filteredCampaigns = (campaigns as any[]).filter((campaign: any) =>
        this.matchesUserProfile(campaign, resolvedUserProfile)
      );
      
      console.log(`[getShortsAds] Ads after filtering: ${filteredCampaigns.length}, requested limit: ${limit}`);

      // 3️⃣ LIMIT: Limiter à 3 résultats APRÈS filtrage
      const limitedCampaigns = this.applyLimit(filteredCampaigns, limit);

      // Map to ShortsAd interface
      const ads: ShortsAd[] = await Promise.all(
        limitedCampaigns.map(async (campaign) => ({
          id: campaign.id,
          campaignId: campaign.id,
          title: campaign.title,
          video: campaign.media_url || '',
          thumbnail:
            campaign.thumbnail_url ||
            `https://via.placeholder.com/300x200?text=${encodeURIComponent(campaign.title)}`,
          description: campaign.description,
          clickUrl: campaign.click_url || '',
          ad_type: campaign.ad_type || 'sponsored',
          views_count: await this.getAdViewsCount(campaign.id),
          likes_count: await this.getAdLikesCount(campaign.id),
          comments_count: await this.getAdCommentsCount(campaign.id),
        }))
      );

      return ads;
    } catch (error) {
      throw new Error(`Failed to fetch shorts ads: ${(error as Error).message}`);
    }
  }
}
