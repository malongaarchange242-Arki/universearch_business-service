// src/modules/media/media.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { MediaService } from './media.service';
import {
  addAdsVideoProcessingJob,
  getVideoProcessingJobStatus,
} from '../../config/videoProcessing.queue';

export class MediaController {
  constructor(private mediaService: MediaService) {}

  async uploadMedia(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('Upload request received');
      console.log('Content-Type header:', request.headers['content-type']);

      let data = await request.file();
      if (!data) {
        const bodyAny: any = (request as any).body || {};
        console.log('Multipart body fallback:', Object.keys(bodyAny));
        if (bodyAny.file) {
          data = bodyAny.file;
        } else if (bodyAny.files?.file) {
          data = bodyAny.files.file;
        }
      }

      console.log('File data:', data ? 'present' : 'null');
      if (!data) {
        reply.code(400).send({ success: false, error: 'No file uploaded' });
        return;
      }

      const buffer = await (typeof data.toBuffer === 'function' ? data.toBuffer() : Promise.resolve(Buffer.isBuffer(data) ? data : null));
      if (!buffer) {
        console.error('Failed to convert uploaded file to buffer', { dataKeys: Object.keys(data) });
        reply.code(400).send({ success: false, error: 'Unable to read uploaded file' });
        return;
      }

     const filename = data.filename ?? `upload_${Date.now()}`;
     const mimetype = data.mimetype ?? 'application/octet-stream';

      // Enforce per-type size limits
      const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
      const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB

      if (mimetype.startsWith('image/') && buffer.length > IMAGE_MAX_BYTES) {
        reply.code(413).send({ success: false, error: 'Image too large (max 5MB)' });
        return;
      }
      if (mimetype.startsWith('video/') && buffer.length > VIDEO_MAX_BYTES) {
        reply.code(413).send({ success: false, error: 'Video too large (max 50MB)' });
        return;
      }

      let mediaUrl: string;
      let thumbnailUrl: string | undefined;

      if (mimetype.startsWith('image/')) {
        mediaUrl = await this.mediaService.uploadImage(buffer, filename, mimetype);
      } else if (mimetype.startsWith('video/')) {
        const query = request.query as any;
        const asyncMode =
          query?.async === 'true' ||
          query?.async === '1' ||
          request.headers['x-video-processing'] === 'async';

        if (asyncMode) {
          const ownerId =
            (request.headers['x-user-id'] as string | undefined) ||
            (query?.owner_id as string | undefined) ||
            'ads';
          const campaignId = query?.campaign_id || query?.campaignId || null;
          const priority = query?.priority ? Number(query.priority) : Number(process.env.ADS_VIDEO_JOB_PRIORITY || 1);
          const raw = await this.mediaService.uploadRawVideo(buffer, filename, mimetype, ownerId);
          const job = await addAdsVideoProcessingJob(
            {
              source: 'ads',
              rawBucket: raw.bucket,
              outputBucket: 'ads-media',
              outputPrefix: 'videos',
              thumbnailPrefix: 'thumbnails',
              rawPath: raw.path,
              rawUrl: raw.rawUrl,
              originalFilename: filename,
              ownerId,
              campaignId,
            },
            Number.isFinite(priority) ? priority : 1
          );

          reply.code(202).send({
            success: true,
            status: 'processing',
            data: {
              jobId: job.id,
              rawUrl: raw.rawUrl,
              bucket: raw.bucket,
              path: raw.path,
              mediaType: 'video',
              campaignId,
            },
          });
          return;
        }

        const uploaded = await this.mediaService.uploadVideo(buffer, filename, mimetype);
        mediaUrl = uploaded.mediaUrl;
        thumbnailUrl = uploaded.thumbnailUrl;
      } else {
        reply.code(400).send({
          success: false,
          error: 'Unsupported file type. Allowed: images (jpeg, png, webp) and videos (mp4, webm)'
        });
        return;
      }

      // Ajouter headers CORS pour compatibilité Flutter
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Headers', 'Range, Content-Type');
      reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      reply.send({ success: true, data: { mediaUrl, thumbnailUrl } });
    } catch (error) {
      console.error('Upload error:', error);
      const msg = (error as Error).message || '';
      if (msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('ffmpeg')) {
        reply.code(504).send({ success: false, error: 'Video processing timed out. Try increasing FFMPEG_TIMEOUT_MS or processing asynchronously.' });
      } else {
        reply.code(500).send({ success: false, error: msg });
      }
    }
  }

  async getUploadJob(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const job = await getVideoProcessingJobStatus(request.params.id);

    if (!job) {
      reply.code(404).send({ success: false, error: 'Upload job not found' });
      return;
    }

    reply.send({ success: true, data: job });
  }

  async deleteMedia(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { mediaUrl } = request.body as { mediaUrl: string };
      await this.mediaService.deleteMedia(mediaUrl);
      reply.send({ success: true, message: 'Media deleted' });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  }
}
