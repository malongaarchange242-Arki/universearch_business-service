"use strict";
// src/modules/activities/activities.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteActivity = exports.updateActivity = exports.getActivity = exports.listActivities = exports.createActivity = void 0;
const normalizeOrganizationType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized)
        return null;
    if (normalized.includes('univers'))
        return 'universite';
    if (normalized.includes('centre'))
        return 'centre_formation';
    return null;
};
const createActivity = async (supabase, payload, createdById) => {
    const insertPayload = {
        title: payload.title,
        description: payload.description ?? null,
        is_public: payload.is_public ?? true,
        status: payload.status ?? 'active',
        organization_id: payload.organization_id ?? null,
        organization_type: normalizeOrganizationType(payload.organization_type),
        created_by_id: createdById,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
        .from('activities')
        .insert([insertPayload])
        .select('*')
        .single();
    if (error) {
        throw new Error(`Failed to create activity: ${error.message}`);
    }
    return data;
};
exports.createActivity = createActivity;
const listActivities = async (supabase, options = {}) => {
    const currentUserId = options.currentUserId ?? null;
    const organizationId = options.organizationId ?? null;
    const organizationType = normalizeOrganizationType(options.organizationType);
    let query = supabase.from('activities').select('*');
    if (organizationId) {
        const orgFilters = [`organization_id.eq.${organizationId}`];
        if (currentUserId) {
            orgFilters.push(`created_by_id.eq.${currentUserId}`);
        }
        query = query.or(orgFilters.join(','));
    }
    if (organizationType) {
        query = query.or(`organization_type.eq.${organizationType},organization_type.is.null`);
    }
    if (currentUserId) {
        query = query.or(`is_public.eq.true,created_by_id.eq.${currentUserId}`);
    }
    else {
        query = query.eq('is_public', true);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        throw new Error(`Failed to list activities: ${error.message}`);
    }
    return (data || []);
};
exports.listActivities = listActivities;
const getActivity = async (supabase, activityId) => {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();
    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch activity: ${error.message}`);
    }
    return data;
};
exports.getActivity = getActivity;
const updateActivity = async (supabase, activityId, payload, userId) => {
    const updatePayload = {
        ...payload,
        organization_type: payload.organization_type === undefined
            ? undefined
            : normalizeOrganizationType(payload.organization_type),
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
        .from('activities')
        .update(updatePayload)
        .eq('id', activityId)
        .eq('created_by_id', userId)
        .select('*')
        .single();
    if (error) {
        throw new Error(`Failed to update activity: ${error.message}`);
    }
    return data;
};
exports.updateActivity = updateActivity;
const deleteActivity = async (supabase, activityId, userId) => {
    const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)
        .eq('created_by_id', userId);
    if (error) {
        throw new Error(`Failed to delete activity: ${error.message}`);
    }
};
exports.deleteActivity = deleteActivity;
//# sourceMappingURL=activities.service.js.map