import { SupabaseClient } from '@supabase/supabase-js';
export interface UploadedVideoMedia {
    mediaUrl: string;
    thumbnailUrl: string;
}
export interface RawVideoMedia {
    rawUrl: string;
    bucket: string;
    path: string;
}
export declare class MediaService {
    private supabase;
    constructor(supabase: SupabaseClient);
    private validateFileType;
    private generateSafeFilename;
    uploadImage(file: Buffer, filename: string, mimetype: string): Promise<string>;
    uploadVideo(file: Buffer, filename: string, mimetype: string): Promise<UploadedVideoMedia>;
    uploadRawVideo(file: Buffer, filename: string, mimetype: string, ownerId?: string): Promise<RawVideoMedia>;
    private normalizeVideo;
    private generateThumbnailBuffer;
    deleteMedia(mediaUrl: string): Promise<void>;
    private cleanupFiles;
}
//# sourceMappingURL=media.service.d.ts.map