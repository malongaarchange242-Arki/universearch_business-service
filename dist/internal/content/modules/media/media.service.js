"use strict";
// src/modules/media/media.service.ts
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
exports.MediaService = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpegInstaller = __importStar(require("@ffmpeg-installer/ffmpeg"));
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
fluent_ffmpeg_1.default.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);
class MediaService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async normalizeVideo(inputBuffer, originalFilename) {
        const safeOriginalName = path.basename(originalFilename || 'upload.video').replace(/[^\w.-]/g, '_');
        const tempInputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_${safeOriginalName}`);
        const tempOutputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_normalized.mp4`);
        fs.writeFileSync(tempInputPath, inputBuffer);
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(tempInputPath)
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
                .on('error', (err) => {
                this.cleanupFiles(tempInputPath, tempOutputPath);
                reject(new Error(`FFmpeg normalization failed: ${err.message}`));
            })
                .run();
        });
    }
    async generateThumbnailBuffer(inputBuffer) {
        const tempInputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_thumb_input.mp4`);
        const tempOutputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_thumb.jpg`);
        fs.writeFileSync(tempInputPath, inputBuffer);
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(tempInputPath)
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
                .on('error', (err) => {
                this.cleanupFiles(tempInputPath, tempOutputPath);
                reject(new Error(`FFmpeg thumbnail generation failed: ${err.message}`));
            })
                .run();
        });
    }
    async uploadNormalizedVideo(buffer) {
        const filePath = `posts/${(0, crypto_1.randomUUID)()}.mp4`;
        const { error } = await this.supabase.storage
            .from('videos')
            .upload(filePath, buffer, {
            contentType: 'video/mp4',
            upsert: false,
        });
        if (error)
            throw new Error(`Upload failed: ${error.message}`);
        const { data: publicUrl } = this.supabase.storage
            .from('videos')
            .getPublicUrl(filePath);
        return publicUrl.publicUrl;
    }
    async uploadRawVideo(inputBuffer, originalFilename, ownerId = 'unknown', mimetype = 'application/octet-stream', bucket = 'videos', rawPrefix = 'raw/posts') {
        const safeOwnerId = this.safePathSegment(ownerId);
        const ext = path.extname(originalFilename || '').toLowerCase() || '.video';
        const filePath = `${rawPrefix}/${safeOwnerId}/${(0, crypto_1.randomUUID)()}${ext}`;
        const { error } = await this.supabase.storage
            .from(bucket)
            .upload(filePath, inputBuffer, {
            contentType: mimetype,
            upsert: false,
        });
        if (error)
            throw new Error(`Raw upload failed: ${error.message}`);
        const { data: publicUrl } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
        return {
            rawUrl: publicUrl.publicUrl,
            bucket,
            path: filePath,
        };
    }
    async processAndUploadVideo(inputBuffer, originalFilename, ownerId = 'unknown', bucket = 'videos', outputPrefix = 'posts', thumbnailPrefix = 'thumbnails/posts') {
        const normalizedBuffer = await this.normalizeVideo(inputBuffer, originalFilename);
        const thumbnailBuffer = await this.generateThumbnailBuffer(normalizedBuffer);
        const safeOwnerId = this.safePathSegment(ownerId);
        const mediaId = (0, crypto_1.randomUUID)();
        const filePath = `${outputPrefix}/${safeOwnerId}/${mediaId}.mp4`;
        const thumbnailPath = `${thumbnailPrefix}/${safeOwnerId}/${mediaId}.jpg`;
        const { error } = await this.supabase.storage
            .from(bucket)
            .upload(filePath, normalizedBuffer, {
            contentType: 'video/mp4',
            upsert: false,
        });
        if (error)
            throw new Error(`Upload failed: ${error.message}`);
        const { error: thumbnailError } = await this.supabase.storage
            .from(bucket)
            .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
        });
        if (thumbnailError)
            throw new Error(`Thumbnail upload failed: ${thumbnailError.message}`);
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
    async processStoredVideo(rawPath, originalFilename, ownerId = 'unknown', rawBucket = 'videos', outputBucket = rawBucket, outputPrefix = 'posts', thumbnailPrefix = 'thumbnails/posts') {
        const { data, error } = await this.supabase.storage
            .from(rawBucket)
            .download(rawPath);
        if (error || !data) {
            throw new Error(`Raw download failed: ${error?.message || 'No data returned'}`);
        }
        const inputBuffer = Buffer.from(await data.arrayBuffer());
        return this.processAndUploadVideo(inputBuffer, originalFilename, ownerId, outputBucket, outputPrefix, thumbnailPrefix);
    }
    async deleteRawVideo(rawPath, bucket = 'videos') {
        const { error } = await this.supabase.storage
            .from(bucket)
            .remove([rawPath]);
        if (error) {
            throw new Error(`Raw cleanup failed: ${error.message}`);
        }
    }
    cleanupFiles(...files) {
        for (const file of files) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            }
            catch {
                // Best-effort cleanup.
            }
        }
    }
    safePathSegment(value) {
        return path.basename(value || 'unknown').replace(/[^\w.-]/g, '_') || 'unknown';
    }
}
exports.MediaService = MediaService;
//# sourceMappingURL=media.service.js.map