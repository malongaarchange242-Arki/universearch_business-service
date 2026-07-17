import './internal/shared/types/fastify';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import supabasePlugin from './internal/shared/plugins/supabase';
import authPlugin from './internal/shared/plugins/auth';
import { registerBusinessRoutes } from './routes';

export const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 50 * 1024 * 1024,
  requestTimeout: 30000,
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.header('Access-Control-Allow-Origin', 'https://universearch-frontend.onrender.com');
  reply.header('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Range, X-Requested-With, x-user-id, x-video-processing');
  reply.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  reply.status(error.statusCode ?? 500).send({
    success: false,
    error: error.message ?? 'Internal Server Error',
  });
});

export const initializeApp = async () => {
  await app.register(cors, {
    origin: [
      'https://universearch-frontend.onrender.com',
      'https://universearch.com',
      'https://www.universearch.com',
    ],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Range',
      'X-Requested-With',
      'x-user-id',
      'x-video-processing',
    ],
    exposedHeaders: ['Content-Length', 'Content-Range'],
    credentials: true,
  });

  await app.register(multipart as any, {
    attachFieldsToBody: true,
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  await app.register(supabasePlugin as any);
  await app.register(authPlugin as any);

  app.head('/health', async () => ({ status: 'ok' }));

  app.get('/health', async () => ({
    status: 'ok',
    service: 'business-service',
    timestamp: new Date().toISOString(),
  }));

  app.post('/health', async () => ({
    status: 'ok',
    service: 'business-service',
    timestamp: new Date().toISOString(),
  }));

  app.route({
    method: ['GET', 'POST'],
    url: '/health/db',
    handler: async () => {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error('Missing Supabase credentials');
        }

        const response = await Promise.race([
          fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
            method: 'GET',
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              Accept: 'application/json',
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Database timeout')), 5000)
          ),
        ]);

        if (!response.ok && response.status !== 404) {
          throw new Error(`Supabase REST returned ${response.status}`);
        }

        return { database: 'connected' };
      } catch (error) {
        app.log.warn({ err: error }, 'Health DB check failed');
        return { database: 'error' };
      }
    },
  });

  await app.register(async (fastify) => {
    await registerBusinessRoutes(fastify);
  });
};
