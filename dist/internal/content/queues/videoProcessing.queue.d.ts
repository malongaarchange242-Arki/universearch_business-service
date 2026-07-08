import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
export declare const VIDEO_PROCESSING_QUEUE: string;
export declare const VIDEO_PROCESSING_DLQ: string;
export type VideoJobState = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
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
export declare const redisConnection: IORedis;
export declare const videoProcessingQueue: Queue<VideoProcessingJobData, VideoProcessingResult, string, VideoProcessingJobData, VideoProcessingResult, string>;
export declare const videoProcessingDlq: Queue<VideoProcessingJobData, VideoProcessingResult, string, VideoProcessingJobData, VideoProcessingResult, string>;
export interface AddVideoProcessingJobOptions {
    jobId?: string;
    priority?: number;
    userId?: string;
}
export declare const getUserPendingJobCount: (userId: string) => Promise<number>;
export declare const incrementPendingJobCount: (userId: string, delta?: number) => Promise<number>;
export declare const incrementProcessedRate: () => Promise<number>;
export declare const syncPendingJobCounts: () => Promise<void>;
export declare const getProcessedRatePerMinute: () => Promise<number>;
export declare const addVideoProcessingJob: (data: VideoProcessingJobData, options?: AddVideoProcessingJobOptions) => Promise<Job<VideoProcessingJobData, VideoProcessingResult>>;
export declare const getVideoProcessingJobStatus: (jobId: string) => Promise<{
    id: string | undefined;
    status: VideoJobState;
    rawUrl: string;
    rawPath: string;
    postId: string | null;
    ownerId: string;
    progress: import("bullmq").JobProgress;
    attemptsMade: number;
    attempts: number;
    error_message: string | null;
    createdAt: string;
    processedAt: string | null;
    finishedAt: string | null;
    result: VideoProcessingResult;
} | null>;
//# sourceMappingURL=videoProcessing.queue.d.ts.map