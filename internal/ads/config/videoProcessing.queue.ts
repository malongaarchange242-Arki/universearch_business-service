import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';

export const VIDEO_PROCESSING_QUEUE = process.env.VIDEO_PROCESSING_QUEUE || 'video-processing';

export interface VideoProcessingJobData {
  source: 'ads';
  rawBucket: string;
  outputBucket: string;
  outputPrefix: string;
  thumbnailPrefix: string;
  rawPath: string;
  rawUrl: string;
  originalFilename: string;
  ownerId: string;
  campaignId?: string | null;
}

const redisUrl = process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;

console.log('🔴 ADS SERVICE REDIS CONFIG DEBUG:');
console.log('  REDIS_URL env var:', process.env.REDIS_URL ? '✅ defined' : '❌ undefined');
console.log('  REDIS_HOST env var:', process.env.REDIS_HOST ? '✅ defined' : '❌ undefined');
console.log('  REDIS_PORT env var:', process.env.REDIS_PORT ? '✅ defined' : '❌ undefined');
console.log('  Final redisUrl:', redisUrl);

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (error) => {
  console.error('Redis connection error for ads video processing queue:', error.message);
});

export const videoProcessingQueue = new Queue<VideoProcessingJobData>(
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

export const addAdsVideoProcessingJob = async (
  data: VideoProcessingJobData,
  priority = Number(process.env.ADS_VIDEO_JOB_PRIORITY || 1)
): Promise<Job<VideoProcessingJobData>> => {
  return videoProcessingQueue.add('process-video', data, {
    jobId: randomUUID(),
    priority,
  });
};

export const getVideoProcessingJobStatus = async (jobId: string) => {
  const job = await videoProcessingQueue.getJob(jobId);

  if (!job) return null;

  const state = await job.getState();

  return {
    id: job.id,
    status: state === 'active' ? 'processing' : state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    attempts: job.opts.attempts || 1,
    error_message: job.failedReason || null,
    rawUrl: job.data.rawUrl,
    campaignId: job.data.campaignId || null,
    createdAt: new Date(job.timestamp).toISOString(),
    processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    result: job.returnvalue || null,
  };
};

export interface VideoProcessingQueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
  processingRatePerMinute: number;
  timestamp: string;
}

export const getVideoProcessingQueueMetrics = async (): Promise<VideoProcessingQueueMetrics> => {
  const counts = await videoProcessingQueue.getJobCounts();
  const completedJobs = await videoProcessingQueue.getJobs(['completed'], 0, 49, false);

  const windowMs = Number(process.env.VIDEO_QUEUE_METRICS_WINDOW_MS || 5 * 60 * 1000);
  const threshold = Date.now() - windowMs;
  const recentCompleted = completedJobs.filter((job) => job.finishedOn && job.finishedOn >= threshold).length;
  const processingRatePerMinute = windowMs > 0 ? Number(((recentCompleted * 60000) / windowMs).toFixed(2)) : 0;

  return {
    queueName: VIDEO_PROCESSING_QUEUE,
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    paused: counts.paused || 0,
    total:
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.completed || 0) +
      (counts.failed || 0) +
      (counts.delayed || 0) +
      (counts.paused || 0),
    processingRatePerMinute: Number(processingRatePerMinute.toFixed(2)),
    timestamp: new Date().toISOString(),
  };
};

export const retryVideoProcessingJob = async (jobId: string) => {
  const job = await videoProcessingQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  if (state !== 'failed') {
    throw new Error(`Job ${jobId} is not failed and cannot be retried in its current state (${state}).`);
  }

  await job.retry();
  return {
    jobId: job.id,
    status: await job.getState(),
    attemptsMade: job.attemptsMade,
  };
};

export const retryAllFailedVideoProcessingJobs = async (limit = 50) => {
  const failedJobs = await videoProcessingQueue.getJobs(['failed'], 0, limit - 1, true);
  const report = {
    requested: failedJobs.length,
    retried: 0,
    errors: [] as string[],
  };

  for (const job of failedJobs) {
    try {
      await job.retry();
      report.retried += 1;
    } catch (error) {
      report.errors.push(`Job ${job.id} retry failed: ${(error as Error).message}`);
    }
  }

  return report;
};
