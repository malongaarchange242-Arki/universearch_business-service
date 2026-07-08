import 'dotenv/config';
import http from 'http';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Job, Worker } from 'bullmq';
import { NOTIFICATION_QUEUE, NotificationJobData } from '../queues/notification.queue';
import { redisConnection } from '../queues/videoProcessing.queue';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase worker credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
}

const supabase = createClient<any>(supabaseUrl, serviceRoleKey);

const normalizeEntityType = (entityType: string) =>
  entityType === 'centre' || entityType === 'centre_formation'
    ? 'centre_formation'
    : 'universite';

const getFollowers = async (
  supabaseClient: any,
  entityId: string,
  entityType: string
): Promise<string[]> => {
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

    return (data || []).map((row: any) => row.user_id);
  } catch (error) {
    console.error('Notification worker error fetching followers:', error);
    return [];
  }
};

const getEntityInfo = async (
  supabaseClient: any,
  entityId: string,
  entityType: string
) => {
  try {
    const normalizedType = normalizeEntityType(entityType);
    const tableName = normalizedType === 'universite' ? 'universites' : 'centres_formation';

    const { data } = await supabaseClient
      .from(tableName)
      .select('id, nom, sigle, logo_url, description')
      .eq('id', entityId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      name: data.nom,
      sigle: data.sigle,
      logo_url: data.logo_url,
      description: data.description,
      type: normalizedType,
    };
  } catch (error) {
    console.error('Notification worker error fetching entity info:', error);
    return null;
  }
};

const resolveAuthorEntity = async (
  supabaseClient: any,
  authorId: string,
  authorType: string
) => {
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
  } catch (error) {
    console.error('Notification worker error resolving author entity:', error);
  }

  return getEntityInfo(supabaseClient, authorId, normalizedType);
};

const notifyFollowers = async (
  followerIds: string[],
  post: any,
  entityInfo: any | null
) => {
  if (followerIds.length === 0) return;

  try {
    const notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL || 'https://universearch-notification-service-3zw2.onrender.com';
    const organizationName = entityInfo?.name || entityInfo?.sigle || post.author_id;
    const organizationDisplayName =
      entityInfo?.sigle?.trim() || entityInfo?.name?.trim() || organizationName;
    const organizationId = entityInfo?.id || post.author_id;
    const organizationType = entityInfo?.type || normalizeEntityType(post.author_type);

    // Chunk followers to prevent overwhelming the notification service (max 100 per request)
    const chunkSize = 100;
    let totalDelivered = 0;
    const startTime = Date.now();

    for (let i = 0; i < followerIds.length; i += chunkSize) {
      const chunk = followerIds.slice(i, i + chunkSize);

      try {
        const response = await axios.post(
          `${notificationServiceUrl}/api/notifications/broadcast`,
          {
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
          },
          {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const broadcastResponse = response.data as { count?: number; errors?: unknown[] };
        const deliveredCount = typeof broadcastResponse?.count === 'number'
          ? broadcastResponse.count
          : chunk.length;

        totalDelivered += deliveredCount;

        const errors = Array.isArray(broadcastResponse?.errors)
          ? broadcastResponse.errors
          : [];

        if (errors.length > 0) {
          console.warn(
            JSON.stringify({
              event: 'notification_chunk_partial_errors',
              postId: post.id,
              chunkIndex: Math.floor(i / chunkSize),
              chunkSize: chunk.length,
              errorCount: errors.length,
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (chunkError) {
        console.error(
          JSON.stringify({
            event: 'notification_chunk_failed',
            postId: post.id,
            chunkIndex: Math.floor(i / chunkSize),
            chunkSize: chunk.length,
            error: chunkError instanceof Error ? chunkError.message : String(chunkError),
            timestamp: new Date().toISOString(),
          })
        );
        throw chunkError;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: 'notification_sent',
        postId: post.id,
        authorId: organizationId,
        authorType: organizationType,
        totalFollowers: followerIds.length,
        deliveredCount: totalDelivered,
        chunks: Math.ceil(followerIds.length / chunkSize),
        durationMs: duration,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'notification_send_failed',
        postId: post.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }
};

const processNotificationJob = async (job: Job<NotificationJobData, void>) => {
  console.log(
    JSON.stringify({
      event: 'notification_job_start',
      jobId: job.id,
      attempt: (job.attemptsMade || 0) + 1,
      maxAttempts: job.opts?.attempts,
      postId: job.data.postId,
      timestamp: new Date().toISOString(),
    })
  );

  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select(
      'id, author_id, author_type, titre, description, media_url, thumbnail_url, media_type, media_processing_status, media_processing_error, statut, date_creation'
    )
    .eq('id', job.data.postId)
    .single();

  if (postError || !postData) {
    throw new Error(`Notification worker failed to fetch post: ${postError?.message || 'no post found'}`);
  }

  const entityInfo = await resolveAuthorEntity(supabase, job.data.authorId, job.data.authorType);
  const followerIds = await getFollowers(
    supabase,
    entityInfo?.id || job.data.authorId,
    job.data.authorType
  );

  await notifyFollowers(followerIds, postData, entityInfo);
};

const defaultConcurrency = Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 1);

const worker = new Worker<NotificationJobData, void>(
  NOTIFICATION_QUEUE,
  processNotificationJob,
  {
    connection: redisConnection,
    concurrency: defaultConcurrency,
    removeOnComplete: { age: 3600 }, // Keep completed jobs for 1 hour for monitoring
    removeOnFail: { age: 86400 }, // Keep failed jobs for 24 hours for debugging
  }
);

worker.on('completed', (job) => {
  console.log(
    JSON.stringify({
      event: 'notification_job_completed',
      jobId: job.id,
      postId: job.data?.postId,
      timestamp: new Date().toISOString(),
    })
  );
});

worker.on('failed', (job, error) => {
  console.error(
    JSON.stringify({
      event: 'notification_job_failed',
      jobId: job?.id || 'unknown',
      attempt: (job?.attemptsMade || 0) + 1,
      maxAttempts: job?.opts?.attempts,
      postId: job?.data?.postId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  );
});

const shutdown = async () => {
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(
  JSON.stringify({
    event: 'notification_worker_started',
    queue: NOTIFICATION_QUEUE,
    concurrency: defaultConcurrency,
    redisUrl: process.env.REDIS_URL,
    timestamp: new Date().toISOString(),
  })
);

// HTTP server for Render health checks
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'notification-worker',
      queue: NOTIFICATION_QUEUE,
      timestamp: new Date().toISOString(),
    })
  );
}).listen(port, () => {
  console.log(
    JSON.stringify({
      event: 'http_server_started',
      port,
      timestamp: new Date().toISOString(),
    })
  );
});
