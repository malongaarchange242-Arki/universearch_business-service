// src/modules/delivery/delivery.routes.ts

import { FastifyInstance } from 'fastify';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

export async function deliveryRoutes(app: FastifyInstance) {
  const deliveryService = new DeliveryService(app.supabase);
  const deliveryController = new DeliveryController(deliveryService);

  // GET /ads/carousel
  app.get('/carousel', deliveryController.getCarousel.bind(deliveryController));

  // GET /ads/shorts
  app.get('/shorts', deliveryController.getShorts.bind(deliveryController));
}