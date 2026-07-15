// src/modules/campaign/campaign.routes.ts

import { FastifyInstance } from 'fastify';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

export async function campaignRoutes(app: FastifyInstance) {
  const campaignService = new CampaignService(app.supabase);
  const campaignController = new CampaignController(campaignService);

  // POST /ads/campaign
  app.post('/campaign', campaignController.createCampaign.bind(campaignController));

  // GET /ads/campaigns
  app.get('/campaigns', campaignController.getCampaigns.bind(campaignController));

  // GET /ads/campaign/:id
  app.get('/campaign/:id', campaignController.getCampaign.bind(campaignController));

  // GET /ads/quartiers
  app.get('/quartiers', campaignController.getAvailableQuartiers.bind(campaignController));

  // PATCH /ads/campaign/:id
  app.patch('/campaign/:id', campaignController.updateCampaign.bind(campaignController));

  // DELETE /ads/campaign/:id
  app.delete('/campaign/:id', campaignController.deleteCampaign.bind(campaignController));

  // POST /ads/campaign/:id/send-notifications (manual notification trigger)
  app.post('/campaign/:id/send-notifications', campaignController.sendCampaignNotifications.bind(campaignController));
}