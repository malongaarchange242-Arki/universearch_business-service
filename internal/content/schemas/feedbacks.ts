// src/schemas/feedbacks.ts
import { z } from 'zod';

export const createFeedbackSchema = z.object({
  type: z.enum(['bug', 'suggestion', 'review']),
  rating: z.number().int().min(1).max(5),
  message: z.string().min(1),
  page: z.enum(['feed', 'universite', 'quiz', 'messages']),
  metadata: z.object({}).catchall(z.unknown()).optional(),
});

export const getFeedbacksQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  offset: z.coerce.number().optional().default(0),
  type: z.enum(['bug', 'suggestion', 'review']).optional(),
  status: z.enum(['pending', 'reviewed', 'resolved']).optional(),
  page: z.enum(['feed', 'universite', 'quiz', 'messages']).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type GetFeedbacksQuery = z.infer<typeof getFeedbacksQuerySchema>;