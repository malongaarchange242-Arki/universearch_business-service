"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryAllFailedVideoProcessingJobs = exports.retryVideoProcessingJob = exports.getVideoProcessingQueueMetrics = exports.getVideoProcessingJobStatus = exports.addAdsVideoProcessingJob = exports.videoProcessingQueue = exports.redisConnection = exports.VIDEO_PROCESSING_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
exports.VIDEO_PROCESSING_QUEUE = process.env.VIDEO_PROCESSING_QUEUE || 'video-processing';
const redisUrl = process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;
console.log('🔴 ADS SERVICE REDIS CONFIG DEBUG:');
console.log('  REDIS_URL env var:', process.env.REDIS_URL ? '✅ defined' : '❌ undefined');
console.log('  REDIS_HOST env var:', process.env.REDIS_HOST ? '✅ defined' : '❌ undefined');
console.log('  REDIS_PORT env var:', process.env.REDIS_PORT ? '✅ defined' : '❌ undefined');
console.log('  Final redisUrl:', redisUrl);
exports.redisConnection = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
});
exports.redisConnection.on('error', (error) => {
    console.error('Redis connection error for ads video processing queue:', error.message);
});
exports.videoProcessingQueue = new bullmq_1.Queue(exports.VIDEO_PROCESSING_QUEUE, {
    connection: exports.redisConnection,
    defaultJobOptions: {
        attempts: Number(process.env.VIDEO_JOB_ATTEMPTS || 3),
        backoff: {
            type: 'exponential',
            delay: Number(process.env.VIDEO_JOB_BACKOFF_MS || 10000),
        },
        removeOnComplete: {
            age: Number(process.env.VIDEO_JOB_COMPLETE_TTL_SECONDS || 86400),
            count: Number(process.env.VIDEO_JOB_COMPLETE_KEEP || 1000),
        },
        removeOnFail: {
            age: Number(process.env.VIDEO_JOB_FAILED_TTL_SECONDS || 604800),
            count: Number(process.env.VIDEO_JOB_FAILED_KEEP || 5000),
        },
    },
});
const addAdsVideoProcessingJob = async (data, priority = Number(process.env.ADS_VIDEO_JOB_PRIORITY || 1)) => {
    return exports.videoProcessingQueue.add('process-video', data, {
        jobId: (0, crypto_1.randomUUID)(),
        priority,
    });
};
exports.addAdsVideoProcessingJob = addAdsVideoProcessingJob;
const getVideoProcessingJobStatus = async (jobId) => {
    const job = await exports.videoProcessingQueue.getJob(jobId);
    if (!job)
        return null;
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
exports.getVideoProcessingJobStatus = getVideoProcessingJobStatus;
const getVideoProcessingQueueMetrics = async () => {
    const counts = await exports.videoProcessingQueue.getJobCounts();
    const completedJobs = await exports.videoProcessingQueue.getJobs(['completed'], 0, 49, false);
    const windowMs = Number(process.env.VIDEO_QUEUE_METRICS_WINDOW_MS || 5 * 60 * 1000);
    const threshold = Date.now() - windowMs;
    const recentCompleted = completedJobs.filter((job) => job.finishedOn && job.finishedOn >= threshold).length;
    const processingRatePerMinute = windowMs > 0 ? Number(((recentCompleted * 60000) / windowMs).toFixed(2)) : 0;
    return {
        queueName: exports.VIDEO_PROCESSING_QUEUE,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
        total: (counts.waiting || 0) +
            (counts.active || 0) +
            (counts.completed || 0) +
            (counts.failed || 0) +
            (counts.delayed || 0) +
            (counts.paused || 0),
        processingRatePerMinute: Number(processingRatePerMinute.toFixed(2)),
        timestamp: new Date().toISOString(),
    };
};
exports.getVideoProcessingQueueMetrics = getVideoProcessingQueueMetrics;
const retryVideoProcessingJob = async (jobId) => {
    const job = await exports.videoProcessingQueue.getJob(jobId);
    if (!job)
        return null;
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
exports.retryVideoProcessingJob = retryVideoProcessingJob;
const retryAllFailedVideoProcessingJobs = async (limit = 50) => {
    const failedJobs = await exports.videoProcessingQueue.getJobs(['failed'], 0, limit - 1, true);
    const report = {
        requested: failedJobs.length,
        retried: 0,
        errors: [],
    };
    for (const job of failedJobs) {
        try {
            await job.retry();
            report.retried += 1;
        }
        catch (error) {
            report.errors.push(`Job ${job.id} retry failed: ${error.message}`);
        }
    }
    return report;
};
exports.retryAllFailedVideoProcessingJobs = retryAllFailedVideoProcessingJobs;
//# sourceMappingURL=videoProcessing.queue.js.map