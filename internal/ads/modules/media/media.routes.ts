// src/modules/media/media.routes.ts

import { FastifyInstance } from 'fastify';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { uploadRateLimit } from '../../middleware/uploadRateLimit';

export async function mediaRoutes(app: FastifyInstance) {
  const mediaService = new MediaService(app.supabase);
  const mediaController = new MediaController(mediaService);

  // POST /ads/media/upload
  app.post('/upload', { preHandler: [uploadRateLimit] }, mediaController.uploadMedia.bind(mediaController));

  // GET /ads/media/jobs/:id
  app.get('/jobs/:id', mediaController.getUploadJob.bind(mediaController));

  // DELETE /ads/media/:id
  app.delete('/:id', mediaController.deleteMedia.bind(mediaController));
}
