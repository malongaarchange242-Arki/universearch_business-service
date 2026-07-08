import { FastifyReply, FastifyRequest } from 'fastify';
import { sendTrackingBatch } from './tracking.service';

export const proxyTrackingBatch = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await sendTrackingBatch(request.body as any);
    return reply.code(202).send(result);
  } catch (error: any) {
    request.log.error(error, 'Tracking proxy failed');
    return reply.status(502).send({
      success: false,
      error: 'Failed to forward tracking batch',
      details: error.message,
    });
  }
};
