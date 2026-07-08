// src/modules/analytics/analytics.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

export class AnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  async recordImpression(adId: string): Promise<void> {
    await this.incrementStat(adId, 'impressions');
  }

  async recordClick(adId: string): Promise<void> {
    await this.incrementStat(adId, 'clicks');
  }

  async recordView(adId: string, payload: AdViewPayload = {}): Promise<AdView> {
    await this.ensureCampaignExists(adId);
    await this.incrementStat(adId, 'views');

    const now = new Date().toISOString();
    const normalizedDuration =
      typeof payload.view_duration === 'number' && Number.isFinite(payload.view_duration)
        ? Math.max(0, Math.round(payload.view_duration))
        : 3;

    const { data, error } = await this.supabase
      .from('ads_views')
      .insert({
        id: randomUUID(),
        ad_id: adId,
        user_id: payload.user_id ?? null,
        view_duration: normalizedDuration,
        date_view: now,
      })
      .select()
      .single();

    if (error) throw error;

    return data as AdView;
  }

  private async incrementStat(adId: string, statType: 'impressions' | 'clicks' | 'views'): Promise<void> {
    // First, try to find existing stats for today
    const today = new Date().toISOString().split('T')[0];

    const { data: existingStats } = await this.supabase
      .from('ads_stats')
      .select('*')
      .eq('ad_id', adId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .single();

    if (existingStats) {
      // Update existing
      const { error } = await this.supabase
        .from('ads_stats')
        .update({
          [statType]: existingStats[statType] + 1,
        })
        .eq('id', existingStats.id);

      if (error) throw error;
    } else {
      // Create new
      const { error } = await this.supabase
        .from('ads_stats')
        .insert({
          ad_id: adId,
          [statType]: 1,
        });

      if (error) throw error;
    }
  }

  async getStats(adId: string): Promise<AdStats[]> {
    const { data, error } = await this.supabase
      .from('ads_stats')
      .select('*')
      .eq('ad_id', adId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAggregatedStats(adId: string): Promise<{ impressions: number; clicks: number; views: number }> {
    const { data, error } = await this.supabase
      .from('ads_stats')
      .select('impressions, clicks, views')
      .eq('ad_id', adId);

    if (error) throw error;

    return data.reduce(
      (acc, stat) => ({
        impressions: acc.impressions + stat.impressions,
        clicks: acc.clicks + stat.clicks,
        views: acc.views + stat.views,
      }),
      { impressions: 0, clicks: 0, views: 0 }
    );
  }

  async getViews(adId: string, limit: number = 20, page: number = 1): Promise<{
    data: AdView[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase
      .from('ads_views')
      .select('*', { count: 'exact' })
      .eq('ad_id', adId)
      .order('date_view', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: (data || []) as AdView[],
      total: count || 0,
      page,
      limit,
    };
  }

  async getViewsCount(adId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('ads_views')
      .select('*', { count: 'exact', head: true })
      .eq('ad_id', adId);

    if (error) throw error;
    return count || 0;
  }

  async recordLike(adId: string, payload: AdLikePayload = {}): Promise<AdLike> {
    await this.ensureCampaignExists(adId);

    // Check if already liked
    const { data: existingLike } = await this.supabase
      .from('ads_likes')
      .select('*')
      .eq('ad_id', adId)
      .eq('user_id', payload.user_id ?? null)
      .maybeSingle();

    if (existingLike) {
      throw new Error('Ad already liked by this user');
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('ads_likes')
      .insert({
        id: randomUUID(),
        ad_id: adId,
        user_id: payload.user_id ?? null,
        date_liked: now,
      })
      .select()
      .single();

    if (error) throw error;

    return data as AdLike;
  }

  async removeLike(adId: string, payload: AdLikePayload = {}): Promise<void> {
    const { error } = await this.supabase
      .from('ads_likes')
      .delete()
      .eq('ad_id', adId)
      .eq('user_id', payload.user_id ?? null);

    if (error) throw error;
  }

  async getLikes(adId: string, limit: number = 20, page: number = 1): Promise<{
    data: AdLike[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase
      .from('ads_likes')
      .select('*', { count: 'exact' })
      .eq('ad_id', adId)
      .order('date_liked', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: (data || []) as AdLike[],
      total: count || 0,
      page,
      limit,
    };
  }

  async getLikesCount(adId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('ads_likes')
      .select('*', { count: 'exact', head: true })
      .eq('ad_id', adId);

    if (error) throw error;
    return count || 0;
  }

  async postComment(adId: string, payload: AdCommentPayload): Promise<AdComment> {
    await this.ensureCampaignExists(adId);

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('ads_comments')
      .insert({
        id: randomUUID(),
        ad_id: adId,
        user_id: payload.user_id ?? null,
        content: payload.content,
        date_comment: now,
      })
      .select()
      .single();

    if (error) throw error;

    return data as AdComment;
  }

  async getComments(adId: string, limit: number = 20, page: number = 1): Promise<{
    data: AdComment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase
      .from('ads_comments')
      .select('*', { count: 'exact' })
      .eq('ad_id', adId)
      .order('date_comment', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: (data || []) as AdComment[],
      total: count || 0,
      page,
      limit,
    };
  }

  async getCommentsCount(adId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('ads_comments')
      .select('*', { count: 'exact', head: true })
      .eq('ad_id', adId);

    if (error) throw error;
    return count || 0;
  }

  private async ensureCampaignExists(adId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('ads_campaigns')
      .select('id')
      .eq('id', adId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Ad campaign not found');
  }
}
