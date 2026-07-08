import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Job, Worker } from 'bullmq';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import {
  incrementPendingJobCount,
  incrementProcessedRate,
  redisConnection,
  VIDEO_PROCESSING_QUEUE,
  VideoProcessingJobData,
  VideoProcessingResult,
  videoProcessingDlq,
} from '../queues/videoProcessing.queue';
import { MediaService } from '../modules/media/media.service';

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase worker credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const mediaService = new MediaService(supabase);

const processVideoJob = async (
  job: Job<VideoProcessingJobData, VideoProcessingResult>
): Promise<VideoProcessingResult> => {
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
  await new Promise<void>((resolve, reject) => {
    ffmpeg.ffprobe(job.data.rawPath, (err: Error | null, metadata: any) => {
      if (err) {
        reject(new Error(`FFmpeg validation failed: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
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

  const processed = await mediaService.processStoredVideo(
    job.data.rawPath,
    job.data.originalFilename,
    job.data.ownerId,
    job.data.rawBucket || 'videos',
    job.data.outputBucket || job.data.rawBucket || 'videos',
    job.data.outputPrefix || (job.data.source === 'ads' ? 'videos' : 'posts'),
    job.data.thumbnailPrefix || (job.data.source === 'ads' ? 'thumbnails' : 'thumbnails/posts')
  );

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
  } catch (cleanupError) {
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

const defaultConcurrency = Number(process.env.VIDEO_WORKER_CONCURRENCY || Math.max(1, Math.floor(os.cpus().length / 2)));

const worker = new Worker<VideoProcessingJobData, VideoProcessingResult>(
  VIDEO_PROCESSING_QUEUE,
  processVideoJob,
  {
    connection: redisConnection,
    concurrency: defaultConcurrency,
  }
);

worker.on('completed', async (job) => {
  if (job.data.ownerId) {
    await incrementPendingJobCount(job.data.ownerId, -1);
  }

  await incrementProcessedRate();
  console.log(`Video job completed: ${job.id}`);
});

worker.on('active', async (job) => {
  if (!job.data.postId) return;

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

  if (!job) return;

  const maxAttempts = job.opts.attempts || 1;
  if (job.attemptsMade < maxAttempts) return;

  if (job.data.ownerId) {
    await incrementPendingJobCount(job.data.ownerId, -1);
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

  await videoProcessingDlq.add(
    'failed-video',
    failedJobPayload as any,
    {
      jobId: `dlq:${job.id}:${Date.now()}`,
      attempts: 1,
      removeOnComplete: false,
    }
  );
});

const shutdown = async () => {
  await worker.close();
  await videoProcessingDlq.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(
  `Video processing worker started for queue "${VIDEO_PROCESSING_QUEUE}" with concurrency ${defaultConcurrency}`
);
