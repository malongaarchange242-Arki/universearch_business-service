// src/modules/media/media.service.ts

import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);

export interface ProcessedVideoMedia {
  url: string;
  thumbnailUrl: string;
  bucket: string;
  path: string;
  thumbnailPath: string;
}

export interface RawVideoMedia {
  rawUrl: string;
  bucket: string;
  path: string;
}

export class MediaService {
  constructor(private supabase: SupabaseClient) {}

  async normalizeVideo(inputBuffer: Buffer, originalFilename: string): Promise<Buffer> {
    const safeOriginalName = path.basename(originalFilename || 'upload.video').replace(/[^\w.-]/g, '_');
    const tempInputPath = path.join(os.tmpdir(), `${randomUUID()}_${safeOriginalName}`);
    const tempOutputPath = path.join(os.tmpdir(), `${randomUUID()}_normalized.mp4`);

    fs.writeFileSync(tempInputPath, inputBuffer);

    return new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
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
        .output(tempOutputPath)
        .on('end', () => {
          const outputBuffer = fs.readFileSync(tempOutputPath);
          this.cleanupFiles(tempInputPath, tempOutputPath);
          resolve(outputBuffer);
        })
        .on('error', (err: Error) => {
          this.cleanupFiles(tempInputPath, tempOutputPath);
          reject(new Error(`FFmpeg normalization failed: ${err.message}`));
        })
        .run();
    });
  }

  async generateThumbnailBuffer(inputBuffer: Buffer): Promise<Buffer> {
    const tempInputPath = path.join(os.tmpdir(), `${randomUUID()}_thumb_input.mp4`);
    const tempOutputPath = path.join(os.tmpdir(), `${randomUUID()}_thumb.jpg`);

    fs.writeFileSync(tempInputPath, inputBuffer);

    return new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .seekInput('00:00:01')
        .outputOptions([
          '-frames:v 1',
          '-vf thumbnail,scale=720:-2',
          '-q:v 3',
        ])
        .output(tempOutputPath)
        .on('end', () => {
          const outputBuffer = fs.readFileSync(tempOutputPath);
          this.cleanupFiles(tempInputPath, tempOutputPath);
          resolve(outputBuffer);
        })
        .on('error', (err: Error) => {
          this.cleanupFiles(tempInputPath, tempOutputPath);
          reject(new Error(`FFmpeg thumbnail generation failed: ${err.message}`));
        })
        .run();
    });
  }

  async uploadNormalizedVideo(buffer: Buffer): Promise<string> {
    const filePath = `posts/${randomUUID()}.mp4`;

    const { error } = await this.supabase.storage
      .from('videos')
      .upload(filePath, buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: publicUrl } = this.supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  }

  async uploadRawVideo(
    inputBuffer: Buffer,
    originalFilename: string,
    ownerId = 'unknown',
    mimetype = 'application/octet-stream',
    bucket = 'videos',
    rawPrefix = 'raw/posts'
  ): Promise<RawVideoMedia> {
    const safeOwnerId = this.safePathSegment(ownerId);
    const ext = path.extname(originalFilename || '').toLowerCase() || '.video';
    const filePath = `${rawPrefix}/${safeOwnerId}/${randomUUID()}${ext}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, inputBuffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) throw new Error(`Raw upload failed: ${error.message}`);

    const { data: publicUrl } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      rawUrl: publicUrl.publicUrl,
      bucket,
      path: filePath,
    };
  }

  async processAndUploadVideo(
    inputBuffer: Buffer,
    originalFilename: string,
    ownerId = 'unknown',
    bucket = 'videos',
    outputPrefix = 'posts',
    thumbnailPrefix = 'thumbnails/posts'
  ): Promise<ProcessedVideoMedia> {
    const normalizedBuffer = await this.normalizeVideo(inputBuffer, originalFilename);
    const thumbnailBuffer = await this.generateThumbnailBuffer(normalizedBuffer);
    const safeOwnerId = this.safePathSegment(ownerId);
    const mediaId = randomUUID();
    const filePath = `${outputPrefix}/${safeOwnerId}/${mediaId}.mp4`;
    const thumbnailPath = `${thumbnailPrefix}/${safeOwnerId}/${mediaId}.jpg`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, normalizedBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { error: thumbnailError } = await this.supabase.storage
      .from(bucket)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (thumbnailError) throw new Error(`Thumbnail upload failed: ${thumbnailError.message}`);

    const { data: publicUrl } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const { data: thumbnailPublicUrl } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(thumbnailPath);

    return {
      url: publicUrl.publicUrl,
      thumbnailUrl: thumbnailPublicUrl.publicUrl,
      bucket,
      path: filePath,
      thumbnailPath,
    };
  }

  async processStoredVideo(
    rawPath: string,
    originalFilename: string,
    ownerId = 'unknown',
    rawBucket = 'videos',
    outputBucket = rawBucket,
    outputPrefix = 'posts',
    thumbnailPrefix = 'thumbnails/posts'
  ): Promise<ProcessedVideoMedia> {
    const { data, error } = await this.supabase.storage
      .from(rawBucket)
      .download(rawPath);

    if (error || !data) {
      throw new Error(`Raw download failed: ${error?.message || 'No data returned'}`);
    }

    const inputBuffer = Buffer.from(await data.arrayBuffer());
    return this.processAndUploadVideo(
      inputBuffer,
      originalFilename,
      ownerId,
      outputBucket,
      outputPrefix,
      thumbnailPrefix
    );
  }

  async deleteRawVideo(rawPath: string, bucket = 'videos'): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([rawPath]);

    if (error) {
      throw new Error(`Raw cleanup failed: ${error.message}`);
    }
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

  private safePathSegment(value: string): string {
    return path.basename(value || 'unknown').replace(/[^\w.-]/g, '_') || 'unknown';
  }
}
