"use strict";
// src/modules/media/media.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const videoProcessing_queue_1 = require("../../config/videoProcessing.queue");
class MediaController {
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async uploadMedia(request, reply) {
        try {
            console.log('Upload request received');
            console.log('Content-Type header:', request.headers['content-type']);
            // Support both modes: when @fastify/multipart is configured with
            // `attachFieldsToBody: true` files are available on `request.body.file`.
            // Otherwise use the streaming API `request.file()`.
            const contentType = (request.headers['content-type'] || request.headers['Content-Type'] || '').toString();
            const bodyAny = request.body || {};
            let fileObj = bodyAny.file;
            let uploadedStreamFile = null;
            if (!fileObj) {
                if (typeof request.file === 'function') {
                    try {
                        uploadedStreamFile = await request.file();
                    }
                    catch (e) {
                        // ignore, we'll handle absence below
                        uploadedStreamFile = null;
                    }
                }
            }
            if (!fileObj && !uploadedStreamFile) {
                console.warn('No file in request.body and request.file() returned null');
                reply.code(400).send({ success: false, error: 'No file uploaded' });
                return;
            }
            // Normalize to buffer, filename and mimetype
            let buffer = null;
            let filename = 'upload';
            let mimetype = 'application/octet-stream';
            if (uploadedStreamFile) {
                buffer = await uploadedStreamFile.toBuffer();
                filename = uploadedStreamFile.filename;
                mimetype = uploadedStreamFile.mimetype;
            }
            else if (fileObj) {
                try {
                    if (typeof fileObj.toBuffer === 'function') {
                        buffer = await fileObj.toBuffer();
                    }
                    else if (Buffer.isBuffer(fileObj)) {
                        buffer = fileObj;
                    }
                    else if (fileObj._buf && Buffer.isBuffer(fileObj._buf)) {
                        buffer = fileObj._buf;
                    }
                    else if (fileObj.buffer && Buffer.isBuffer(fileObj.buffer)) {
                        buffer = fileObj.buffer;
                    }
                    else {
                        console.error('Unsupported file object type in request.body', Object.keys(fileObj || {}));
                        return reply.code(400).send({ success: false, error: 'No file uploaded' });
                    }
                }
                catch (e) {
                    console.error('Failed to read file buffer from request.body', e);
                    return reply.code(500).send({ success: false, error: 'Failed to read uploaded file content' });
                }
                filename = fileObj.filename || fileObj.name || filename;
                mimetype = fileObj.mimetype || fileObj.type || mimetype;
            }
            if (!buffer) {
                return reply.code(400).send({ success: false, error: 'Failed to read uploaded file content' });
            }
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
            let mediaUrl;
            let thumbnailUrl;
            if (mimetype.startsWith('image/')) {
                mediaUrl = await this.mediaService.uploadImage(buffer, filename, mimetype);
            }
            else if (mimetype.startsWith('video/')) {
                const query = request.query;
                const asyncMode = query?.async === 'true' ||
                    query?.async === '1' ||
                    request.headers['x-video-processing'] === 'async';
                if (asyncMode) {
                    const ownerId = request.headers['x-user-id'] ||
                        query?.owner_id ||
                        'ads';
                    const campaignId = query?.campaign_id || query?.campaignId || null;
                    const priority = query?.priority ? Number(query.priority) : Number(process.env.ADS_VIDEO_JOB_PRIORITY || 1);
                    const raw = await this.mediaService.uploadRawVideo(buffer, filename, mimetype, ownerId);
                    const job = await (0, videoProcessing_queue_1.addAdsVideoProcessingJob)({
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
                    }, Number.isFinite(priority) ? priority : 1);
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
            }
            else {
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
        }
        catch (error) {
            console.error('Upload error:', error);
            const msg = error.message || '';
            if (msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('ffmpeg')) {
                reply.code(504).send({ success: false, error: 'Video processing timed out. Try increasing FFMPEG_TIMEOUT_MS or processing asynchronously.' });
            }
            else {
                reply.code(500).send({ success: false, error: msg });
            }
        }
    }
    async getUploadJob(request, reply) {
        const job = await (0, videoProcessing_queue_1.getVideoProcessingJobStatus)(request.params.id);
        if (!job) {
            reply.code(404).send({ success: false, error: 'Upload job not found' });
            return;
        }
        reply.send({ success: true, data: job });
    }
    async deleteMedia(request, reply) {
        try {
            const { mediaUrl } = request.body;
            await this.mediaService.deleteMedia(mediaUrl);
            reply.send({ success: true, message: 'Media deleted' });
        }
        catch (error) {
            reply.code(500).send({ success: false, error: error.message });
        }
    }
}
exports.MediaController = MediaController;
//# sourceMappingURL=media.controller.js.map