export interface EventAction {
    name: string;
    user_id?: string;
    anonymous_id?: string;
    session_id?: string;
    device_token?: string;
    page?: string;
    element?: string;
    timestamp?: string;
    meta?: Record<string, unknown>;
}
export interface TrackingBatch {
    version: number;
    actions: EventAction[];
    total: number;
}
//# sourceMappingURL=index.d.ts.map