import { FastifyReply, FastifyRequest } from 'fastify';
export declare class QueueController {
    getQueueMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    retryJob(request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    retryAllFailedJobs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=queue.controller.d.ts.map