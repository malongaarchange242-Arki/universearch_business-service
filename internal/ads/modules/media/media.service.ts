// src/modules/media/media.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);

const DEFAULT_FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT_MS || 120_000); // 2 minutes default
const FFMPEG_MAX_RETRIES = Number(process.env.FFMPEG_MAX_RETRIES || 1);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export interface UploadedVideoMedia {
  mediaUrl: string;
  thumbnailUrl: string;
}

export interface RawVideoMedia {
  rawUrl: string;
  bucket: string;
  path: string;
}

export class MediaService {
  constructor(private supabase: SupabaseClient) {}

  private validateFileType(mimetype: string): 'image' | 'video' | null {
    if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'video';
    return null;
  }

  private generateSafeFilename(filename: string, mimetype: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    if (mimetype === 'image/jpeg') return `${randomUUID()}.jpg`;
    if (mimetype === 'image/png') return `${randomUUID()}.png`;
    if (mimetype === 'image/webp') return `${randomUUID()}.webp`;
    if (mimetype === 'video/mp4') return `${randomUUID()}.mp4`;
    if (mimetype === 'video/webm') return `${randomUUID()}.webm`;
    return `${randomUUID()}.${ext}`;
  }

  async uploadImage(file: Buffer, filename: string, mimetype: string): Promise<string> {
    const fileType = this.validateFileType(mimetype);
    if (fileType !== 'image') {
      throw new Error(`Invalid image type: ${mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }

    const safeFilename = this.generateSafeFilename(filename, mimetype);
    const filePath = `images/${safeFilename}`;

    const { error } = await this.supabase.storage
      .from('ads-media')
      .upload(filePath, file, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from('ads-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  async uploadVideo(file: Buffer, filename: string, mimetype: string): Promise<UploadedVideoMedia> {
    const fileType = this.validateFileType(mimetype);
    if (fileType !== 'video') {
      throw new Error(`Invalid video type: ${mimetype}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
    }

    const normalizedBuffer = await this.normalizeVideo(file, filename);
    const thumbnailBuffer = await this.generateThumbnailBuffer(normalizedBuffer);

    const safeFilename = this.generateSafeFilename(filename, 'video/mp4');
    const filePath = `videos/${safeFilename}`;
    const thumbnailPath = `thumbnails/${path.parse(safeFilename).name}.jpg`;

    const { error } = await this.supabase.storage
      .from('ads-media')
      .upload(filePath, normalizedBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) throw error;

    const { error: thumbnailError } = await this.supabase.storage
      .from('ads-media')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (thumbnailError) throw thumbnailError;

    const { data: urlData } = this.supabase.storage
      .from('ads-media')
      .getPublicUrl(filePath);

    const { data: thumbnailUrlData } = this.supabase.storage
      .from('ads-media')
      .getPublicUrl(thumbnailPath);

    return {
      mediaUrl: urlData.publicUrl,
      thumbnailUrl: thumbnailUrlData.publicUrl,
    };
  }

  async uploadRawVideo(file: Buffer, filename: string, mimetype: string, ownerId = 'unknown'): Promise<RawVideoMedia> {
    const fileType = this.validateFileType(mimetype);
    if (fileType !== 'video') {
      throw new Error(`Invalid video type: ${mimetype}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
    }

    const safeOwnerId = path.basename(ownerId || 'unknown').replace(/[^\w.-]/g, '_') || 'unknown';
    const ext = path.extname(filename || '').toLowerCase() || '.video';
    const filePath = `raw/videos/${safeOwnerId}/${randomUUID()}${ext}`;

    const { error } = await this.supabase.storage
      .from('ads-media')
      .upload(filePath, file, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from('ads-media')
      .getPublicUrl(filePath);

    return {
      rawUrl: urlData.publicUrl,
      bucket: 'ads-media',
      path: filePath,
    };
  }

  private async normalizeVideo(inputBuffer: Buffer, originalFilename: string): Promise<Buffer> {
    const safeOriginalName = path.basename(originalFilename || 'upload.video').replace(/[^\w.-]/g, '_');
    const tempInputPath = path.join(os.tmpdir(), `${randomUUID()}_${safeOriginalName}`);
    const tempOutputPath = path.join(os.tmpdir(), `${randomUUID()}_normalized.mp4`);

    fs.writeFileSync(tempInputPath, inputBuffer);

    return new Promise(async (resolve, reject) => {
      const tryRun = async (): Promise<Buffer> => {
        return new Promise<Buffer>((innerResolve, innerReject) => {
          const command = ffmpeg(tempInputPath)
            .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-b:v 800k',
          '-maxrate 800k',
          '-bufsize 1200k',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-threads 2',
          '-pix_fmt yuv420p',
          "-vf scale='trunc(min(1280,iw)/2)*2':-2",
        ])
            .output(tempOutputPath);

          let timedOut = false;
          const timeoutMs = DEFAULT_FFMPEG_TIMEOUT_MS;
          const timeout = setTimeout(() => {
            timedOut = true;
            try {
              command.kill('SIGKILL');
            } catch (_) {}
          }, timeoutMs);

          command
            .on('end', () => {
              clearTimeout(timeout);
              try {
                const outputBuffer = fs.readFileSync(tempOutputPath);
                this.cleanupFiles(tempInputPath, tempOutputPath);
                innerResolve(outputBuffer);
              } catch (err) {
                innerReject(err);
              }
            })
            .on('error', (err: Error) => {
              clearTimeout(timeout);
              this.cleanupFiles(tempInputPath, tempOutputPath);
              if (timedOut) {
                innerReject(new Error(`FFmpeg normalization timed out after ${timeoutMs}ms`));
              } else {
                innerReject(new Error(`FFmpeg normalization failed: ${err.message}`));
              }
            })
            .run();
        });
      };

      let lastErr: Error | null = null;
      for (let attempt = 1; attempt <= Math.max(1, FFMPEG_MAX_RETRIES); attempt++) {
        try {
          const buf = await tryRun();
          resolve(buf);
          return;
        } catch (err: any) {
          lastErr = err;
          if (attempt === Math.max(1, FFMPEG_MAX_RETRIES)) break;
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }

      reject(lastErr || new Error('FFmpeg normalization failed'));
    });
  }

  private async generateThumbnailBuffer(inputBuffer: Buffer): Promise<Buffer> {
    const tempInputPath = path.join(os.tmpdir(), `${randomUUID()}_thumb_input.mp4`);
    const tempOutputPath = path.join(os.tmpdir(), `${randomUUID()}_thumb.jpg`);

    fs.writeFileSync(tempInputPath, inputBuffer);

    return new Promise(async (resolve, reject) => {
      const tryRun = async (): Promise<Buffer> => {
        return new Promise<Buffer>((innerResolve, innerReject) => {
          const command = ffmpeg(tempInputPath)
            .seekInput('00:00:01')
            .outputOptions([
              '-frames:v 1',
              '-vf thumbnail,scale=720:-2',
              '-q:v 3',
            ])
            .output(tempOutputPath);

          let timedOut = false;
          const timeoutMs = DEFAULT_FFMPEG_TIMEOUT_MS;
          const timeout = setTimeout(() => {
            timedOut = true;
            try {
              command.kill('SIGKILL');
            } catch (_) {}
          }, timeoutMs);

          command
            .on('end', () => {
              clearTimeout(timeout);
              try {
                const outputBuffer = fs.readFileSync(tempOutputPath);
                this.cleanupFiles(tempInputPath, tempOutputPath);
                innerResolve(outputBuffer);
              } catch (err) {
                innerReject(err);
              }
            })
            .on('error', (err: Error) => {
              clearTimeout(timeout);
              this.cleanupFiles(tempInputPath, tempOutputPath);
              if (timedOut) {
                innerReject(new Error(`FFmpeg thumbnail generation timed out after ${timeoutMs}ms`));
              } else {
                innerReject(new Error(`FFmpeg thumbnail generation failed: ${err.message}`));
              }
            })
            .run();
        });
      };

      let lastErr: Error | null = null;
      for (let attempt = 1; attempt <= Math.max(1, FFMPEG_MAX_RETRIES); attempt++) {
        try {
          const buf = await tryRun();
          resolve(buf);
          return;
        } catch (err: any) {
          lastErr = err;
          if (attempt === Math.max(1, FFMPEG_MAX_RETRIES)) break;
          await new Promise(r => setTimeout(r, 200 * attempt));
        }
      }

      reject(lastErr || new Error('FFmpeg thumbnail generation failed'));
    });
  }

  async deleteMedia(mediaUrl: string): Promise<void> {
    const urlParts = mediaUrl.split('/');
    const filePath = urlParts.slice(-2).join('/');

    const { error } = await this.supabase.storage
      .from('ads-media')
      .remove([filePath]);

    if (error) throw error;
  }

  private cleanupFiles(...files: string[]) {
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}
