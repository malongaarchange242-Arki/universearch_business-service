// src/modules/campaign/campaign.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CampaignService, Campaign } from './campaign.service';

const ageFieldSchema = z.number().int().nonnegative().optional();

const baseCampaignSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  media_url: z.string().url(),
  media_type: z.enum(['image', 'video']),
  destination: z.enum(['carousel', 'shorts']),
  target_gender: z.string().optional(),
  target_user_type: z.string().optional(),
  target_users: z.array(z.string()).optional(),
  carousel_slot: z.number().int().min(1).optional(),
  click_url: z.string().url().optional(),
  contacts: z.string().optional(),
  lien: z.string().url().optional(),
  min_age: ageFieldSchema,
  max_age: ageFieldSchema,
  target_age: ageFieldSchema,
  age_tolerance: ageFieldSchema,
  location: z.string().optional(),
  quartier: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  send_notifications: z.boolean().optional(),
  notification_message: z.string().optional(),
});

function validateAgeTargeting(
  data: Partial<z.infer<typeof baseCampaignSchema>>,
  ctx: z.RefinementCtx
) {
  const hasMinAge = typeof data.min_age === 'number';
  const hasMaxAge = typeof data.max_age === 'number';
  const hasTargetAge = typeof data.target_age === 'number';
  const hasAgeTolerance = typeof data.age_tolerance === 'number';
  const usesRangeTargeting = hasMinAge || hasMaxAge;
  const usesTargetAgeTargeting = hasTargetAge || hasAgeTolerance;

  if (hasMinAge && hasMaxAge && data.max_age! < data.min_age!) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['max_age'],
      message: 'max_age must be greater than or equal to min_age',
    });
  }

  if (hasTargetAge !== hasAgeTolerance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasTargetAge ? ['age_tolerance'] : ['target_age'],
      message: 'target_age and age_tolerance must be provided together',
    });
  }

  if (usesRangeTargeting && usesTargetAgeTargeting) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['target_age'],
      message: 'Use either min/max age targeting or target_age with age_tolerance, not both',
    });
  }
}

const campaignSchema = baseCampaignSchema.superRefine((data, ctx) => {
  validateAgeTargeting(data, ctx);
  if (data.destination !== 'carousel' && data.carousel_slot !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['carousel_slot'],
      message: 'carousel_slot is only allowed for carousel destination',
    });
  }
});

const campaignUpdateSchema = baseCampaignSchema.partial().superRefine((data, ctx) => {
  validateAgeTargeting(data, ctx);
  if (data.destination === 'carousel' && data.carousel_slot === undefined && 'destination' in data) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['carousel_slot'],
      message: 'carousel_slot is required when destination is changed to carousel',
    });
  }
  if (data.destination !== undefined && data.destination !== 'carousel' && data.carousel_slot !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['carousel_slot'],
      message: 'carousel_slot cannot be specified for non-carousel destinations',
    });
  }
});

type CampaignInput = z.infer<typeof campaignSchema>;
type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;

export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  async createCampaign(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parsed = campaignSchema.parse(request.body);
      const result = await this.campaignService.createCampaign(parsed as Omit<Campaign, 'id' | 'created_at'>);
      reply.code(201).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Invalid campaign payload',
          details: error.issues,
        });
        return;
      }
      reply.code(400).send({ success: false, error: (error as Error).message });
    }
  }

  async getCampaigns(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit, offset } = request.query as { limit?: string; offset?: string };
      const limitNum = Math.min(parseInt(limit || '50'), 100); // Max 100
      const offsetNum = parseInt(offset || '0');

      const result = await this.campaignService.getCampaigns(limitNum, offsetNum);
      reply.send({
        success: true,
        data: result.campaigns,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: result.total,
        },
      });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  }

  async getCampaign(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const campaign = await this.campaignService.getCampaignById(id);
      if (!campaign) {
        reply.code(404).send({ success: false, error: 'Campaign not found' });
        return;
      }
      reply.send({ success: true, data: campaign });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  }

  async updateCampaign(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const updates = campaignUpdateSchema.parse(request.body) as CampaignUpdateInput;
      const result = await this.campaignService.updateCampaign(id, updates);
      reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Invalid campaign payload',
          details: error.issues,
        });
        return;
      }
      reply.code(400).send({ success: false, error: (error as Error).message });
    }
  }

  async deleteCampaign(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      await this.campaignService.deleteCampaign(id);
      reply.send({ success: true, message: 'Campaign deleted' });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  }

  async sendCampaignNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const result = await this.campaignService.sendCampaignNotifications(id);
      reply.send({ success: true, data: result });
    } catch (error) {
      reply.code(400).send({ success: false, error: (error as Error).message });
    }
  }

  async getAvailableQuartiers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { data, error } = await this.campaignService.getSupabase()
        .from('profiles')
        .select('quartier')
        .not('quartier', 'is', null)
        .neq('quartier', '');

      if (error) {
        throw error;
      }

      const quartiers = Array.from(
        new Set(
          (data || [])
            .map((row: any) => String(row?.quartier || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      reply.send({ success: true, data: quartiers });
    } catch (error) {
      reply.code(500).send({ success: false, error: (error as Error).message });
    }
  }
}
