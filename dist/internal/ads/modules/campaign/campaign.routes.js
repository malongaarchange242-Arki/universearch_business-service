"use strict";
// src/modules/campaign/campaign.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignRoutes = campaignRoutes;
const campaign_controller_1 = require("./campaign.controller");
const campaign_service_1 = require("./campaign.service");
async function campaignRoutes(app) {
    const campaignService = new campaign_service_1.CampaignService(app.supabase);
    const campaignController = new campaign_controller_1.CampaignController(campaignService);
    // POST /ads/campaign
    app.post('/campaign', campaignController.createCampaign.bind(campaignController));
    // GET /ads/campaigns
    app.get('/campaigns', campaignController.getCampaigns.bind(campaignController));
    // GET /ads/campaign/:id
    app.get('/campaign/:id', campaignController.getCampaign.bind(campaignController));
    // PATCH /ads/campaign/:id
    app.patch('/campaign/:id', campaignController.updateCampaign.bind(campaignController));
    // DELETE /ads/campaign/:id
    app.delete('/campaign/:id', campaignController.deleteCampaign.bind(campaignController));
    // POST /ads/campaign/:id/send-notifications (manual notification trigger)
    app.post('/campaign/:id/send-notifications', campaignController.sendCampaignNotifications.bind(campaignController));
}
//# sourceMappingURL=campaign.routes.js.map