// src/routes/feedbacks.ts
import { FastifyPluginAsync } from 'fastify';
import { createFeedbackSchema, getFeedbacksQuerySchema, CreateFeedbackInput, GetFeedbacksQuery } from '../schemas/feedbacks';

const feedbacksRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /feedbacks - Créer un feedback
  fastify.post('/feedbacks', {
    preHandler: fastify.authMiddleware,
  }, async (request, reply) => {
    const parsedBody = createFeedbackSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ success: false, error: 'Invalid feedback payload', details: parsedBody.error.issues });
    }

    const { type, rating, message, page, metadata } = parsedBody.data;
    const userId = request.userId;

    try {
      // Verify user exists before inserting feedback
      const { data: userExists, error: userError } = await fastify.supabaseAdmin
        .from('utilisateurs')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !userExists) {
        fastify.log.warn({ userId, error: userError }, 'User not found for feedback');
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      const { data, error } = await fastify.supabaseAdmin
        .from('feedbacks')
        .insert({
          user_id: userId,
          type,
          rating,
          message,
          page,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Erreur lors de la création du feedback' });
    }
  });

  // GET /feedbacks - Récupérer les feedbacks (admin)
  fastify.get('/feedbacks', {}, async (request, reply) => {
    const parsedQuery = getFeedbacksQuerySchema.safeParse(request.query as any);
    if (!parsedQuery.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters', details: parsedQuery.error.issues });
    }

    const { limit, offset, type, status, page } = parsedQuery.data;

    try {
      let query = fastify.supabaseAdmin
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) query = query.eq('type', type);
      if (status) query = query.eq('status', status);
      if (page) query = query.eq('page', page);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, error: 'Erreur lors de la récupération des feedbacks' });
    }
  });
};

export default feedbacksRoutes;