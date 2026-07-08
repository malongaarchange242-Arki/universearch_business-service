import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
export declare const VIDEO_PROCESSING_QUEUE: string;
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
export declare const redisConnection: IORedis;
export declare const videoProcessingQueue: Queue<VideoProcessingJobData, any, string, VideoProcessingJobData, any, string>;
export declare const addAdsVideoProcessingJob: (data: VideoProcessingJobData, priority?: number) => Promise<Job<VideoProcessingJobData>>;
export declare const getVideoProcessingJobStatus: (jobId: string) => Promise<{
    id: string | undefined;
    status: string;
    progress: import("bullmq").JobProgress;
    attemptsMade: number;
    attempts: number;
    error_message: string | null;
    rawUrl: string;
    campaignId: string | null;
    createdAt: string;
    processedAt: string | null;
    finishedAt: string | null;
    result: any;
} | null>;
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
export declare const getVideoProcessingQueueMetrics: () => Promise<VideoProcessingQueueMetrics>;
export declare const retryVideoProcessingJob: (jobId: string) => Promise<{
    jobId: string | undefined;
    status: "unknown" | import("bullmq").JobState;
    attemptsMade: number;
} | null>;
export declare const retryAllFailedVideoProcessingJobs: (limit?: number) => Promise<{
    requested: number;
    retried: number;
    errors: string[];
}>;
//# sourceMappingURL=videoProcessing.queue.d.ts.map