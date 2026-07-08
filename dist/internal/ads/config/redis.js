"use strict";
// src/config/redis.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = void 0;
const redis_1 = require("redis");
const createRedisClient = () => {
    if (!process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
        console.log('🚫 Redis disabled');
        return null;
    }
    const client = (0, redis_1.createClient)({
        url: process.env.REDIS_URL,
    });
    client.on('error', () => { });
    return client;
};
exports.createRedisClient = createRedisClient;
//# sourceMappingURL=redis.js.map