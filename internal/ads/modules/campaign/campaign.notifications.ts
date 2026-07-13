// src/modules/campaign/campaign.notifications.ts

import axios from 'axios';
import { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_NOTIFICATION_SERVICE_URL =
  'https://api.universearch.com';

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

interface BroadcastNotificationsResponse {
  count?: number;
  errors?: unknown[];
}

/**
 * Récupérer les utilisateurs à notifier selon les critères de ciblage
 */
export const getTargetUsers = async (
  supabase: SupabaseClient,
  targetAudience: 'followers' | 'all',
  instituteId?: string,
  ageFilters?: {
    minAge?: number;
    maxAge?: number;
  }
): Promise<string[]> => {
  try {
    let query: any = supabase.from('profiles').select('id');

    // Filtre par type d'utilisateur
    if (targetAudience === 'followers' && instituteId) {
      // Récupérer les followers de l'institution
      const { data: followers, error } = await supabase
        .from('followers_universites')
        .select('user_id')
        .eq('universite_id', instituteId);

      if (error) {
        console.error('Error fetching followers:', error);
        return [];
      }

      return (followers || []).map((f: any) => f.user_id);
    }

    // Filtre par âge si fourni
    if (ageFilters?.minAge) {
      query = query.gte('age', ageFilters.minAge);
    }
    if (ageFilters?.maxAge) {
      query = query.lte('age', ageFilters.maxAge);
    }

    // Exécuter la requête Supabase
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching target users:', error);
      return [];
    }

    const userIds = (data || []).map((u: any) => u.id);
    console.log(`🔔 getTargetUsers(${targetAudience}) found ${userIds.length} users`);
    return userIds;
  } catch (err) {
    console.error('Error in getTargetUsers:', err);
    return [];
  }
};

/**
 * Récupérer les informations des utilisateurs (id, nom, prenom)
 */
const getUsersInfo = async (
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ id: string; prenom?: string; nom?: string }[]> => {
  if (userIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, prenom, nom')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching user info:', error);
      return userIds.map(id => ({ id }));
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUsersInfo:', err);
    return userIds.map(id => ({ id }));
  }
};

/**
 * Déterminer si c'est le matin ou le soir selon l'heure actuelle
 */
const getTimeGreeting = (): 'matin' | 'soir' => {
  const hour = new Date().getHours();
  
  // Matin: 5h à 17h59
  // Soir: 18h à 4h59
  if (hour >= 5 && hour < 18) {
    return 'matin';
  }
  return 'soir';
};

/**
 * Construire un message personnalisé avec le nom de l'utilisateur et le moment de la journée
 */
const buildPersonalizedMessage = (
  userName?: string,
  customMessage?: string
): string => {
  const baseMessage =
    customMessage ||
    'Une nouvelle annonce est disponible. Découvrez-la sur la page d\'accueil.';

  if (!userName) return baseMessage;

  const greeting = getTimeGreeting() === 'matin' ? 'Bonjour' : 'Bonsoir';

  // Ajouter le nom de la personne au début du message
  return `${greeting} ${userName}, ${baseMessage.charAt(0).toLowerCase() + baseMessage.slice(1)}`;
};

/**
 * Envoyer des notifications broadcast pour une campagne avec personnalisation
 */
export const broadcastCampaignNotifications = async (
  supabase: SupabaseClient,
  userIds: string[],
  campaignId: string,
  campaignName: string,
  campaignTitle: string,
  campaignDescription: string,
  mediaUrl?: string | null,
  customMessage?: string
): Promise<{ success: boolean; deliveredCount: number; errors: unknown[] }> => {
  if (userIds.length === 0) {
    console.warn('No users to notify for campaign');
    return { success: true, deliveredCount: 0, errors: [] };
  }

  try {
    const notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL ||
      (process.env.NOTIFICATION_SERVICE_HOST
        ? `http://${process.env.NOTIFICATION_SERVICE_HOST}:${process.env.NOTIFICATION_SERVICE_PORT || '4000'}`
        : DEFAULT_NOTIFICATION_SERVICE_URL);

    const notificationServiceTimeoutMs = Number(
      process.env.NOTIFICATION_SERVICE_TIMEOUT_MS || 60000
    );

    console.log('🔔 ADS SERVICE NOTIFICATION_SERVICE_URL =', notificationServiceUrl);
    console.log(
      '🔔 ADS SERVICE NOTIFICATION_SERVICE_TIMEOUT_MS =',
      notificationServiceTimeoutMs
    );

    // Récupérer les infos des utilisateurs (prenom, nom)
    const usersInfo = await getUsersInfo(supabase, userIds);

    let deliveredCount = 0;
    const errors: unknown[] = [];

    // Envoyer les notifications individuellement avec personnalisation
    const chunkSize = 100; // Batch par 100 pour performance
    for (let i = 0; i < usersInfo.length; i += chunkSize) {
      const chunk = usersInfo.slice(i, i + chunkSize);

      for (const user of chunk) {
        const userName = user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.prenom || user.nom || 'Cher utilisateur';
        const personalizedMessage = buildPersonalizedMessage(userName, customMessage);

        const payload: CampaignNotificationPayload = {
          user_ids: [user.id],
          type: 'campaign',
          title: 'Nouvelle annonce',
          message: personalizedMessage,
          delivery_types: ['in_app', 'push'],
          data: {
            campaign_id: campaignId,
            campaign_name: campaignName,
            campaign_title: campaignTitle,
            campaign_description: campaignDescription,
            media_url: mediaUrl || null,
          },
        };

        try {
          const response = await axios.post<BroadcastNotificationsResponse>(
            `${notificationServiceUrl}/api/notifications/broadcast`,
            payload,
            {
              timeout: 30000, // 30 seconds per notification
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const broadcastResponse = response.data;
          if (typeof broadcastResponse?.count === 'number' && broadcastResponse.count > 0) {
            deliveredCount++;
          }

          if (Array.isArray(broadcastResponse?.errors) && broadcastResponse.errors.length > 0) {
            errors.push({
              userId: user.id,
              userName,
              errors: broadcastResponse.errors,
            });
          }
        } catch (err) {
          const detail = (err as any)?.response?.data ?? (err as any)?.message ?? err;
          errors.push({
            userId: user.id,
            userName,
            error: detail,
          });
        }
      }
    }

    if (errors.length > 0) {
      console.warn(
        `Campaign broadcast completed with ${errors.length} errors:`,
        errors.slice(0, 5) // Log only first 5 errors
      );
    }

    console.log(
      `Campaign notifications sent to ${deliveredCount}/${userIds.length} users`
    );

    return {
      success: errors.length === 0,
      deliveredCount,
      errors,
    };
  } catch (err) {
    const details =
      (err as any)?.response?.data ??
      (err as any)?.message ??
      (err as any)?.code ??
      err;

    console.error('Error broadcasting campaign notifications:', details);
    return {
      success: false,
      deliveredCount: 0,
      errors: [details],
    };
  }
};

/**
 * Récupérer info de l'institution qui lance la campagne
 */
export const getInstitutionInfo = async (
  supabase: SupabaseClient,
  instituteId: string,
  instituteType: 'universite' | 'centre_formation'
): Promise<{ name: string; sigle?: string } | null> => {
  try {
    const tableName =
      instituteType === 'universite' ? 'universites' : 'centres_formation';

    const { data, error } = await supabase
      .from(tableName)
      .select('nom, sigle')
      .eq('id', instituteId)
      .single();

    if (error) {
      console.error('Error fetching institution info:', error);
      return null;
    }

    return {
      name: data?.nom || instituteId,
      sigle: data?.sigle,
    };
  } catch (err) {
    console.error('Error in getInstitutionInfo:', err);
    return null;
  }
};
