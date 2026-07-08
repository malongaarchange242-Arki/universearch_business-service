import { SupabaseClient } from '@supabase/supabase-js';
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
export declare class MediaService {
    private supabase;
    constructor(supabase: SupabaseClient);
    normalizeVideo(inputBuffer: Buffer, originalFilename: string): Promise<Buffer>;
    generateThumbnailBuffer(inputBuffer: Buffer): Promise<Buffer>;
    uploadNormalizedVideo(buffer: Buffer): Promise<string>;
    uploadRawVideo(inputBuffer: Buffer, originalFilename: string, ownerId?: string, mimetype?: string, bucket?: string, rawPrefix?: string): Promise<RawVideoMedia>;
    processAndUploadVideo(inputBuffer: Buffer, originalFilename: string, ownerId?: string, bucket?: string, outputPrefix?: string, thumbnailPrefix?: string): Promise<ProcessedVideoMedia>;
    processStoredVideo(rawPath: string, originalFilename: string, ownerId?: string, rawBucket?: string, outputBucket?: string, outputPrefix?: string, thumbnailPrefix?: string): Promise<ProcessedVideoMedia>;
    deleteRawVideo(rawPath: string, bucket?: string): Promise<void>;
    private cleanupFiles;
    private safePathSegment;
}
//# sourceMappingURL=media.service.d.ts.map