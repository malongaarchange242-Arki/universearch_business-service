"use strict";
// src/modules/campaign/campaign.notifications.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstitutionInfo = exports.broadcastCampaignNotifications = exports.getTargetUsers = void 0;
const axios_1 = __importDefault(require("axios"));
const DEFAULT_NOTIFICATION_SERVICE_URL = 'https://universearch-notification-service-3zw2.onrender.com';
/**
 * Récupérer les utilisateurs à notifier selon les critères de ciblage
 */
const getTargetUsers = async (supabase, targetAudience, instituteId, ageFilters) => {
    try {
        let query = supabase.from('profiles').select('id');
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
            return (followers || []).map((f) => f.user_id);
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
        const userIds = (data || []).map((u) => u.id);
        console.log(`🔔 getTargetUsers(${targetAudience}) found ${userIds.length} users`);
        return userIds;
    }
    catch (err) {
        console.error('Error in getTargetUsers:', err);
        return [];
    }
};
exports.getTargetUsers = getTargetUsers;
/**
 * Envoyer des notifications broadcast pour une campagne
 */
const broadcastCampaignNotifications = async (userIds, campaignId, campaignName, campaignTitle, campaignDescription, mediaUrl, customMessage) => {
    if (userIds.length === 0) {
        console.warn('No users to notify for campaign');
        return { success: true, deliveredCount: 0, errors: [] };
    }
    try {
        const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL ||
            (process.env.NOTIFICATION_SERVICE_HOST
                ? `http://${process.env.NOTIFICATION_SERVICE_HOST}:${process.env.NOTIFICATION_SERVICE_PORT || '4000'}`
                : DEFAULT_NOTIFICATION_SERVICE_URL);
        const notificationServiceTimeoutMs = Number(process.env.NOTIFICATION_SERVICE_TIMEOUT_MS || 60000);
        console.log('🔔 ADS SERVICE NOTIFICATION_SERVICE_URL =', notificationServiceUrl);
        console.log('🔔 ADS SERVICE NOTIFICATION_SERVICE_TIMEOUT_MS =', notificationServiceTimeoutMs);
        const payload = {
            user_ids: userIds,
            type: 'campaign',
            title: 'Nouveau Post',
            message: customMessage ||
                'Universearch vient de faire une annonce, ça peut vous intéressez\nAccedez à la page d\'Accueil pour voir l\'annonce',
            delivery_types: ['in_app', 'push'],
            data: {
                campaign_id: campaignId,
                campaign_name: campaignName,
                campaign_title: campaignTitle,
                campaign_description: campaignDescription,
                media_url: mediaUrl || null,
            },
        };
        const response = await axios_1.default.post(`${notificationServiceUrl}/api/notifications/broadcast`, payload, {
            timeout: 60000, // 60 seconds
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const broadcastResponse = response.data;
        const deliveredCount = typeof broadcastResponse?.count === 'number'
            ? broadcastResponse.count
            : userIds.length;
        const errors = Array.isArray(broadcastResponse?.errors)
            ? broadcastResponse.errors
            : [];
        if (errors.length > 0) {
            console.warn('Campaign broadcast completed with partial errors:', errors);
        }
        console.log(`Campaign notifications sent to ${deliveredCount}/${userIds.length} users`);
        return {
            success: true,
            deliveredCount,
            errors,
        };
    }
    catch (err) {
        const details = err?.response?.data ??
            err?.message ??
            err?.code ??
            err;
        console.error('Error broadcasting campaign notifications:', details);
        return {
            success: false,
            deliveredCount: 0,
            errors: [details],
        };
    }
};
exports.broadcastCampaignNotifications = broadcastCampaignNotifications;
/**
 * Récupérer info de l'institution qui lance la campagne
 */
const getInstitutionInfo = async (supabase, instituteId, instituteType) => {
    try {
        const tableName = instituteType === 'universite' ? 'universites' : 'centres_formation';
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
    }
    catch (err) {
        console.error('Error in getInstitutionInfo:', err);
        return null;
    }
};
exports.getInstitutionInfo = getInstitutionInfo;
//# sourceMappingURL=campaign.notifications.js.map