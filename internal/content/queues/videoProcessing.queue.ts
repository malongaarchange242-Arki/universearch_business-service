import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

export const VIDEO_PROCESSING_QUEUE = process.env.VIDEO_PROCESSING_QUEUE || 'video-processing';
export const VIDEO_PROCESSING_DLQ = process.env.VIDEO_PROCESSING_DLQ || 'video-processing-dlq';

export type VideoJobState =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying';

export interface VideoProcessingJobData {
  source?: 'content' | 'ads';
  rawBucket?: string;
  outputBucket?: string;
  outputPrefix?: string;
  thumbnailPrefix?: string;
  rawPath: string;
  rawUrl: string;
  originalFilename: string;
  ownerId: string;
  postId?: string | null;
  campaignId?: string | null;
  failedReason?: string | null;
  failedStack?: string | null;
  sourceJobId?: string | null;
  originalData?: Record<string, unknown> | null;
  dedupeKey?: string | null;
}

export interface VideoProcessingResult {
  videoUrl: string;
  thumbnailUrl: string;
  bucket: string;
  path: string;
  thumbnailPath: string;
  cleanedRaw: boolean;
}

// Configure Redis connection
// Priority: REDIS_URL (Render) > Individual host/port > localhost default
const redisUrl = process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;

console.log('🔴 REDIS CONFIG DEBUG:');
console.log('  REDIS_URL env var:', process.env.REDIS_URL ? '✅ defined' : '❌ undefined');
console.log('  REDIS_HOST env var:', process.env.REDIS_HOST ? '✅ defined' : '❌ undefined');
console.log('  REDIS_PORT env var:', process.env.REDIS_PORT ? '✅ defined' : '❌ undefined');
console.log('  Final redisUrl:', redisUrl);

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (error) => {
  console.error('Redis connection error for video processing queue:', error.message);
});

export const videoProcessingQueue = new Queue<VideoProcessingJobData, VideoProcessingResult>(
  VIDEO_PROCESSING_QUEUE,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: Number(process.env.VIDEO_JOB_ATTEMPTS || 3),
      backoff: {
        type: 'exponential',
        delay: Number(process.env.VIDEO_JOB_BACKOFF_MS || 10_000),
      },
      removeOnComplete: {
        age: Number(process.env.VIDEO_JOB_COMPLETE_TTL_SECONDS || 86_400),
        count: Number(process.env.VIDEO_JOB_COMPLETE_KEEP || 1000),
      },
      removeOnFail: {
        age: Number(process.env.VIDEO_JOB_FAILED_TTL_SECONDS || 604_800),
        count: Number(process.env.VIDEO_JOB_FAILED_KEEP || 5000),
      },
    },
  }
);

export const videoProcessingDlq = new Queue<VideoProcessingJobData, VideoProcessingResult>(
  VIDEO_PROCESSING_DLQ,
  {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: Number(process.env.VIDEO_DLQ_COMPLETE_TTL_SECONDS || 2_592_000),
        count: Number(process.env.VIDEO_DLQ_COMPLETE_KEEP || 10_000),
      },
    },
  }
);

const PROCESSED_RATE_KEY = process.env.VIDEO_PROCESSED_RATE_KEY || 'video:processed:minute';
const USER_PENDING_JOBS_KEY_PREFIX = process.env.USER_PENDING_JOBS_KEY_PREFIX || 'video:pending:user:';
const USER_PENDING_EXPIRE_SECONDS = Number(process.env.USER_PENDING_JOBS_EXPIRE_SECONDS || 86_400);

export interface AddVideoProcessingJobOptions {
  jobId?: string;
  priority?: number;
  userId?: string;
}

const determinePriority = (data: VideoProcessingJobData, explicitPriority?: number) => {
  if (Number.isFinite(explicitPriority)) return explicitPriority;
  if (data.source === 'ads') return Number(process.env.VIDEO_JOB_ADS_PRIORITY || 1);
  return Number(process.env.VIDEO_JOB_DEFAULT_PRIORITY || 5);
};

export const getUserPendingJobCount = async (userId: string) => {
  const count = await redisConnection.get(`${USER_PENDING_JOBS_KEY_PREFIX}${userId}`);
  return Number(count || 0);
};

export const incrementPendingJobCount = async (userId: string, delta = 1) => {
  const key = `${USER_PENDING_JOBS_KEY_PREFIX}${userId}`;
  const count = await redisConnection.incrby(key, delta);
  if (count === delta) {
    await redisConnection.expire(key, USER_PENDING_EXPIRE_SECONDS);
  }
  return count;
};

const MAX_USER_PENDING_VIDEO_JOBS = Number(process.env.MAX_USER_PENDING_VIDEO_JOBS || 10);
const MAX_QUEUE_SIZE = Number(process.env.MAX_QUEUE_SIZE || 1000);

export const incrementProcessedRate = async () => {
  const count = await redisConnection.incr(PROCESSED_RATE_KEY);
  if (count === 1) {
    await redisConnection.expire(PROCESSED_RATE_KEY, 60);
  }
  return count;
};

// Sync périodique des compteurs pending jobs pour éviter la dérive
export const syncPendingJobCounts = async () => {
  try {
    const jobs = await videoProcessingQueue.getJobs(['waiting', 'active'], 0, 10000);
    const userCounts: Record<string, number> = {};

    for (const job of jobs) {
      const userId = job.data.ownerId;
      if (userId) {
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      }
    }

    // Reset tous les compteurs et les remettre à jour
    const keys = await redisConnection.keys(`${USER_PENDING_JOBS_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redisConnection.del(...keys);
    }

    for (const [userId, count] of Object.entries(userCounts)) {
      await redisConnection.set(`${USER_PENDING_JOBS_KEY_PREFIX}${userId}`, count, 'EX', USER_PENDING_EXPIRE_SECONDS);
    }

    console.log(`Synced pending job counts for ${Object.keys(userCounts).length} users`);
  } catch (error) {
    console.error('Failed to sync pending job counts:', error);
  }
};

export const getProcessedRatePerMinute = async () => {
  const value = await redisConnection.get(PROCESSED_RATE_KEY);
  return Number(value || 0);
};

export const addVideoProcessingJob = async (
  data: VideoProcessingJobData,
  options: AddVideoProcessingJobOptions = {}
): Promise<Job<VideoProcessingJobData, VideoProcessingResult>> => {
  const priority = determinePriority(data, options.priority);
  const userId = options.userId || data.ownerId;

  // Backpressure : vérifier la taille totale de la queue
  const waitingJobs = await videoProcessingQueue.getWaiting();
  const activeJobs = await videoProcessingQueue.getActive();
  const totalQueued = waitingJobs.length + activeJobs.length;

  if (totalQueued >= MAX_QUEUE_SIZE) {
    throw new Error(`Queue overloaded: ${totalQueued} jobs (max ${MAX_QUEUE_SIZE})`);
  }

  if (userId) {
    const pendingCount = await getUserPendingJobCount(userId);
    if (pendingCount >= MAX_USER_PENDING_VIDEO_JOBS) {
      throw new Error(
        `Upload queue limit exceeded: ${pendingCount} pending jobs (max ${MAX_USER_PENDING_VIDEO_JOBS})`
      );
    }
    await incrementPendingJobCount(userId, 1);
  }

  // Idempotence améliorée : jobId basé sur hash du fichier + entité cible
  let jobId = options.jobId;
  if (!jobId) {
    const hashInput = `${data.rawPath}:${data.originalFilename}:${data.ownerId}:${data.postId || data.campaignId || ''}`;
    jobId = createHash('sha256').update(hashInput).digest('hex').substring(0, 32);
  }

  try {
    return await videoProcessingQueue.add('process-video', data, {
      jobId,
      priority,
    });
  } catch (error) {
    if (userId) {
      await incrementPendingJobCount(userId, -1);
    }
    throw error;
  }
};

export const getVideoProcessingJobStatus = async (jobId: string) => {
  const job = await videoProcessingQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const bullState = await job.getState();
  const attempts = job.opts.attempts || 1;
  const isRetrying =
    job.attemptsMade > 0 &&
    job.attemptsMade < attempts &&
    ['waiting', 'delayed', 'waiting-children', 'failed'].includes(bullState);

  const state: VideoJobState =
    isRetrying
      ? 'retrying'
      : bullState === 'waiting' || bullState === 'delayed' || bullState === 'waiting-children'
      ? 'queued'
      : bullState === 'active'
        ? 'processing'
        : bullState === 'completed'
          ? 'completed'
          : 'failed';

  return {
    id: job.id,
    status: state,
    rawUrl: job.data.rawUrl,
    rawPath: job.data.rawPath,
    postId: job.data.postId || null,
    ownerId: job.data.ownerId,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    attempts,
    error_message: job.failedReason || null,
    createdAt: new Date(job.timestamp).toISOString(),
    processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    result: job.returnvalue || null,
  };
};
