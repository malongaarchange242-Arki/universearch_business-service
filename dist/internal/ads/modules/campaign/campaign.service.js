"use strict";
// src/modules/campaign/campaign.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const campaign_notifications_1 = require("./campaign.notifications");
class CampaignService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createCampaign(campaign) {
        if (campaign.destination === 'carousel') {
            const slotToUse = campaign.carousel_slot;
            if (slotToUse !== undefined) {
                const { data: existingCampaign, error: fetchError } = await this.supabase
                    .from('ads_campaigns')
                    .select('*')
                    .eq('destination', 'carousel')
                    .eq('carousel_slot', slotToUse)
                    .maybeSingle();
                if (fetchError) {
                    throw fetchError;
                }
                if (existingCampaign) {
                    const updates = {
                        title: campaign.title,
                        description: campaign.description,
                        media_url: campaign.media_url,
                        media_type: campaign.media_type,
                        click_url: campaign.click_url,
                        target_user_type: campaign.target_user_type,
                        target_users: campaign.target_users,
                        min_age: campaign.min_age,
                        max_age: campaign.max_age,
                        target_age: campaign.target_age,
                        age_tolerance: campaign.age_tolerance,
                        location: campaign.location,
                        status: campaign.status,
                        send_notifications: campaign.send_notifications,
                        notification_message: campaign.notification_message,
                    };
                    const { data, error } = await this.supabase
                        .from('ads_campaigns')
                        .update(updates)
                        .eq('destination', 'carousel')
                        .eq('carousel_slot', slotToUse)
                        .select()
                        .single();
                    if (error) {
                        throw error;
                    }
                    const updatedCampaign = data;
                    console.log('📱 Carousel slot updated:', updatedCampaign.id);
                    console.log('   send_notifications:', campaign.send_notifications);
                    if (campaign.send_notifications) {
                        setTimeout(async () => {
                            try {
                                await this.notifyCampaignLaunch(updatedCampaign, campaign);
                            }
                            catch (err) {
                                console.error('❌ Error in scheduled campaign notification:', err);
                            }
                        }, 100);
                    }
                    return updatedCampaign;
                }
            }
            const { data: usedSlots, error: usedSlotsError } = await this.supabase
                .from('ads_campaigns')
                .select('carousel_slot')
                .eq('destination', 'carousel');
            if (usedSlotsError) {
                throw usedSlotsError;
            }
            const occupiedSlots = new Set(Array.isArray(usedSlots)
                ? usedSlots.map((row) => Number(row.carousel_slot)).filter((v) => Number.isInteger(v))
                : []);
            const nextSlot = slotToUse !== undefined
                ? slotToUse
                : (() => {
                    const firstFree = [1, 2, 3, 4, 5, 6, 7].find((slot) => !occupiedSlots.has(slot));
                    if (firstFree !== undefined) {
                        return firstFree;
                    }
                    const maxUsed = Array.from(occupiedSlots).reduce((max, value) => Math.max(max, value), 0);
                    return maxUsed + 1;
                })();
            const campaignWithSlot = {
                ...campaign,
                carousel_slot: nextSlot,
            };
            const { data, error } = await this.supabase
                .from('ads_campaigns')
                .insert(campaignWithSlot)
                .select()
                .single();
            if (error) {
                throw error;
            }
            const createdCampaign = data;
            console.log('📱 Carousel campaign created with slot:', createdCampaign.carousel_slot);
            console.log('   send_notifications:', campaign.send_notifications);
            if (campaign.send_notifications) {
                setTimeout(async () => {
                    try {
                        await this.notifyCampaignLaunch(createdCampaign, campaign);
                    }
                    catch (err) {
                        console.error('❌ Error in scheduled campaign notification:', err);
                    }
                }, 100);
            }
            return createdCampaign;
        }
        const { data, error } = await this.supabase
            .from('ads_campaigns')
            .insert(campaign)
            .select()
            .single();
        if (error) {
            throw error;
        }
        const createdCampaign = data;
        console.log('📱 Campaign created:', createdCampaign.id);
        console.log('   send_notifications:', campaign.send_notifications);
        // 📢 Envoyer les notifications (asynchrone fire-and-forget)
        if (campaign.send_notifications) {
            console.log('🔔 send_notifications is true, scheduling notifyCampaignLaunch()');
            // Utiliser setTimeout pour exécuter asynchronement SANS attendre
            setTimeout(async () => {
                try {
                    await this.notifyCampaignLaunch(createdCampaign, campaign);
                }
                catch (err) {
                    console.error('❌ Error in scheduled campaign notification:', err);
                }
            }, 100); // 100ms de délai pour ne pas bloquer la réponse HTTP
        }
        else {
            console.log('⏭️ send_notifications is false, skipping notifications');
        }
        return createdCampaign;
    }
    /**
     * Envoyer les notifications pour une campagne lancée
     */
    async notifyCampaignLaunch(campaign, campaignInput) {
        try {
            console.log('📢 notifyCampaignLaunch started for campaign:', campaign.id);
            console.log('   institution_id:', campaign.institution_id);
            console.log('   target_users:', campaignInput.target_users?.length || 0);
            // Déterminer les utilisateurs à notifier
            let targetUserIds = [];
            if (campaignInput.target_users && campaignInput.target_users.length > 0) {
                // Utilisateurs spécifiquement sélectionnés
                console.log('   Using specifically selected users:', campaignInput.target_users.length);
                targetUserIds = campaignInput.target_users;
            }
            else if (campaign.institution_id) {
                // Followers de l'institution
                console.log('   Fetching followers for institution:', campaign.institution_id);
                targetUserIds = await (0, campaign_notifications_1.getTargetUsers)(this.supabase, 'followers', campaign.institution_id, {
                    minAge: campaignInput.min_age,
                    maxAge: campaignInput.max_age,
                });
                console.log('   Found followers:', targetUserIds.length);
            }
            else {
                // Tous les utilisateurs (avec filtres d'âge si fournis)
                console.log('   Fetching all users');
                targetUserIds = await (0, campaign_notifications_1.getTargetUsers)(this.supabase, 'all', undefined, {
                    minAge: campaignInput.min_age,
                    maxAge: campaignInput.max_age,
                });
                console.log('   Found all users:', targetUserIds.length);
            }
            if (targetUserIds.length === 0) {
                console.warn('⚠️ No target users for campaign notification');
                return;
            }
            // Récupérer infos de l'institution
            let institutionName = 'Nouvelle Campagne';
            if (campaign.institution_id && campaign.institution_type) {
                const institutionInfo = await (0, campaign_notifications_1.getInstitutionInfo)(this.supabase, campaign.institution_id, campaign.institution_type);
                if (institutionInfo) {
                    institutionName = institutionInfo.sigle || institutionInfo.name;
                }
            }
            // Envoyer les notifications
            console.log('🚀 Calling broadcastCampaignNotifications with', targetUserIds.length, 'users');
            const result = await (0, campaign_notifications_1.broadcastCampaignNotifications)(targetUserIds, campaign.id || '', institutionName, campaign.title, campaign.description || '', campaign.media_url, campaignInput.notification_message);
            console.log(`✅ Campaign notifications sent: ${result.deliveredCount}/${targetUserIds.length}`);
        }
        catch (err) {
            console.error('❌ Error notifying campaign launch:', err);
        }
    }
    async getCampaigns(limit = 50, offset = 0) {
        // Get total count
        const { count } = await this.supabase
            .from('ads_campaigns')
            .select('*', { count: 'exact', head: true });
        // Get paginated results
        const { data, error } = await this.supabase
            .from('ads_campaigns')
            .select('*')
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return {
            campaigns: data,
            total: count || 0,
        };
    }
    async getCampaignById(id) {
        const { data, error } = await this.supabase
            .from('ads_campaigns')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // Not found
            throw error;
        }
        return data;
    }
    async updateCampaign(id, updates) {
        const { data, error } = await this.supabase
            .from('ads_campaigns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        const updated = data;
        // If the update requests sending notifications, or the carousel slot changed,
        // schedule the notify flow (fire-and-forget) to mirror create flow.
        const slotChanged = updates.carousel_slot !== undefined;
        if (updates.send_notifications || slotChanged) {
            const campaignInput = {
                title: updated.title,
                description: updated.description,
                media_url: updated.media_url,
                media_type: updated.media_type,
                destination: updated.destination,
                carousel_slot: updated.carousel_slot,
                click_url: updated.click_url,
                contacts: updated.contacts,
                lien: updated.lien,
                target_gender: updated.target_gender,
                target_user_type: updated.target_user_type,
                target_users: updated.target_users,
                min_age: updated.min_age,
                max_age: updated.max_age,
                target_age: updated.target_age,
                age_tolerance: updated.age_tolerance,
                location: updated.location,
                status: updated.status,
                send_notifications: true,
                notification_message: (updates.notification_message ?? updated.notification_message),
            };
            // Fire-and-forget with small delay to avoid blocking the update response
            setTimeout(async () => {
                try {
                    await this.notifyCampaignLaunch(updated, campaignInput);
                }
                catch (err) {
                    console.error('❌ Error in scheduled campaign notification (update):', err);
                }
            }, 100);
        }
        return updated;
    }
    async deleteCampaign(id) {
        const { error } = await this.supabase
            .from('ads_campaigns')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
    /**
     * Envoyer les notifications manuellement pour une campagne existante
     * Utile pour tester ou renvoyer les notifications
     */
    async sendCampaignNotifications(campaignId) {
        try {
            // Récupérer la campagne
            const campaign = await this.getCampaignById(campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }
            console.log(`📢 [DEBUG] Envoi des notifications pour campagne: ${campaign.title}`);
            // Récupérer les utilisateurs à notifier
            const targetUserIds = await (0, campaign_notifications_1.getTargetUsers)(this.supabase, 'all' // Par défaut envoyer à tous
            );
            if (targetUserIds.length === 0) {
                return {
                    success: true,
                    deliveredCount: 0,
                    message: 'No users to notify'
                };
            }
            console.log(`📢 [DEBUG] Ciblage: ${targetUserIds.length} utilisateurs`);
            // Récupérer le nom de l'institution
            let institutionName = 'Nouvelle Campagne';
            if (campaign.institution_id && campaign.institution_type) {
                const institutionInfo = await (0, campaign_notifications_1.getInstitutionInfo)(this.supabase, campaign.institution_id, campaign.institution_type);
                if (institutionInfo) {
                    institutionName = institutionInfo.sigle || institutionInfo.name;
                }
            }
            // Envoyer les notifications
            const result = await (0, campaign_notifications_1.broadcastCampaignNotifications)(targetUserIds, campaign.id || '', institutionName, campaign.title, campaign.description || '', campaign.media_url, campaign.notification_message);
            console.log(`✅ [DEBUG] Notifications envoyées: ${result.deliveredCount}/${targetUserIds.length}`);
            // Mettre à jour le flag pour indiquer que les notifications ont été envoyées
            await this.supabase
                .from('ads_campaigns')
                .update({ send_notifications: true, updated_at: new Date().toISOString() })
                .eq('id', campaignId);
            return {
                success: true,
                deliveredCount: result.deliveredCount,
                message: `Notifications envoyées à ${result.deliveredCount}/${targetUserIds.length} utilisateurs`
            };
        }
        catch (err) {
            console.error('Error sending campaign notifications:', err);
            throw err;
        }
    }
}
exports.CampaignService = CampaignService;
//# sourceMappingURL=campaign.service.js.map