"use strict";
// src/modules/interactions/interactions.service.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostViews = exports.recordPostView = exports.getComments = exports.commentPost = exports.unlikePost = exports.likePost = exports.isPostLikedByUser = exports.getViewCooldownMs = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const PostsService = __importStar(require("../posts/posts.service"));
const DEFAULT_NOTIFICATION_SERVICE_URL = 'https://api.universearch.com';
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL;
const parsedPostViewCooldownMs = Number(process.env.POST_VIEW_COOLDOWN_MS);
const parsedProfileViewCooldownMs = Number(process.env.PROFILE_VIEW_COOLDOWN_MS);
const parsedAdViewCooldownMs = Number(process.env.AD_VIEW_COOLDOWN_MS);
const POST_VIEW_COOLDOWN_MS = Number.isFinite(parsedPostViewCooldownMs) && parsedPostViewCooldownMs > 0
    ? parsedPostViewCooldownMs
    : 60000;
const PROFILE_VIEW_COOLDOWN_MS = Number.isFinite(parsedProfileViewCooldownMs) && parsedProfileViewCooldownMs > 0
    ? parsedProfileViewCooldownMs
    : 60000;
const AD_VIEW_COOLDOWN_MS = Number.isFinite(parsedAdViewCooldownMs) && parsedAdViewCooldownMs > 0
    ? parsedAdViewCooldownMs
    : 60000;
const getViewCooldownMs = (type) => {
    switch (type) {
        case 'profile':
            return PROFILE_VIEW_COOLDOWN_MS;
        case 'ad':
            return AD_VIEW_COOLDOWN_MS;
        case 'post':
        default:
            return POST_VIEW_COOLDOWN_MS;
    }
};
exports.getViewCooldownMs = getViewCooldownMs;
const mapPostViewResponse = (row, fallbackDate, fallbackDuration) => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id ?? null,
    view_duration: row.view_duration ?? fallbackDuration ?? null,
    date_view: row.date_view ?? row.created_at ?? fallbackDate,
});
const getLatestPostView = async (supabase, postId, userId, fallbackDate, fallbackDuration) => {
    const initialResult = await supabase
        .from('post_views')
        .select('id, post_id, user_id, view_duration, date_view, created_at')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .order('date_view', { ascending: false })
        .limit(1);
    let data = initialResult.data?.[0] ?? null;
    let error = initialResult.error;
    if (error &&
        (error.message.includes('view_duration') || error.message.includes('date_view'))) {
        const fallback = await supabase
            .from('post_views')
            .select('id, post_id, user_id, created_at')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);
        data = fallback.data?.[0] ?? null;
        error = fallback.error;
    }
    if (error) {
        throw new Error(`Failed to fetch existing post view: ${error.message}`);
    }
    return data ? mapPostViewResponse(data, fallbackDate, fallbackDuration) : null;
};
const isWithinViewCooldown = (dateView, nowMs, cooldownMs) => {
    const viewedAtMs = Date.parse(dateView);
    if (!Number.isFinite(viewedAtMs))
        return false;
    return nowMs - viewedAtMs < cooldownMs;
};
const resolveViewerProfileId = async (supabase, userId) => {
    if (!userId) {
        return null;
    }
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
    if (error) {
        console.warn(`Failed to resolve viewer profile for post view, falling back to anonymous view: ${error.message}`);
        return null;
    }
    return data?.id || null;
};
const notifyPostOwner = async (recipientId, payload) => {
    if (!recipientId || recipientId === payload.actorId)
        return;
    await axios_1.default
        .post(`${notificationServiceUrl}/api/notifications`, {
        user_id: recipientId,
        type: payload.type,
        message: payload.body,
        delivery_types: ['in_app', 'push'],
        data: {
            title: payload.type === 'like' ? 'Nouveau like' : 'Nouveau commentaire',
            body: payload.body,
            type: payload.type,
            entity_id: payload.postId,
            post_id: payload.postId,
            actor_id: payload.actorId,
            post_title: payload.postTitle || '',
        },
    }, {
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .catch((error) => {
        const details = error?.response?.data ??
            error?.message ??
            error?.code ??
            error;
        console.error(`Failed to notify post owner for ${payload.type}:`, details);
    });
};
/**
 * 🔥 SYNC AUTOMATIQUE: Engagement → Tables PORA
 * Appelé après chaque like/comment/view pour alimenter engagements_universites/centres
 *
 * Fire-and-forget (async, pas d'await)
 */
const syncEngagementToPoraTable = async (supabase, postId, userId, engagementType) => {
    try {
        // 1️⃣ Récupérer le post
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('author_id, author_type')
            .eq('id', postId)
            .single();
        if (postError || !post) {
            console.warn(`[PORA Sync] Post ${postId} not found`);
            return;
        }
        const { author_id: authorId, author_type: authorType } = post;
        // 2️⃣ Déterminer la table PORA cible
        const tableName = authorType === 'universite'
            ? 'engagements_universites'
            : 'engagements_centres_formation';
        // 3️⃣ Insérer l'engagement PORA
        const { error: syncError } = await supabase
            .from(tableName)
            .insert({
            id: (0, crypto_1.randomUUID)(),
            [authorType === 'universite' ? 'universite_id' : 'centre_id']: authorId,
            type: engagementType,
            user_id: userId,
            post_id: postId,
            date: new Date().toISOString(),
        });
        if (syncError) {
            // ⚠️ Warn but don't crash - les tables PORA peuvent ne pas exister
            console.warn(`[PORA Sync] Failed to sync to ${tableName}: ${syncError.message}`);
        }
        else {
            console.log(`[PORA Sync] ✅ ${engagementType} synced to ${tableName} for ${authorId}`);
        }
    }
    catch (err) {
        // 🔴 Erreur fatale - log uniquement
        console.error('[PORA Sync] Unexpected error:', err instanceof Error ? err.message : err);
    }
};
const isPostLikedByUser = async (supabase, postId, userId) => {
    const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to fetch like status: ${error.message}`);
    }
    return !!data;
};
exports.isPostLikedByUser = isPostLikedByUser;
/**
 * Aimer un post
 */
const likePost = async (supabase, postId, userId) => {
    // Vérifier que le post existe
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, author_id, titre')
        .eq('id', postId)
        .single();
    if (postError || !post) {
        throw new Error('Post not found');
    }
    // Vérifier que l'utilisateur n'a pas déjà liké
    const { data: existing } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();
    if (existing) {
        throw new Error('You already liked this post');
    }
    const likeId = (0, crypto_1.randomUUID)();
    const { data, error } = await supabase
        .from('post_likes')
        .insert({
        id: likeId,
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to like post: ${error.message}`);
    }
    // 🔥 Sync événementiel vers PORA
    void syncEngagementToPoraTable(supabase, postId, userId, 'like');
    // 📢 Notifier le propriétaire
    void notifyPostOwner(post.author_id, {
        type: 'like',
        actorId: userId,
        postId,
        postTitle: post.titre,
        body: `${userId} a aime votre post${post.titre ? `: "${post.titre}"` : ''}`,
    });
    return data;
};
exports.likePost = likePost;
/**
 * Retirer un like
 */
const unlikePost = async (supabase, postId, userId) => {
    const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    if (error) {
        throw new Error(`Failed to unlike post: ${error.message}`);
    }
};
exports.unlikePost = unlikePost;
/**
 * Commenter un post
 */
const commentPost = async (supabase, postId, userId, payload) => {
    // Delegate creation & notification logic to PostsService so replies
    // (parent_comment_id) trigger the same notification flow as web endpoint.
    const created = await PostsService.createComment(supabase, userId, postId, payload.commentaire, payload.parent_comment_id ?? null);
    // 🔥 Sync événementiel vers PORA (kept for analytics)
    void syncEngagementToPoraTable(supabase, postId, userId, 'comment');
    return created;
};
exports.commentPost = commentPost;
/**
 * Récupérer les commentaires d'un post
 */
const getComments = async (supabase, postId, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    const { data: comments, error, count } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact' })
        .eq('post_id', postId)
        .order('date_comment', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        throw new Error(`Failed to fetch comments: ${error.message}`);
    }
    return {
        data: comments,
        total: count || 0,
        page,
        limit,
    };
};
exports.getComments = getComments;
/**
 * Enregistrer une vue sur un post
 */
const recordPostView = async (supabase, postId, userId, payload = {}) => {
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, author_id, titre')
        .eq('id', postId)
        .single();
    if (postError || !post) {
        throw new Error('Post not found');
    }
    const viewId = (0, crypto_1.randomUUID)();
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const viewerProfileId = await resolveViewerProfileId(supabase, userId);
    const normalizedDuration = typeof payload.view_duration === 'number' && Number.isFinite(payload.view_duration)
        ? Math.max(0, Math.round(payload.view_duration))
        : null;
    if (viewerProfileId) {
        const latestView = await getLatestPostView(supabase, postId, viewerProfileId, now, normalizedDuration);
        if (latestView &&
            isWithinViewCooldown(latestView.date_view, nowMs, (0, exports.getViewCooldownMs)('post'))) {
            return latestView;
        }
    }
    const initialInsert = await supabase
        .from('post_views')
        .insert({
        id: viewId,
        post_id: postId,
        user_id: viewerProfileId,
        view_duration: normalizedDuration,
        date_view: now,
    })
        .select()
        .single();
    let data = initialInsert.data;
    let error = initialInsert.error;
    // Older schemas may still use created_at instead of date_view and lack view_duration.
    if (error &&
        (error.message.includes('view_duration') || error.message.includes('date_view'))) {
        const fallback = await supabase
            .from('post_views')
            .insert({
            id: viewId,
            post_id: postId,
            user_id: viewerProfileId,
            created_at: now,
        })
            .select()
            .single();
        data = fallback.data;
        error = fallback.error;
    }
    if (error &&
        viewerProfileId &&
        error.message.includes('duplicate key value violates unique constraint')) {
        const latestView = await getLatestPostView(supabase, postId, viewerProfileId, now, normalizedDuration);
        if (latestView &&
            isWithinViewCooldown(latestView.date_view, nowMs, (0, exports.getViewCooldownMs)('post'))) {
            return latestView;
        }
        throw new Error('Failed to record post view: a unique constraint on post_views blocks cooldown-based counting');
    }
    if (error) {
        throw new Error(`Failed to record post view: ${error.message}`);
    }
    // 🔥 Sync événementiel vers PORA (seulement si userId existe)
    if (viewerProfileId) {
        void syncEngagementToPoraTable(supabase, postId, viewerProfileId, 'view');
    }
    return mapPostViewResponse(data, now, normalizedDuration);
};
exports.recordPostView = recordPostView;
/**
 * Récupérer les vues d'un post
 */
const getPostViews = async (supabase, postId, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    let query = supabase
        .from('post_views')
        .select('id, post_id, user_id, view_duration, date_view', { count: 'exact' })
        .eq('post_id', postId)
        .order('date_view', { ascending: false })
        .range(offset, offset + limit - 1);
    let { data, error, count } = await query;
    if (error && (error.message.includes('view_duration') || error.message.includes('date_view'))) {
        const fallback = await supabase
            .from('post_views')
            .select('id, post_id, user_id, created_at', { count: 'exact' })
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        data = (fallback.data || []).map((row) => ({
            id: row.id,
            post_id: row.post_id,
            user_id: row.user_id ?? null,
            view_duration: null,
            date_view: row.created_at,
        }));
        error = fallback.error;
        count = fallback.count;
    }
    else if (data) {
        data = data.map((row) => ({
            id: row.id,
            post_id: row.post_id,
            user_id: row.user_id ?? null,
            view_duration: row.view_duration ?? null,
            date_view: row.date_view,
        }));
    }
    if (error) {
        throw new Error(`Failed to fetch post views: ${error.message}`);
    }
    return {
        data: (data || []),
        total: count || 0,
        page,
        limit,
    };
};
exports.getPostViews = getPostViews;
//# sourceMappingURL=interactions.service.js.map