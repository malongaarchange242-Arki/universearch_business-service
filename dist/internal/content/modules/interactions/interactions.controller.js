"use strict";
// src/modules/interactions/interactions.controller.ts
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
exports.getViews = exports.recordView = exports.getComments = exports.commentPost = exports.unlikePost = exports.likePost = exports.getLikeStatus = void 0;
const InteractionsService = __importStar(require("./interactions.service"));
const authenticate_1 = require("../../middleware/authenticate");
const getLikeStatus = async (request, reply) => {
    try {
        const user = request.user;
        const supabase = request.server.supabaseAdmin;
        const liked = await InteractionsService.isPostLikedByUser(supabase, request.params.id, user.id);
        reply.send({
            success: true,
            data: {
                post_id: request.params.id,
                liked,
            },
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(400).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getLikeStatus = getLikeStatus;
/**
 * Aimer un post
 */
const likePost = async (request, reply) => {
    try {
        const user = request.user;
        // 🔥 Use service role client to bypass RLS (backend is trusted)
        const supabase = request.server.supabaseAdmin;
        const like = await InteractionsService.likePost(supabase, request.params.id, user.id);
        reply.status(201).send({
            success: true,
            data: like,
        });
    }
    catch (error) {
        request.log.error(error);
        const statusCode = error.message.includes('already') ? 400 : 404;
        reply.status(statusCode).send({
            success: false,
            error: error.message,
        });
    }
};
exports.likePost = likePost;
/**
 * Retirer un like
 */
const unlikePost = async (request, reply) => {
    try {
        const user = request.user;
        // 🔥 Use service role client to bypass RLS (backend is trusted)
        const supabase = request.server.supabaseAdmin;
        await InteractionsService.unlikePost(supabase, request.params.id, user.id);
        reply.send({
            success: true,
            message: 'Like removed',
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(400).send({
            success: false,
            error: error.message,
        });
    }
};
exports.unlikePost = unlikePost;
/**
 * Commenter un post
 */
const commentPost = async (request, reply) => {
    try {
        const user = request.user;
        // 🔥 Use service role client to bypass RLS (backend is trusted)
        const supabase = request.server.supabaseAdmin;
        const comment = await InteractionsService.commentPost(supabase, request.params.id, user.id, request.body);
        reply.status(201).send({
            success: true,
            data: comment,
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(400).send({
            success: false,
            error: error.message,
        });
    }
};
exports.commentPost = commentPost;
/**
 * Récupérer les commentaires
 */
const getComments = async (request, reply) => {
    try {
        const supabase = request.server.supabase;
        const page = request.query.page || 1;
        const limit = request.query.limit || 20;
        const result = await InteractionsService.getComments(supabase, request.params.id, page, limit);
        reply.send({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(400).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getComments = getComments;
/**
 * Enregistrer une vue
 */
const recordView = async (request, reply) => {
    try {
        const viewer = await (0, authenticate_1.resolveAuthenticatedUser)(request);
        const supabase = request.server.supabaseAdmin;
        const view = await InteractionsService.recordPostView(supabase, request.params.id, viewer?.id || null, request.body || {});
        const latestViews = await InteractionsService.getPostViews(supabase, request.params.id, 1, 1);
        reply.status(201).send({
            success: true,
            data: view,
            views_count: latestViews.total,
        });
    }
    catch (error) {
        request.log.error(error);
        const statusCode = error.message.includes('Post not found') ? 404 : 400;
        reply.status(statusCode).send({
            success: false,
            error: error.message,
        });
    }
};
exports.recordView = recordView;
/**
 * Récupérer les vues d'un post
 */
const getViews = async (request, reply) => {
    try {
        const supabase = request.server.supabaseAdmin;
        const page = request.query.page || 1;
        const limit = request.query.limit || 20;
        const result = await InteractionsService.getPostViews(supabase, request.params.id, page, limit);
        reply.send({
            success: true,
            data: result.data,
            views_count: result.total,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
        });
    }
    catch (error) {
        request.log.error(error);
        reply.status(400).send({
            success: false,
            error: error.message,
        });
    }
};
exports.getViews = getViews;
//# sourceMappingURL=interactions.controller.js.map