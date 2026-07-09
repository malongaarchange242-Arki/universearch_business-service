import { FastifyRequest, FastifyReply } from 'fastify';
import { MediaService } from './media.service';
export declare class MediaController {
    private mediaService;
    constructor(mediaService: MediaService);
    uploadMedia(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
    getUploadJob(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    deleteMedia(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=media.controller.d.ts.map