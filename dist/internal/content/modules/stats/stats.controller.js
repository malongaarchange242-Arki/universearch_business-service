"use strict";
// src/modules/stats/stats.controller.ts
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
exports.getOrganizationTopFollowers = exports.getOrganizationViewsTotal = void 0;
const StatsService = __importStar(require("./stats.service"));
const authenticate_1 = require("../../middleware/authenticate");
const normalizeOrganizationType = (rawValue) => {
    const normalized = String(rawValue || '').trim().toLowerCase();
    if (!normalized)
        return null;
    if (normalized.includes('univers'))
        return 'universite';
    if (normalized.includes('centre'))
        return 'centre_formation';
    return null;
};
const getOrganizationViewsTotal = async (request, reply) => {
    try {
        const supabase = request.server.supabaseAdmin;
        const queryOrgId = String(request.query.organization_id || '').trim();
        const queryOrgType = normalizeOrganizationType(request.query.organization_type);
        let organizationId = queryOrgId;
        let organizationType = queryOrgType;
        if (!organizationId || !organizationType) {
            const viewer = await (0, authenticate_1.resolveAuthenticatedUser)(request);
            if (!viewer) {
                return reply.status(400).send({
                    success: false,
                    error: 'Missing organization_id/organization_type query parameters or Authorization header',
                });
            }
            organizationId = organizationId || viewer.id;
            organizationType =
                organizationType || normalizeOrganizationType(viewer.role) || null;
        }
        if (!organizationId || !organizationType) {
            return reply.status(400).send({
                success: false,
                error: 'Unable to resolve organization context',
            });
        }
        const stats = await StatsService.getOrganizationViewsTotal(supabase, organizationId, organizationType);
        reply.send({
            success: true,
            data: stats,
            total_views: stats.total_views,
            total_posts: stats.total_posts,
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
exports.getOrganizationViewsTotal = getOrganizationViewsTotal;
const getOrganizationTopFollowers = async (request, reply) => {
    try {
        const supabase = request.server.supabaseAdmin;
        const queryOrgId = String(request.query.organization_id || '').trim();
        const queryOrgType = normalizeOrganizationType(request.query.organization_type);
        request.log.info({
            event: 'TopFollowersRequest',
            queryOrgId,
            queryOrgType,
        });
        let organizationId = queryOrgId;
        let organizationType = queryOrgType;
        if (!organizationId || !organizationType) {
            const viewer = await (0, authenticate_1.resolveAuthenticatedUser)(request);
            if (!viewer) {
                return reply.status(400).send({
                    success: false,
                    error: 'Missing organization_id/organization_type query parameters or Authorization header',
                });
            }
            organizationId = organizationId || viewer.id;
            organizationType =
                organizationType || normalizeOrganizationType(viewer.role) || null;
        }
        if (!organizationId || !organizationType) {
            return reply.status(400).send({
                success: false,
                error: 'Unable to resolve organization context',
            });
        }
        const followers = await StatsService.getOrganizationTopFollowers(supabase, organizationId, organizationType);
        request.log.info({
            event: 'TopFollowersResult',
            organizationId,
            organizationType,
            count: followers.length,
        });
        reply.send({
            success: true,
            data: followers,
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
exports.getOrganizationTopFollowers = getOrganizationTopFollowers;
//# sourceMappingURL=stats.controller.js.map