"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoProcessingJobStatus = exports.addVideoProcessingJob = exports.getProcessedRatePerMinute = exports.syncPendingJobCounts = exports.incrementProcessedRate = exports.incrementPendingJobCount = exports.getUserPendingJobCount = exports.videoProcessingDlq = exports.videoProcessingQueue = exports.redisConnection = exports.VIDEO_PROCESSING_DLQ = exports.VIDEO_PROCESSING_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
exports.VIDEO_PROCESSING_QUEUE = process.env.VIDEO_PROCESSING_QUEUE || 'video-processing';
exports.VIDEO_PROCESSING_DLQ = process.env.VIDEO_PROCESSING_DLQ || 'video-processing-dlq';
// Configure Redis connection
// Priority: REDIS_URL (Render) > Individual host/port > localhost default
const redisUrl = process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;
console.log('🔴 REDIS CONFIG DEBUG:');
console.log('  REDIS_URL env var:', process.env.REDIS_URL ? '✅ defined' : '❌ undefined');
console.log('  REDIS_HOST env var:', process.env.REDIS_HOST ? '✅ defined' : '❌ undefined');
console.log('  REDIS_PORT env var:', process.env.REDIS_PORT ? '✅ defined' : '❌ undefined');
console.log('  Final redisUrl:', redisUrl);
exports.redisConnection = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
});
exports.redisConnection.on('error', (error) => {
    console.error('Redis connection error for video processing queue:', error.message);
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
exports.videoProcessingDlq = new bullmq_1.Queue(exports.VIDEO_PROCESSING_DLQ, {
    connection: exports.redisConnection,
    defaultJobOptions: {
        removeOnComplete: {
            age: Number(process.env.VIDEO_DLQ_COMPLETE_TTL_SECONDS || 2592000),
            count: Number(process.env.VIDEO_DLQ_COMPLETE_KEEP || 10000),
        },
    },
});
const PROCESSED_RATE_KEY = process.env.VIDEO_PROCESSED_RATE_KEY || 'video:processed:minute';
const USER_PENDING_JOBS_KEY_PREFIX = process.env.USER_PENDING_JOBS_KEY_PREFIX || 'video:pending:user:';
const USER_PENDING_EXPIRE_SECONDS = Number(process.env.USER_PENDING_JOBS_EXPIRE_SECONDS || 86400);
const determinePriority = (data, explicitPriority) => {
    if (Number.isFinite(explicitPriority))
        return explicitPriority;
    if (data.source === 'ads')
        return Number(process.env.VIDEO_JOB_ADS_PRIORITY || 1);
    return Number(process.env.VIDEO_JOB_DEFAULT_PRIORITY || 5);
};
const getUserPendingJobCount = async (userId) => {
    const count = await exports.redisConnection.get(`${USER_PENDING_JOBS_KEY_PREFIX}${userId}`);
    return Number(count || 0);
};
exports.getUserPendingJobCount = getUserPendingJobCount;
const incrementPendingJobCount = async (userId, delta = 1) => {
    const key = `${USER_PENDING_JOBS_KEY_PREFIX}${userId}`;
    const count = await exports.redisConnection.incrby(key, delta);
    if (count === delta) {
        await exports.redisConnection.expire(key, USER_PENDING_EXPIRE_SECONDS);
    }
    return count;
};
exports.incrementPendingJobCount = incrementPendingJobCount;
const MAX_USER_PENDING_VIDEO_JOBS = Number(process.env.MAX_USER_PENDING_VIDEO_JOBS || 10);
const MAX_QUEUE_SIZE = Number(process.env.MAX_QUEUE_SIZE || 1000);
const incrementProcessedRate = async () => {
    const count = await exports.redisConnection.incr(PROCESSED_RATE_KEY);
    if (count === 1) {
        await exports.redisConnection.expire(PROCESSED_RATE_KEY, 60);
    }
    return count;
};
exports.incrementProcessedRate = incrementProcessedRate;
// Sync périodique des compteurs pending jobs pour éviter la dérive
const syncPendingJobCounts = async () => {
    try {
        const jobs = await exports.videoProcessingQueue.getJobs(['waiting', 'active'], 0, 10000);
        const userCounts = {};
        for (const job of jobs) {
            const userId = job.data.ownerId;
            if (userId) {
                userCounts[userId] = (userCounts[userId] || 0) + 1;
            }
        }
        // Reset tous les compteurs et les remettre à jour
        const keys = await exports.redisConnection.keys(`${USER_PENDING_JOBS_KEY_PREFIX}*`);
        if (keys.length > 0) {
            await exports.redisConnection.del(...keys);
        }
        for (const [userId, count] of Object.entries(userCounts)) {
            await exports.redisConnection.set(`${USER_PENDING_JOBS_KEY_PREFIX}${userId}`, count, 'EX', USER_PENDING_EXPIRE_SECONDS);
        }
        console.log(`Synced pending job counts for ${Object.keys(userCounts).length} users`);
    }
    catch (error) {
        console.error('Failed to sync pending job counts:', error);
    }
};
exports.syncPendingJobCounts = syncPendingJobCounts;
const getProcessedRatePerMinute = async () => {
    const value = await exports.redisConnection.get(PROCESSED_RATE_KEY);
    return Number(value || 0);
};
exports.getProcessedRatePerMinute = getProcessedRatePerMinute;
const addVideoProcessingJob = async (data, options = {}) => {
    const priority = determinePriority(data, options.priority);
    const userId = options.userId || data.ownerId;
    // Backpressure : vérifier la taille totale de la queue
    const waitingJobs = await exports.videoProcessingQueue.getWaiting();
    const activeJobs = await exports.videoProcessingQueue.getActive();
    const totalQueued = waitingJobs.length + activeJobs.length;
    if (totalQueued >= MAX_QUEUE_SIZE) {
        throw new Error(`Queue overloaded: ${totalQueued} jobs (max ${MAX_QUEUE_SIZE})`);
    }
    if (userId) {
        const pendingCount = await (0, exports.getUserPendingJobCount)(userId);
        if (pendingCount >= MAX_USER_PENDING_VIDEO_JOBS) {
            throw new Error(`Upload queue limit exceeded: ${pendingCount} pending jobs (max ${MAX_USER_PENDING_VIDEO_JOBS})`);
        }
        await (0, exports.incrementPendingJobCount)(userId, 1);
    }
    // Idempotence améliorée : jobId basé sur hash du fichier + entité cible
    let jobId = options.jobId;
    if (!jobId) {
        const hashInput = `${data.rawPath}:${data.originalFilename}:${data.ownerId}:${data.postId || data.campaignId || ''}`;
        jobId = (0, crypto_1.createHash)('sha256').update(hashInput).digest('hex').substring(0, 32);
    }
    try {
        return await exports.videoProcessingQueue.add('process-video', data, {
            jobId,
            priority,
        });
    }
    catch (error) {
        if (userId) {
            await (0, exports.incrementPendingJobCount)(userId, -1);
        }
        throw error;
    }
};
exports.addVideoProcessingJob = addVideoProcessingJob;
const getVideoProcessingJobStatus = async (jobId) => {
    const job = await exports.videoProcessingQueue.getJob(jobId);
    if (!job) {
        return null;
    }
    const bullState = await job.getState();
    const attempts = job.opts.attempts || 1;
    const isRetrying = job.attemptsMade > 0 &&
        job.attemptsMade < attempts &&
        ['waiting', 'delayed', 'waiting-children', 'failed'].includes(bullState);
    const state = isRetrying
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
exports.getVideoProcessingJobStatus = getVideoProcessingJobStatus;
//# sourceMappingURL=videoProcessing.queue.js.map