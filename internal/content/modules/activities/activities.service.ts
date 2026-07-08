// src/modules/activities/activities.service.ts

import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateActivityPayload {
  title: string;
  description?: string | null;
  status?: 'active' | 'completed' | 'archived';
  is_public?: boolean;
  organization_id?: string | null;
  organization_type?: 'universite' | 'centre' | 'centre_formation' | null;
}

export interface UpdateActivityPayload {
  title?: string;
  description?: string | null;
  status?: 'active' | 'completed' | 'archived';
  is_public?: boolean;
  organization_id?: string | null;
  organization_type?: 'universite' | 'centre' | 'centre_formation' | null;
}

export interface ActivityRecord {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  is_public: boolean;
  created_by_id: string;
  organization_id: string | null;
  organization_type: 'universite' | 'centre_formation' | null;
  created_at: string;
  updated_at: string;
}

export interface ListActivitiesOptions {
  currentUserId?: string | null;
  organizationId?: string | null;
  organizationType?: 'universite' | 'centre' | 'centre_formation' | null;
}

const normalizeOrganizationType = (
  value: CreateActivityPayload['organization_type']
): 'universite' | 'centre_formation' | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('univers')) return 'universite';
  if (normalized.includes('centre')) return 'centre_formation';
  return null;
};

export const createActivity = async (
  supabase: SupabaseClient,
  payload: CreateActivityPayload,
  createdById: string
): Promise<ActivityRecord> => {
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

  return data as ActivityRecord;
};

export const listActivities = async (
  supabase: SupabaseClient,
  options: ListActivitiesOptions = {}
): Promise<ActivityRecord[]> => {
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
  } else {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list activities: ${error.message}`);
  }

  return (data || []) as ActivityRecord[];
};

export const getActivity = async (
  supabase: SupabaseClient,
  activityId: string
): Promise<ActivityRecord | null> => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch activity: ${error.message}`);
  }

  return data as ActivityRecord | null;
};

export const updateActivity = async (
  supabase: SupabaseClient,
  activityId: string,
  payload: UpdateActivityPayload,
  userId: string
): Promise<ActivityRecord> => {
  const updatePayload = {
    ...payload,
    organization_type:
      payload.organization_type === undefined
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

  return data as ActivityRecord;
};

export const deleteActivity = async (
  supabase: SupabaseClient,
  activityId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId)
    .eq('created_by_id', userId);

  if (error) {
    throw new Error(`Failed to delete activity: ${error.message}`);
  }
};
