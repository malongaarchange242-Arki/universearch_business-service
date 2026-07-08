"use strict";
// src/modules/activities/activities.controller.ts
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
exports.deleteActivity = exports.updateActivity = exports.getActivity = exports.listActivities = exports.createActivity = void 0;
const ActivitiesService = __importStar(require("./activities.service"));
const authenticate_1 = require("../../middleware/authenticate");
const getSupabase = (request) => request.server.supabaseAdmin;
const normalizeOrganizationType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized)
        return null;
    if (normalized.includes('univers'))
        return 'universite';
    if (normalized.includes('centre'))
        return 'centre_formation';
    return null;
};
const createActivity = async (request, reply) => {
    const user = request.user;
    if (!user) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
    const payload = request.body;
    const activity = await ActivitiesService.createActivity(getSupabase(request), payload, user.id);
    reply.code(201).send({ success: true, data: activity });
};
exports.createActivity = createActivity;
const listActivities = async (request, reply) => {
    const user = request.user ?? (await (0, authenticate_1.resolveAuthenticatedUser)(request));
    const currentUserId = user?.id ?? null;
    const organizationId = String(request.query.organization_id || '').trim() || null;
    const organizationType = normalizeOrganizationType(request.query.organization_type);
    const activities = await ActivitiesService.listActivities(getSupabase(request), {
        currentUserId,
        organizationId,
        organizationType,
    });
    reply.send({ success: true, data: activities });
};
exports.listActivities = listActivities;
const getActivity = async (request, reply) => {
    const { id } = request.params;
    const currentUserId = request.user?.id ?? null;
    const activity = await ActivitiesService.getActivity(getSupabase(request), id);
    if (!activity) {
        return reply.status(404).send({ success: false, error: 'Activity not found' });
    }
    if (!activity.is_public && activity.created_by_id !== currentUserId) {
        return reply.status(403).send({ success: false, error: 'Forbidden' });
    }
    reply.send({ success: true, data: activity });
};
exports.getActivity = getActivity;
const updateActivity = async (request, reply) => {
    const user = request.user;
    if (!user) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
    const { id } = request.params;
    const payload = request.body;
    const activity = await ActivitiesService.updateActivity(getSupabase(request), id, payload, user.id);
    reply.send({ success: true, data: activity });
};
exports.updateActivity = updateActivity;
const deleteActivity = async (request, reply) => {
    const user = request.user;
    if (!user) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
    const { id } = request.params;
    await ActivitiesService.deleteActivity(getSupabase(request), id, user.id);
    reply.send({ success: true, message: 'Activity deleted' });
};
exports.deleteActivity = deleteActivity;
//# sourceMappingURL=activities.controller.js.map