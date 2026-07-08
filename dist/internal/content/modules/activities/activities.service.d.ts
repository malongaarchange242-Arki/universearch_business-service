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
export declare const createActivity: (supabase: SupabaseClient, payload: CreateActivityPayload, createdById: string) => Promise<ActivityRecord>;
export declare const listActivities: (supabase: SupabaseClient, options?: ListActivitiesOptions) => Promise<ActivityRecord[]>;
export declare const getActivity: (supabase: SupabaseClient, activityId: string) => Promise<ActivityRecord | null>;
export declare const updateActivity: (supabase: SupabaseClient, activityId: string, payload: UpdateActivityPayload, userId: string) => Promise<ActivityRecord>;
export declare const deleteActivity: (supabase: SupabaseClient, activityId: string, userId: string) => Promise<void>;
//# sourceMappingURL=activities.service.d.ts.map