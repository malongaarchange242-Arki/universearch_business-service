"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const bullmq_1 = require("bullmq");
const os_1 = __importDefault(require("os"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpegInstaller = __importStar(require("@ffmpeg-installer/ffmpeg"));
const videoProcessing_queue_1 = require("../queues/videoProcessing.queue");
const media_service_1 = require("../modules/media/media.service");
fluent_ffmpeg_1.default.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase worker credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
const mediaService = new media_service_1.MediaService(supabase);
const processVideoJob = async (job) => {
    await job.updateProgress(5);
    // Protection contre le double traitement
    if (job.data.postId) {
        const { data: post, error } = await supabase
            .from('posts')
            .select('media_processing_status, media_url, thumbnail_url')
            .eq('id', job.data.postId)
            .eq('author_id', job.data.ownerId)
            .single();
        if (error) {
            throw new Error(`Failed to check post status: ${error.message}`);
        }
        if (post?.media_processing_status === 'completed') {
            console.log(`Skipping already completed job ${job.id} for post ${job.data.postId}`);
            return {
                videoUrl: post.media_url || '',
                thumbnailUrl: post.thumbnail_url || '',
                bucket: job.data.outputBucket || 'videos',
                path: '',
                thumbnailPath: '',
                cleanedRaw: false,
            };
        }
    }
    // Validation FFmpeg input
    await new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(job.data.rawPath, (err, metadata) => {
            if (err) {
                reject(new Error(`FFmpeg validation failed: ${err.message}`));
                return;
            }
            const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
            if (!videoStream) {
                reject(new Error('No video stream found in file'));
                return;
            }
            // Vérifications supplémentaires
            const duration = metadata.format.duration;
            if (duration && duration > 600) { // 10 minutes max
                reject(new Error(`Video too long: ${duration}s (max 600s)`));
                return;
            }
            resolve();
        });
    });
    const processed = await mediaService.processStoredVideo(job.data.rawPath, job.data.originalFilename, job.data.ownerId, job.data.rawBucket || 'videos', job.data.outputBucket || job.data.rawBucket || 'videos', job.data.outputPrefix || (job.data.source === 'ads' ? 'videos' : 'posts'), job.data.thumbnailPrefix || (job.data.source === 'ads' ? 'thumbnails' : 'thumbnails/posts'));
    await job.updateProgress(80);
    if (job.data.postId) {
        const { error } = await supabase
            .from('posts')
            .update({
            media_url: processed.url,
            thumbnail_url: processed.thumbnailUrl,
            media_type: 'video',
            media_processing_status: 'completed',
            media_processing_error: null,
        })
            .eq('id', job.data.postId)
            .eq('author_id', job.data.ownerId);
        if (error) {
            throw new Error(`Post media update failed: ${error.message}`);
        }
    }
    if (job.data.campaignId) {
        const { error } = await supabase
            .from('ads_campaigns')
            .update({
            media_url: processed.url,
            media_type: 'video',
        })
            .eq('id', job.data.campaignId);
        if (error) {
            throw new Error(`Campaign media update failed: ${error.message}`);
        }
    }
    await job.updateProgress(90);
    let cleanedRaw = false;
    try {
        await mediaService.deleteRawVideo(job.data.rawPath, job.data.rawBucket || 'videos');
        cleanedRaw = true;
    }
    catch (cleanupError) {
        console.error(`Raw cleanup failed for job ${job.id}:`, cleanupError);
    }
    await job.updateProgress(100);
    return {
        videoUrl: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        bucket: processed.bucket,
        path: processed.path,
        thumbnailPath: processed.thumbnailPath,
        cleanedRaw,
    };
};
const defaultConcurrency = Number(process.env.VIDEO_WORKER_CONCURRENCY || Math.max(1, Math.floor(os_1.default.cpus().length / 2)));
const worker = new bullmq_1.Worker(videoProcessing_queue_1.VIDEO_PROCESSING_QUEUE, processVideoJob, {
    connection: videoProcessing_queue_1.redisConnection,
    concurrency: defaultConcurrency,
});
worker.on('completed', async (job) => {
    if (job.data.ownerId) {
        await (0, videoProcessing_queue_1.incrementPendingJobCount)(job.data.ownerId, -1);
    }
    await (0, videoProcessing_queue_1.incrementProcessedRate)();
    console.log(`Video job completed: ${job.id}`);
});
worker.on('active', async (job) => {
    if (!job.data.postId)
        return;
    await supabase
        .from('posts')
        .update({
        media_processing_status: 'processing',
        media_processing_error: null,
    })
        .eq('id', job.data.postId)
        .eq('author_id', job.data.ownerId);
});
worker.on('failed', async (job, error) => {
    console.error(`Video job failed: ${job?.id || 'unknown'}`, error);
    if (!job)
        return;
    const maxAttempts = job.opts.attempts || 1;
    if (job.attemptsMade < maxAttempts)
        return;
    if (job.data.ownerId) {
        await (0, videoProcessing_queue_1.incrementPendingJobCount)(job.data.ownerId, -1);
    }
    if (job.data.postId) {
        await supabase
            .from('posts')
            .update({
            media_processing_status: 'failed',
            media_processing_error: error.message,
        })
            .eq('id', job.data.postId)
            .eq('author_id', job.data.ownerId);
    }
    const failedJobPayload = {
        ...job.data,
        failedReason: error.message,
        failedStack: error.stack || null,
        sourceJobId: job.id,
        originalData: job.data,
    };
    await videoProcessing_queue_1.videoProcessingDlq.add('failed-video', failedJobPayload, {
        jobId: `dlq:${job.id}:${Date.now()}`,
        attempts: 1,
        removeOnComplete: false,
    });
});
const shutdown = async () => {
    await worker.close();
    await videoProcessing_queue_1.videoProcessingDlq.close();
    await videoProcessing_queue_1.redisConnection.quit();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log(`Video processing worker started for queue "${videoProcessing_queue_1.VIDEO_PROCESSING_QUEUE}" with concurrency ${defaultConcurrency}`);
//# sourceMappingURL=videoProcessing.worker.js.map