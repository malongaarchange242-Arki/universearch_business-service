// src/config/redis.ts

import { createClient } from 'redis';

export const createRedisClient = () => {
  if (!process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
    console.log('🚫 Redis disabled');
    return null;
  }

  const client = createClient({
    url: process.env.REDIS_URL,
  });

  client.on('error', () => {});

  return client;
};