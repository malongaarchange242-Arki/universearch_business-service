"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueController = void 0;
const videoProcessing_queue_1 = require("../../config/videoProcessing.queue");
class QueueController {
    async getQueueMetrics(request, reply) {
        request.log.info({ endpoint: request.url, action: 'queue-metrics' }, 'Internal queue metrics requested');
        const metrics = await (0, videoProcessing_queue_1.getVideoProcessingQueueMetrics)();
        reply.send({ success: true, data: metrics });
    }
    async retryJob(request, reply) {
        request.log.info({ endpoint: request.url, jobId: request.params.id }, 'Internal retry job requested');
        const result = await (0, videoProcessing_queue_1.retryVideoProcessingJob)(request.params.id);
        if (!result) {
            reply.code(404).send({ success: false, error: 'Job not found' });
            return;
        }
        reply.send({ success: true, data: result });
    }
    async retryAllFailedJobs(request, reply) {
        request.log.info({ endpoint: request.url }, 'Internal retry all failed jobs requested');
        const report = await (0, videoProcessing_queue_1.retryAllFailedVideoProcessingJobs)(Number(process.env.VIDEO_QUEUE_RETRY_ALL_LIMIT || 50));
        reply.send({ success: true, data: report });
    }
}
exports.QueueController = QueueController;
//# sourceMappingURL=queue.controller.js.map