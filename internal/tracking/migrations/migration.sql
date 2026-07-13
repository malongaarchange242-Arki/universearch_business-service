CREATE SCHEMA IF NOT EXISTS tracking;

CREATE TABLE IF NOT EXISTS tracking.tracking_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'queued',
    source TEXT,
    total_events INTEGER NOT NULL DEFAULT 0,
    processed_events INTEGER NOT NULL DEFAULT 0,
    failed_events INTEGER NOT NULL DEFAULT 0,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    processing_finished_at TIMESTAMPTZ,
    error_message TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT tracking_batches_status_check
        CHECK (status IN ('queued', 'processing', 'processed', 'partial', 'failed'))
);

CREATE TABLE IF NOT EXISTS tracking.tracking_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES tracking.tracking_batches(batch_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    user_id TEXT,
    anonymous_id TEXT,
    session_id TEXT,
    device_token TEXT,
    page TEXT,
    element TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'queued',
    CONSTRAINT tracking_events_status_check
        CHECK (status IN ('queued', 'processed', 'failed'))
);

CREATE TABLE IF NOT EXISTS tracking.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    anonymous_id TEXT,
    device_token TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    actions_count INTEGER NOT NULL DEFAULT 0,
    total_events INTEGER NOT NULL DEFAULT 0,
    page_views_count INTEGER NOT NULL DEFAULT 0,
    searches_count INTEGER NOT NULL DEFAULT 0,
    video_duration_seconds INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS tracking.dead_letter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES tracking.tracking_batches(batch_id) ON DELETE SET NULL,
    name TEXT,
    payload_version INTEGER,
    raw_event JSONB NOT NULL,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retry_count INTEGER NOT NULL DEFAULT 0,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tracking_batches_status_received_at
    ON tracking.tracking_batches (status, received_at);

CREATE INDEX IF NOT EXISTS idx_tracking_events_name_event_time
    ON tracking.tracking_events (name, event_time);

CREATE INDEX IF NOT EXISTS idx_tracking_events_batch_id
    ON tracking.tracking_events (batch_id);

CREATE INDEX IF NOT EXISTS idx_tracking_events_user_id_event_time
    ON tracking.tracking_events (user_id, event_time);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id_last_activity
    ON tracking.sessions (user_id, last_activity_at);

CREATE INDEX IF NOT EXISTS idx_dead_letter_events_failed_at
    ON tracking.dead_letter_events (failed_at);

CREATE INDEX IF NOT EXISTS idx_sessions_last_activity_open
    ON tracking.sessions (last_activity_at)
    WHERE ended_at IS NULL;