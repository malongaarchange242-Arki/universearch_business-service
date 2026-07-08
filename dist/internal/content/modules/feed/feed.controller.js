"use strict";
// src/modules/feed/feed.controller.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationFeed = exports.getCentresFeed = exports.getUniversitesFeed = exports.getFeed = void 0;
const FeedService = __importStar(require("./feed.service"));
/**
 * Récupérer le feed complet
 */
const getFeed = async (request, reply) => {
    try {
        const supabase = request.server.supabaseAdmin;
        const page = request.query.page || 1;
        const limit = request.query.limit || 10;
        const result = await FeedService.getFeed(supabase, page, limit);
        reply.send({
            success: true,
            ...result,
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(500).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getFeed = getFeed;
/**
 * Récupérer le feed des universités
 */
const getUniversitesFeed = async (request, reply) => {
    try {
        const supabase = request.server.supabaseAdmin;
        const page = request.query.page || 1;
        const limit = request.query.limit || 10;
        const result = await FeedService.getUniversitesFeed(supabase, page, limit);
        reply.send({
            success: true,
            ...result,
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(500).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getUniversitesFeed = getUniversitesFeed;
/**
 * Récupérer le feed des centres
 */
const getCentresFeed = async (request, reply) => {
    try {
        const supabase = request.server.supabaseAdmin;
        const page = request.query.page || 1;
        const limit = request.query.limit || 10;
        const result = await FeedService.getCentresFeed(supabase, page, limit);
        reply.send({
            success: true,
            ...result,
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(500).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getCentresFeed = getCentresFeed;
/**
 * Récupérer le feed d'une organisation spécifique
 */
const getOrganizationFeed = async (request, reply) => {
    const startTime = Date.now();
    const beforeMemory = process.memoryUsage();
    try {
        const supabase = request.server.supabaseAdmin;
        const organizationId = String(request.query.organization_id || '').trim();
        const organizationTypeParam = String(request.query.organization_type || '').trim().toLowerCase();
        const page = request.query.page || 1;
        const limit = request.query.limit || 10;
        if (!organizationId || !organizationTypeParam) {
            request.log.warn({
                msg: 'Missing query params for organization feed',
                organizationId,
                organizationType: organizationTypeParam,
            });
            return reply.status(400).send({
                success: false,
                error: 'Missing required query parameters: organization_id, organization_type',
            });
        }
        const organizationType = organizationTypeParam === 'centre' || organizationTypeParam === 'centre_formation'
            ? 'centre_formation'
            : 'universite';
        const result = await FeedService.getOrganizationFeed(supabase, organizationId, organizationType, page, limit);
        const afterMemory = process.memoryUsage();
        const durationMs = Date.now() - startTime;
        request.log.info({
            msg: 'Organization feed fetched',
            organizationId,
            organizationType,
            page,
            limit,
            durationMs,
            memory: {
                rssBeforeMB: Math.round(beforeMemory.rss / 1024 / 1024),
                rssAfterMB: Math.round(afterMemory.rss / 1024 / 1024),
                heapUsedBeforeMB: Math.round(beforeMemory.heapUsed / 1024 / 1024),
                heapUsedAfterMB: Math.round(afterMemory.heapUsed / 1024 / 1024),
            },
            resultCount: result.data.length,
            total: result.pagination.total,
        });
        reply.send({
            success: true,
            ...result,
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(500).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getOrganizationFeed = getOrganizationFeed;
//# sourceMappingURL=feed.controller.js.map