import { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    recordImpression(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    recordClick(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    recordView(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getViews(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    recordLike(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    removeLike(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getLikes(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    postComment(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getComments(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=analytics.controller.d.ts.map