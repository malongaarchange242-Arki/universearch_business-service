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
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpegInstaller = __importStar(require("@ffmpeg-installer/ffmpeg"));
fluent_ffmpeg_1.default.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);
const DEFAULT_FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT_MS || 120000); // 2 minutes default
const FFMPEG_MAX_RETRIES = Number(process.env.FFMPEG_MAX_RETRIES || 1);
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
class MediaService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    validateFileType(mimetype) {
        if (ALLOWED_IMAGE_TYPES.includes(mimetype))
            return 'image';
        if (ALLOWED_VIDEO_TYPES.includes(mimetype))
            return 'video';
        return null;
    }
    generateSafeFilename(filename, mimetype) {
        const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
        if (mimetype === 'image/jpeg')
            return `${(0, crypto_1.randomUUID)()}.jpg`;
        if (mimetype === 'image/png')
            return `${(0, crypto_1.randomUUID)()}.png`;
        if (mimetype === 'image/webp')
            return `${(0, crypto_1.randomUUID)()}.webp`;
        if (mimetype === 'video/mp4')
            return `${(0, crypto_1.randomUUID)()}.mp4`;
        if (mimetype === 'video/webm')
            return `${(0, crypto_1.randomUUID)()}.webm`;
        return `${(0, crypto_1.randomUUID)()}.${ext}`;
    }
    async uploadImage(file, filename, mimetype) {
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
        if (error)
            throw error;
        const { data: urlData } = this.supabase.storage
            .from('ads-media')
            .getPublicUrl(filePath);
        return urlData.publicUrl;
    }
    async uploadVideo(file, filename, mimetype) {
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
        if (error)
            throw error;
        const { error: thumbnailError } = await this.supabase.storage
            .from('ads-media')
            .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
        });
        if (thumbnailError)
            throw thumbnailError;
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
    async uploadRawVideo(file, filename, mimetype, ownerId = 'unknown') {
        const fileType = this.validateFileType(mimetype);
        if (fileType !== 'video') {
            throw new Error(`Invalid video type: ${mimetype}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
        }
        const safeOwnerId = path.basename(ownerId || 'unknown').replace(/[^\w.-]/g, '_') || 'unknown';
        const ext = path.extname(filename || '').toLowerCase() || '.video';
        const filePath = `raw/videos/${safeOwnerId}/${(0, crypto_1.randomUUID)()}${ext}`;
        const { error } = await this.supabase.storage
            .from('ads-media')
            .upload(filePath, file, {
            contentType: mimetype,
            upsert: false,
        });
        if (error)
            throw error;
        const { data: urlData } = this.supabase.storage
            .from('ads-media')
            .getPublicUrl(filePath);
        return {
            rawUrl: urlData.publicUrl,
            bucket: 'ads-media',
            path: filePath,
        };
    }
    async normalizeVideo(inputBuffer, originalFilename) {
        const safeOriginalName = path.basename(originalFilename || 'upload.video').replace(/[^\w.-]/g, '_');
        const tempInputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_${safeOriginalName}`);
        const tempOutputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_normalized.mp4`);
        fs.writeFileSync(tempInputPath, inputBuffer);
        return new Promise(async (resolve, reject) => {
            const tryRun = async () => {
                return new Promise((innerResolve, innerReject) => {
                    const command = (0, fluent_ffmpeg_1.default)(tempInputPath)
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
                        }
                        catch (_) { }
                    }, timeoutMs);
                    command
                        .on('end', () => {
                        clearTimeout(timeout);
                        try {
                            const outputBuffer = fs.readFileSync(tempOutputPath);
                            this.cleanupFiles(tempInputPath, tempOutputPath);
                            innerResolve(outputBuffer);
                        }
                        catch (err) {
                            innerReject(err);
                        }
                    })
                        .on('error', (err) => {
                        clearTimeout(timeout);
                        this.cleanupFiles(tempInputPath, tempOutputPath);
                        if (timedOut) {
                            innerReject(new Error(`FFmpeg normalization timed out after ${timeoutMs}ms`));
                        }
                        else {
                            innerReject(new Error(`FFmpeg normalization failed: ${err.message}`));
                        }
                    })
                        .run();
                });
            };
            let lastErr = null;
            for (let attempt = 1; attempt <= Math.max(1, FFMPEG_MAX_RETRIES); attempt++) {
                try {
                    const buf = await tryRun();
                    resolve(buf);
                    return;
                }
                catch (err) {
                    lastErr = err;
                    if (attempt === Math.max(1, FFMPEG_MAX_RETRIES))
                        break;
                    await new Promise(r => setTimeout(r, 500 * attempt));
                }
            }
            reject(lastErr || new Error('FFmpeg normalization failed'));
        });
    }
    async generateThumbnailBuffer(inputBuffer) {
        const tempInputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_thumb_input.mp4`);
        const tempOutputPath = path.join(os.tmpdir(), `${(0, crypto_1.randomUUID)()}_thumb.jpg`);
        fs.writeFileSync(tempInputPath, inputBuffer);
        return new Promise(async (resolve, reject) => {
            const tryRun = async () => {
                return new Promise((innerResolve, innerReject) => {
                    const command = (0, fluent_ffmpeg_1.default)(tempInputPath)
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
                        }
                        catch (_) { }
                    }, timeoutMs);
                    command
                        .on('end', () => {
                        clearTimeout(timeout);
                        try {
                            const outputBuffer = fs.readFileSync(tempOutputPath);
                            this.cleanupFiles(tempInputPath, tempOutputPath);
                            innerResolve(outputBuffer);
                        }
                        catch (err) {
                            innerReject(err);
                        }
                    })
                        .on('error', (err) => {
                        clearTimeout(timeout);
                        this.cleanupFiles(tempInputPath, tempOutputPath);
                        if (timedOut) {
                            innerReject(new Error(`FFmpeg thumbnail generation timed out after ${timeoutMs}ms`));
                        }
                        else {
                            innerReject(new Error(`FFmpeg thumbnail generation failed: ${err.message}`));
                        }
                    })
                        .run();
                });
            };
            let lastErr = null;
            for (let attempt = 1; attempt <= Math.max(1, FFMPEG_MAX_RETRIES); attempt++) {
                try {
                    const buf = await tryRun();
                    resolve(buf);
                    return;
                }
                catch (err) {
                    lastErr = err;
                    if (attempt === Math.max(1, FFMPEG_MAX_RETRIES))
                        break;
                    await new Promise(r => setTimeout(r, 200 * attempt));
                }
            }
            reject(lastErr || new Error('FFmpeg thumbnail generation failed'));
        });
    }
    async deleteMedia(mediaUrl) {
        const urlParts = mediaUrl.split('/');
        const filePath = urlParts.slice(-2).join('/');
        const { error } = await this.supabase.storage
            .from('ads-media')
            .remove([filePath]);
        if (error)
            throw error;
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
}
exports.MediaService = MediaService;
//# sourceMappingURL=media.service.js.map