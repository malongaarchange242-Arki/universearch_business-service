import { FastifyRequest, FastifyReply } from 'fastify';
import { CampaignService } from './campaign.service';
export declare class CampaignController {
    private campaignService;
    constructor(campaignService: CampaignService);
    createCampaign(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCampaigns(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCampaign(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    updateCampaign(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    deleteCampaign(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    sendCampaignNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=campaign.controller.d.ts.map