"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const supabase_js_1 = require("@supabase/supabase-js");
const axios_1 = __importDefault(require("axios"));
const bullmq_1 = require("bullmq");
const notification_queue_1 = require("../queues/notification.queue");
const videoProcessing_queue_1 = require("../queues/videoProcessing.queue");
const NOTIFICATION_DLQ = process.env.NOTIFICATION_DLQ || 'notification-dlq';
// Dead-letter queue for failed notification jobs
const notificationDlq = new bullmq_1.Queue(NOTIFICATION_DLQ, {
    connection: videoProcessing_queue_1.redisConnection,
    defaultJobOptions: {
        removeOnComplete: {
            age: Number(process.env.NOTIFICATION_DLQ_COMPLETE_TTL_SECONDS || 2592000), // 30 days
            count: Number(process.env.NOTIFICATION_DLQ_COMPLETE_KEEP || 10000),
        },
    },
});
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase worker credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
const normalizeEntityType = (entityType) => entityType === 'centre' || entityType === 'centre_formation'
    ? 'centre_formation'
    : 'universite';
const getFollowers = async (supabaseClient, entityId, entityType) => {
    try {
        const normalizedType = normalizeEntityType(entityType);
        const tableName = normalizedType === 'universite'
            ? 'followers_universites'
            : 'followers_centres_formation';
        const columnName = normalizedType === 'universite' ? 'universite_id' : 'centre_id';
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('user_id')
            .eq(columnName, entityId);
        if (error) {
            console.error(`Notification worker failed to fetch followers: ${error.message}`);
            return [];
        }
        return (data || []).map((row) => row.user_id);
    }
    catch (error) {
        console.error('Notification worker error fetching followers:', error);
        return [];
    }
};
const getEntityInfo = async (supabaseClient, entityId, entityType) => {
    try {
        const normalizedType = normalizeEntityType(entityType);
        const tableName = normalizedType === 'universite' ? 'universites' : 'centres_formation';
        const { data } = await supabaseClient
            .from(tableName)
            .select('id, nom, sigle, logo_url, description')
            .eq('id', entityId)
            .single();
        if (!data)
            return null;
        return {
            id: data.id,
            name: data.nom,
            sigle: data.sigle,
            logo_url: data.logo_url,
            description: data.description,
            type: normalizedType,
        };
    }
    catch (error) {
        console.error('Notification worker error fetching entity info:', error);
        return null;
    }
};
const resolveAuthorEntity = async (supabaseClient, authorId, authorType) => {
    const normalizedType = normalizeEntityType(authorType);
    const tableName = normalizedType === 'universite' ? 'universites' : 'centres_formation';
    try {
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('id, nom, sigle, logo_url, description, profile_id')
            .eq('profile_id', authorId)
            .maybeSingle();
        if (error) {
            console.error('Notification worker error resolving author entity by profile_id:', error);
        }
        if (data) {
            return {
                id: data.id,
                name: data.nom,
                sigle: data.sigle,
                logo_url: data.logo_url,
                description: data.description,
                type: normalizedType,
            };
        }
    }
    catch (error) {
        console.error('Notification worker error resolving author entity:', error);
    }
    return getEntityInfo(supabaseClient, authorId, normalizedType);
};
const notifyFollowers = async (followerIds, post, entityInfo) => {
    if (followerIds.length === 0)
        return;
    try {
        const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'https://universearch-notification-service-3zw2.onrender.com';
        const organizationName = entityInfo?.name || entityInfo?.sigle || post.author_id;
        const organizationDisplayName = entityInfo?.sigle?.trim() || entityInfo?.name?.trim() || organizationName;
        const organizationId = entityInfo?.id || post.author_id;
        const organizationType = entityInfo?.type || normalizeEntityType(post.author_type);
        // Chunk followers to prevent overwhelming the notification service (max 100 per request)
        const chunkSize = 100;
        let totalDelivered = 0;
        const startTime = Date.now();
        for (let i = 0; i < followerIds.length; i += chunkSize) {
            const chunk = followerIds.slice(i, i + chunkSize);
            try {
                const response = await axios_1.default.post(`${notificationServiceUrl}/api/notifications/broadcast`, {
                    user_ids: chunk,
                    type: 'post',
                    title: 'Nouveau post',
                    message: `${organizationDisplayName} a publie un nouveau post.`,
                    delivery_types: ['in_app', 'push'],
                    data: {
                        post_id: post.id,
                        author_id: organizationId,
                        author_type: organizationType,
                        institution_id: organizationId,
                        institution_name: organizationName,
                        institution_logo_url: entityInfo?.logo_url || null,
                        institution_description: entityInfo?.description || null,
                        titre: post.titre,
                        description: post.description,
                    },
                }, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const broadcastResponse = response.data;
                const deliveredCount = typeof broadcastResponse?.count === 'number'
                    ? broadcastResponse.count
                    : chunk.length;
                totalDelivered += deliveredCount;
                const errors = Array.isArray(broadcastResponse?.errors)
                    ? broadcastResponse.errors
                    : [];
                if (errors.length > 0) {
                    console.warn(JSON.stringify({
                        event: 'notification_chunk_partial_errors',
                        postId: post.id,
                        chunkIndex: Math.floor(i / chunkSize),
                        chunkSize: chunk.length,
                        errorCount: errors.length,
                        timestamp: new Date().toISOString(),
                    }));
                }
            }
            catch (chunkError) {
                console.error(JSON.stringify({
                    event: 'notification_chunk_failed',
                    postId: post.id,
                    chunkIndex: Math.floor(i / chunkSize),
                    chunkSize: chunk.length,
                    error: chunkError instanceof Error ? chunkError.message : String(chunkError),
                    timestamp: new Date().toISOString(),
                }));
                throw chunkError;
            }
        }
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
            event: 'notification_sent',
            postId: post.id,
            authorId: organizationId,
            authorType: organizationType,
            totalFollowers: followerIds.length,
            deliveredCount: totalDelivered,
            chunks: Math.ceil(followerIds.length / chunkSize),
            durationMs: duration,
            timestamp: new Date().toISOString(),
        }));
    }
    catch (error) {
        console.error(JSON.stringify({
            event: 'notification_send_failed',
            postId: post.id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        }));
        throw error;
    }
};
const processNotificationJob = async (job) => {
    const startTime = Date.now();
    const attempt = (job.attemptsMade || 0) + 1;
    const maxAttempts = job.opts?.attempts || 3;
    console.log(JSON.stringify({
        event: 'notification_job_start',
        jobId: job.id,
        attempt,
        maxAttempts,
        postId: job.data.postId,
        authorId: job.data.authorId,
        timestamp: new Date().toISOString(),
    }));
    try {
        const { data: postData, error: postError } = await supabase
            .from('posts')
            .select('id, author_id, author_type, titre, description, media_url, thumbnail_url, media_type, media_processing_status, media_processing_error, statut, date_creation')
            .eq('id', job.data.postId)
            .single();
        if (postError || !postData) {
            const errorMsg = `Failed to fetch post: ${postError?.message || 'no post found'}`;
            throw new Error(errorMsg);
        }
        const entityInfo = await resolveAuthorEntity(supabase, job.data.authorId, job.data.authorType);
        const followerIds = await getFollowers(supabase, entityInfo?.id || job.data.authorId, job.data.authorType);
        await notifyFollowers(followerIds, postData, entityInfo);
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
            event: 'notification_job_completed',
            jobId: job.id,
            postId: job.data.postId,
            durationMs: duration,
            timestamp: new Date().toISOString(),
        }));
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const duration = Date.now() - startTime;
        // Check if this is the final attempt - if so, send to DLQ
        if (attempt >= maxAttempts) {
            console.error(JSON.stringify({
                event: 'notification_job_dlq',
                jobId: job.id,
                postId: job.data.postId,
                attempt,
                maxAttempts,
                error: errorMsg,
                durationMs: duration,
                timestamp: new Date().toISOString(),
            }));
            // Send to DLQ
            try {
                await notificationDlq.add('notify-followers-dlq', job.data, {
                    jobId: `dlq-${job.id}-${Date.now()}`,
                });
            }
            catch (dlqError) {
                console.error(JSON.stringify({
                    event: 'notification_dlq_add_failed',
                    jobId: job.id,
                    postId: job.data.postId,
                    error: dlqError instanceof Error ? dlqError.message : String(dlqError),
                    timestamp: new Date().toISOString(),
                }));
            }
        }
        else {
            console.warn(JSON.stringify({
                event: 'notification_job_retry',
                jobId: job.id,
                postId: job.data.postId,
                attempt,
                maxAttempts,
                error: errorMsg,
                durationMs: duration,
                timestamp: new Date().toISOString(),
            }));
        }
        throw error;
    }
};
const defaultConcurrency = Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 1);
const worker = new bullmq_1.Worker(notification_queue_1.NOTIFICATION_QUEUE, processNotificationJob, {
    connection: videoProcessing_queue_1.redisConnection,
    concurrency: defaultConcurrency,
    removeOnComplete: { age: 3600 }, // Keep completed jobs for 1 hour for monitoring
    removeOnFail: { age: 86400 }, // Keep failed jobs for 24 hours for debugging
});
worker.on('completed', (job) => {
    console.log(JSON.stringify({
        event: 'notification_job_completed',
        jobId: job.id,
        postId: job.data?.postId,
        timestamp: new Date().toISOString(),
    }));
});
worker.on('failed', (job, error) => {
    const attempt = (job?.attemptsMade || 0) + 1;
    const maxAttempts = job?.opts?.attempts || 3;
    // Only log final failure here - DLQ logging is in processNotificationJob
    if (attempt >= maxAttempts) {
        console.error(JSON.stringify({
            event: 'notification_job_final_failed',
            jobId: job?.id || 'unknown',
            postId: job?.data?.postId,
            attempt,
            maxAttempts,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        }));
    }
});
worker.on('error', (failedReason) => {
    console.error(JSON.stringify({
        event: 'notification_worker_error',
        error: failedReason instanceof Error ? failedReason.message : String(failedReason),
        timestamp: new Date().toISOString(),
    }));
});
worker.on('stalled', (jobId) => {
    console.warn(JSON.stringify({
        event: 'notification_job_stalled',
        jobId,
        timestamp: new Date().toISOString(),
    }));
});
const shutdown = async () => {
    console.log(JSON.stringify({
        event: 'notification_worker_shutting_down',
        timestamp: new Date().toISOString(),
    }));
    try {
        await worker.close();
        await notificationDlq.close();
        await videoProcessing_queue_1.redisConnection.quit();
        console.log(JSON.stringify({
            event: 'notification_worker_shutdown_complete',
            timestamp: new Date().toISOString(),
        }));
    }
    catch (error) {
        console.error(JSON.stringify({
            event: 'notification_worker_shutdown_error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        }));
    }
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log(JSON.stringify({
    event: 'notification_worker_started',
    queue: notification_queue_1.NOTIFICATION_QUEUE,
    dlq: NOTIFICATION_DLQ,
    concurrency: defaultConcurrency,
    maxAttempts: Number(process.env.NOTIFICATION_JOB_ATTEMPTS || 3),
    backoffMs: Number(process.env.NOTIFICATION_JOB_BACKOFF_MS || 10000),
    redisUrl: process.env.REDIS_URL ? '✓ configured' : 'localhost',
    timestamp: new Date().toISOString(),
}));
// HTTP server for Render health checks
const port = process.env.PORT || 3000;
http_1.default.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        service: 'notification-worker',
        queue: notification_queue_1.NOTIFICATION_QUEUE,
        timestamp: new Date().toISOString(),
    }));
}).listen(port, () => {
    console.log(JSON.stringify({
        event: 'http_server_started',
        port,
        timestamp: new Date().toISOString(),
    }));
});
//# sourceMappingURL=notification.worker.js.map