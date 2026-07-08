import { FastifyReply, FastifyRequest } from 'fastify';
import {
  getVideoProcessingQueueMetrics,
  retryAllFailedVideoProcessingJobs,
  retryVideoProcessingJob,
} from '../../config/videoProcessing.queue';

export class QueueController {
  async getQueueMetrics(request: FastifyRequest, reply: FastifyReply) {
    request.log.info({ endpoint: request.url, action: 'queue-metrics' }, 'Internal queue metrics requested');
    const metrics = await getVideoProcessingQueueMetrics();
    reply.send({ success: true, data: metrics });
  }

  async retryJob(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    request.log.info({ endpoint: request.url, jobId: request.params.id }, 'Internal retry job requested');
    const result = await retryVideoProcessingJob(request.params.id);

    if (!result) {
      reply.code(404).send({ success: false, error: 'Job not found' });
      return;
    }

    reply.send({ success: true, data: result });
  }

  async retryAllFailedJobs(request: FastifyRequest, reply: FastifyReply) {
    request.log.info({ endpoint: request.url }, 'Internal retry all failed jobs requested');
    const report = await retryAllFailedVideoProcessingJobs(Number(process.env.VIDEO_QUEUE_RETRY_ALL_LIMIT || 50));
    reply.send({ success: true, data: report });
  }
}
