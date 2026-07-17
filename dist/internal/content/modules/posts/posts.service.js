"use strict";
// src/modules/posts/posts.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.updatePost = exports.getPost = exports.listViewerScopedComments = exports.listComments = exports.createComment = exports.listPostsByEntity = exports.listPosts = exports.createPost = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = require("crypto");
const axios_1 = __importDefault(require("axios"));
const notification_queue_1 = require("../../queues/notification.queue");
const DEFAULT_NOTIFICATION_SERVICE_URL = 'https://universearch-notification-service.onrender.com';
const normalizeCommentUserType = (type) => {
    const normalized = type?.toString().trim().toLowerCase() || '';
    if (normalized.includes('univers'))
        return 'universite';
    if (normalized.includes('centre'))
        return 'centre_formation';
    if (normalized === 'university')
        return 'universite';
    if (normalized === 'center')
        return 'centre_formation';
    return normalized || 'user';
};
const isInstitutionAuthorType = (entityType) => entityType === 'universite' ||
    entityType === 'centre_formation' ||
    entityType === 'centre';
const normalizeEntityType = (entityType) => entityType === 'universite' ? 'universite' : 'centre_formation';
const getMetricsClient = (supabase) => process.env.SUPABASE_SERVICE_ROLE_KEY
    ? (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : supabase;
const getPostCounts = async (supabase, postId) => {
    const metricsClient = getMetricsClient(supabase);
    const [{ count: likesCount }, { count: commentsCount }, { count: sharesCount }, { count: viewsCount },] = await Promise.all([
        metricsClient
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId),
        metricsClient
            .from('post_comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId),
        metricsClient
            .from('post_shares')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId),
        metricsClient
            .from('post_views')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId),
    ]);
    return {
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        shares_count: sharesCount || 0,
        views_count: viewsCount || 0,
    };
};
/**
 * RÃƒÂ©cupÃƒÂ©rer les followers d'une universitÃƒÂ© ou centre
 */
const getFollowers = async (supabase, entityId, entityType) => {
    try {
        const normalizedType = normalizeEntityType(entityType);
        const tableName = normalizedType === 'universite'
            ? 'followers_universites'
            : 'followers_centres_formation';
        const columnName = normalizedType === 'universite'
            ? 'universite_id'
            : 'centre_id';
        const { data, error } = await supabase
            .from(tableName)
            .select('user_id')
            .eq(columnName, entityId);
        if (error) {
            console.error(`Failed to get followers: ${error.message}`);
            return [];
        }
        return (data || []).map((row) => row.user_id);
    }
    catch (err) {
        console.error('Error fetching followers:', err);
        return [];
    }
};
/**
 * Envoyer une notification ÃƒÂ  chaque follower
 */
const notifyFollowers = async (followerIds, post, entityInfo) => {
    if (followerIds.length === 0)
        return;
    try {
        const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL;
        const organizationName = entityInfo?.name || entityInfo?.sigle || post.author_id;
        const organizationDisplayName = entityInfo?.sigle?.trim() ||
            entityInfo?.name?.trim() ||
            organizationName;
        const organizationId = entityInfo?.id || post.author_id;
        const organizationType = entityInfo?.type || normalizeEntityType(post.author_type);
        const notificationMessage = `${organizationName} a publiÃ© : "${post.titre}"`;
        const response = await axios_1.default.post(`${notificationServiceUrl}/api/notifications/broadcast`, {
            user_ids: followerIds,
            type: 'post',
            title: 'Nouveau post',
            message: `${organizationDisplayName} a publie un nouveau post.`,
            delivery_types: ['in_app', 'push'],
            data: {
                post_id: post.id,
                author_id: organizationId,
                author_type: organizationType,
                institution_id: organizationId,
                institution_name: organizationName,
                institution_logo_url: entityInfo?.logo_url || null,
                institution_description: entityInfo?.description || null,
                titre: post.titre,
                description: post.description,
            },
        }, {
            timeout: 20000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const broadcastResponse = response.data;
        const deliveredCount = typeof broadcastResponse?.count === 'number'
            ? broadcastResponse.count
            : followerIds.length;
        const errors = Array.isArray(broadcastResponse?.errors)
            ? broadcastResponse.errors
            : [];
        if (errors.length > 0) {
            console.warn('Broadcast notification completed with partial errors:', errors);
        }
        console.log(`Notifications queued for ${deliveredCount}/${followerIds.length} followers`);
    }
    catch (err) {
        const details = err?.response?.data ??
            err?.message ??
            err?.code ??
            err;
        console.error('Error notifying followers:', details);
    }
};
/**
 * RÃƒÂ©cupÃƒÂ©rer les info de l'entitÃƒÂ© (universitÃƒÂ© ou centre)
 */
const getEntityInfo = async (supabase, entityId, entityType) => {
    try {
        const normalizedType = normalizeEntityType(entityType);
        const tableName = normalizedType === 'universite' ? 'universites' : 'centres_formation';
        const { data } = await supabase
            .from(tableName)
            .select('id, nom, sigle, logo_url, description')
            .eq('id', entityId)
            .single();
        if (!data) {
            return null;
        }
        return {
            id: data.id,
            name: data.nom,
            sigle: data.sigle,
            logo_url: data.logo_url,
            description: data.description,
            type: normalizedType,
        };
    }
    catch (err) {
        console.error('Error fetching entity info:', err);
        return null;
    }
};
const resolveAuthorEntity = async (supabase, authorId, authorType) => {
    const normalizedType = normalizeEntityType(authorType);
    const tableName = normalizedType === 'universite' ? 'universites' : 'centres_formation';
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('id, nom, sigle, logo_url, description, profile_id')
            .eq('profile_id', authorId)
            .maybeSingle();
        if (error) {
            console.error('Error resolving author entity by profile_id:', error);
        }
        if (data) {
            return {
                id: data.id,
                name: data.nom,
                sigle: data.sigle,
                logo_url: data.logo_url,
                description: data.description,
                type: normalizedType,
            };
        }
    }
    catch (err) {
        console.error('Error resolving author entity:', err);
    }
    return getEntityInfo(supabase, authorId, normalizedType);
};
const normalizeInstitutionRole = (role) => {
    const normalized = role?.toString().toLowerCase() || '';
    if (normalized.includes('univers')) {
        return 'universite';
    }
    if (normalized.includes('centre')) {
        return 'centre_formation';
    }
    return null;
};
const resolveActorName = async (supabase, actorId) => {
    try {
        const { data } = await supabase
            .from('profiles')
            .select('nom, prenom')
            .eq('id', actorId)
            .maybeSingle();
        const fullName = [data?.prenom, data?.nom]
            .filter((value) => value && String(value).trim().length > 0)
            .join(' ')
            .trim();
        return fullName || data?.nom || actorId;
    }
    catch (_) {
        return actorId;
    }
};
const resolveCommentActorEntity = async (supabase, actorId, actorRole) => {
    const normalizedRole = normalizeInstitutionRole(actorRole);
    if (normalizedRole) {
        const roleEntity = await resolveAuthorEntity(supabase, actorId, normalizedRole);
        if (roleEntity) {
            return roleEntity;
        }
    }
    const universityEntity = await resolveAuthorEntity(supabase, actorId, 'universite');
    if (universityEntity) {
        return universityEntity;
    }
    return resolveAuthorEntity(supabase, actorId, 'centre_formation');
};
const sendCommentNotification = async (target, payload) => {
    try {
        console.log('sendCommentNotification ->', {
            to: target.userId,
            type: target.type,
            title: target.title,
            message: target.message,
            postId: payload.postId,
            parentCommentId: payload.parentCommentId,
            actorUserId: payload.actorUserId,
        });
    }
    catch (_) {
        // silent
    }
    await axios_1.default.post(`${process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL}/api/notifications`, {
        user_id: target.userId,
        type: target.type,
        title: target.title,
        message: target.message,
        priority: 'high',
        delivery_types: ['in_app', 'push'],
        data: {
            title: target.title,
            body: target.message,
            type: target.type,
            post_id: payload.postId,
            entity_id: payload.postId,
            actor_id: payload.actorUserId,
            actor_name: payload.actorName,
            actor_type: payload.actorEntity?.type || payload.actorRole || 'utilisateur',
            author_id: payload.actorEntity?.id || payload.actorUserId,
            author_type: payload.actorEntity?.type || payload.actorRole || 'utilisateur',
            institution_id: payload.actorEntity?.id || null,
            institution_name: payload.actorEntity?.name || null,
            institution_logo_url: payload.actorEntity?.logo_url || null,
            institution_description: payload.actorEntity?.description || null,
            parent_comment_id: payload.parentCommentId || null,
            post_title: payload.postTitle || '',
            comment_preview: payload.commentPreview || '',
        },
    }, {
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};
/**
 * CrÃƒÂ©er un post
 */
const normalizeHashtags = (hashtags) => {
    if (!hashtags)
        return null;
    if (Array.isArray(hashtags)) {
        const cleaned = hashtags.map((tag) => String(tag).trim()).filter(Boolean);
        return cleaned.length ? cleaned : null;
    }
    const cleanedString = String(hashtags).trim();
    if (!cleanedString)
        return null;
    const parts = cleanedString.split(/\s+/).filter(Boolean);
    return parts.length ? parts : null;
};
const createPost = async (supabase, authorId, authorType, payload) => {
    const postId = (0, crypto_1.randomUUID)();
    const now = new Date().toISOString();
    const normalizedHashtags = normalizeHashtags(payload.hashtags);
    const insertObj = {
        id: postId,
        author_id: authorId,
        author_type: authorType,
        titre: payload.titre,
        description: payload.description || null,
        category: payload.category || null,
        hashtags: normalizedHashtags,
        media_url: payload.media_url ?? null,
        thumbnail_url: payload.thumbnail_url ?? null,
        media_type: payload.media_type ?? null,
        media_processing_status: payload.media_processing_status ?? null,
        media_processing_error: payload.media_processing_error ?? null,
        date_creation: now,
    };
    let { data, error } = await supabase
        .from('posts')
        .insert(insertObj)
        .select()
        .single();
    if (error && Array.isArray(normalizedHashtags)) {
        const fallbackInsertObj = { ...insertObj, hashtags: normalizedHashtags.join(' ') };
        const fallbackResult = await supabase
            .from('posts')
            .insert(fallbackInsertObj)
            .select()
            .single();
        if (fallbackResult.error) {
            throw new Error(`Failed to create post: ${fallbackResult.error.message}`);
        }
        data = fallbackResult.data;
    }
    if (!data) {
        throw new Error(`Failed to create post: ${error?.message || 'Unknown error'}`);
    }
    const createdPost = data;
    // 🚀 Trigger follower notifications via notification service
    try {
        if (isInstitutionAuthorType(authorType)) {
            await (0, notification_queue_1.addNotificationJob)({
                postId: createdPost.id,
                authorId,
                authorType,
            });
            console.log('Queued follower notification job for post', createdPost.id, 'author', authorId);
        }
    }
    catch (err) {
        console.error('Failed to queue follower notification job:', err);
        // Continue even if notification queueing fails
    }
    return createdPost;
};
exports.createPost = createPost;
/**
 * Lister les posts (rÃƒÂ©cupÃƒÂ©ration publique)
 */
const listPosts = async (supabase, limit = 50, filter) => {
    // Build base query with only essential fields to avoid large payloads
    let query = supabase
        .from('posts')
        .select('id, author_id, author_type, titre, description, category, hashtags, media_url, thumbnail_url, media_type, statut, date_creation');
    // If a filter (exact match) is provided, apply it using .match()
    if (filter && Object.keys(filter).length > 0) {
        query = query.match(filter);
    }
    // Apply ordering and limit after filtering
    query = query.order('date_creation', { ascending: false }).limit(limit);
    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to list posts: ${error.message}`);
    }
    const posts = (data || []);
    // Enrich posts with likes/comments/shares counts using service role to bypass RLS
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const counts = await getPostCounts(supabase, post.id);
        return {
            ...post,
            ...counts,
        };
    }));
    return enrichedPosts;
};
exports.listPosts = listPosts;
/**
 * Lister les posts par entitÃƒÂ© (universitÃƒÂ© ou centre)
 */
const listPostsByEntity = async (supabase, entityId, entityType, limit = 10) => {
    // Build query to get posts by entity
    const { data, error } = await supabase
        .from('posts')
        .select('id, author_id, author_type, titre, description, category, hashtags, media_url, thumbnail_url, media_type, statut, date_creation')
        .eq('author_id', entityId)
        .eq('author_type', entityType === 'universite' ? 'universite' : 'centre_formation')
        .eq('statut', 'PUBLISHED')
        .order('date_creation', { ascending: false })
        .limit(limit);
    if (error) {
        throw new Error(`Failed to list posts by entity: ${error.message}`);
    }
    // Enrich posts with likes and comments counts
    const enrichedPosts = await Promise.all((data || []).map(async (post) => {
        const counts = await getPostCounts(supabase, post.id);
        return {
            ...post,
            ...counts,
        };
    }));
    return enrichedPosts;
};
exports.listPostsByEntity = listPostsByEntity;
/**
 * CrÃƒÂ©er un commentaire pour un post
 */
const createComment = async (supabase, userId, postId, contenu, parentCommentId, actorRole) => {
    const commentId = (0, crypto_1.randomUUID)();
    const now = new Date().toISOString();
    const insertObj = {
        id: commentId,
        post_id: postId,
        user_id: userId,
        contenu: contenu,
        commentaire: contenu,
        date_comment: now,
    };
    if (parentCommentId) {
        insertObj.parent_comment_id = parentCommentId;
    }
    let commentRecord = null;
    const { data, error } = await supabase
        .from('post_comments')
        .insert(insertObj)
        .select()
        .single();
    if (error) {
        // If parent_comment_id/commentaire columns don't exist, try a compatible insert.
        if (error.message.includes('parent_comment_id') ||
            error.message.includes('commentaire')) {
            const fallbackObj = {
                id: commentId,
                post_id: postId,
                user_id: userId,
                contenu: contenu,
                date_comment: now,
            };
            if (parentCommentId && !error.message.includes('parent_comment_id')) {
                fallbackObj.parent_comment_id = parentCommentId;
            }
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('post_comments')
                .insert(fallbackObj)
                .select()
                .single();
            if (fallbackError) {
                throw new Error(`Failed to create comment: ${fallbackError.message}`);
            }
            commentRecord = fallbackData;
        }
        else {
            throw new Error(`Failed to create comment: ${error.message}`);
        }
    }
    else {
        commentRecord = data;
    }
    void (async () => {
        try {
            const { data: postInfo, error: postInfoError } = await supabase
                .from('posts')
                .select('id, author_id, titre')
                .eq('id', postId)
                .maybeSingle();
            if (postInfoError || !postInfo) {
                if (postInfoError) {
                    console.error('Failed to fetch post for comment notification:', postInfoError.message);
                }
                return;
            }
            const actorEntity = await resolveCommentActorEntity(supabase, userId, actorRole);
            const actorName = actorEntity?.name ||
                actorEntity?.sigle ||
                (await resolveActorName(supabase, userId));
            const trimmedComment = (contenu || '').trim();
            const commentPreview = trimmedComment.length > 180
                ? `${trimmedComment.slice(0, 177)}...`
                : trimmedComment;
            const targets = [];
            if (postInfo.author_id && postInfo.author_id !== userId) {
                targets.push({
                    userId: postInfo.author_id,
                    type: 'comment',
                    title: 'Nouveau commentaire',
                    message: `${actorName} a commente votre post${postInfo.titre ? `: "${postInfo.titre}"` : ''}`,
                });
            }
            if (parentCommentId) {
                const { data: parentComment, error: parentCommentError } = await supabase
                    .from('post_comments')
                    .select('id, user_id')
                    .eq('id', parentCommentId)
                    .maybeSingle();
                if (parentCommentError) {
                    console.error('Failed to fetch parent comment for notification:', parentCommentError.message);
                }
                else if (parentComment?.user_id && parentComment.user_id !== userId) {
                    targets.push({
                        userId: parentComment.user_id,
                        type: 'comment_reply',
                        title: 'Nouvelle reponse',
                        message: `${actorName} a repondu a votre commentaire${postInfo.titre ? ` sur "${postInfo.titre}"` : ''}`,
                    });
                }
            }
            const uniqueTargets = targets.filter((target, index, list) => list.findIndex((item) => item.userId === target.userId && item.type === target.type) === index);
            try {
                console.log('createComment: notifying targets', {
                    postId,
                    parentCommentId,
                    actorUserId: userId,
                    targets: uniqueTargets.map((t) => ({ userId: t.userId, type: t.type })),
                });
            }
            catch (_) { }
            await Promise.all(uniqueTargets.map((target) => sendCommentNotification(target, {
                actorUserId: userId,
                actorRole,
                actorName,
                actorEntity,
                postId,
                postTitle: postInfo.titre,
                parentCommentId,
                commentPreview,
            }).catch((notificationError) => {
                const details = notificationError?.response?.data ??
                    notificationError?.message ??
                    notificationError;
                console.error('Failed to send comment notification:', details);
            })));
        }
        catch (notifyError) {
            console.error('Error in comment notification flow:', notifyError);
        }
    })();
    return {
        ...commentRecord,
        commentaire: commentRecord?.commentaire ?? commentRecord?.contenu,
        parent_comment_id: commentRecord?.parent_comment_id ?? parentCommentId ?? null,
    };
};
exports.createComment = createComment;
/**
 * Lister les commentaires d'un post (public)
 */
const listComments = async (supabase, postId, limit = 50) => {
    // First, get comments with user info
    const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select(`
      id,
      post_id,
      user_id,
      contenu,
      date_comment,
      parent_comment_id
    `)
        .eq('post_id', postId)
        .order('date_comment', { ascending: false })
        .limit(limit);
    if (error) {
        // If parent_comment_id column doesn't exist yet, try without it
        if (error.message.includes('parent_comment_id')) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('post_comments')
                .select(`
          id,
          post_id,
          user_id,
          contenu,
          date_comment
        `)
                .eq('post_id', postId)
                .order('date_comment', { ascending: false })
                .limit(limit);
            if (fallbackError) {
                throw new Error(`Failed to list comments: ${fallbackError.message}`);
            }
            // Add null parent_comment_id for compatibility
            const commentsWithUsers = await enrichCommentsWithUsers(supabase, fallbackData || []);
            return commentsWithUsers.map(c => ({ ...c, parent_comment_id: null }));
        }
        throw new Error(`Failed to list comments: ${error.message}`);
    }
    // Enrich comments with user information
    const commentsWithUsers = await enrichCommentsWithUsers(supabase, commentsData || []);
    return commentsWithUsers.map((comment) => ({
        ...comment,
        commentaire: comment.commentaire ?? comment.contenu,
        created_at: comment.created_at ?? comment.date_comment,
    }));
};
exports.listComments = listComments;
const listViewerScopedComments = async (supabase, postId, viewerUserId, limit = 50) => {
    const { data: ownComments, error: ownCommentsError } = await supabase
        .from('post_comments')
        .select(`
      id,
      post_id,
      user_id,
      contenu,
      date_comment,
      parent_comment_id
    `)
        .eq('post_id', postId)
        .eq('user_id', viewerUserId)
        .order('date_comment', { ascending: true })
        .limit(limit);
    if (ownCommentsError) {
        throw new Error(`Failed to list viewer comments: ${ownCommentsError.message}`);
    }
    const ownCommentList = ownComments || [];
    if (ownCommentList.length === 0) {
        return [];
    }
    const ownCommentIds = ownCommentList.map((comment) => comment.id);
    let replyRows = [];
    try {
        const { data: replies, error: repliesError } = await supabase
            .from('post_comments')
            .select(`
        id,
        post_id,
        user_id,
        contenu,
        date_comment,
        parent_comment_id
      `)
            .eq('post_id', postId)
            .in('parent_comment_id', ownCommentIds)
            .order('date_comment', { ascending: true })
            .limit(limit);
        if (repliesError) {
            throw repliesError;
        }
        replyRows = replies || [];
    }
    catch (error) {
        // Older schemas may not have parent_comment_id yet.
        if (!error.message.includes('parent_comment_id')) {
            throw new Error(`Failed to list viewer replies: ${error.message}`);
        }
    }
    const enrichedOwnComments = await enrichCommentsWithUsers(supabase, ownCommentList);
    const enrichedReplies = await enrichCommentsWithUsers(supabase, replyRows);
    const repliesToViewerComments = enrichedReplies.filter((comment) => comment.parent_comment_id &&
        ownCommentIds.includes(comment.parent_comment_id) &&
        comment.user_id !== viewerUserId);
    const merged = [...enrichedOwnComments, ...repliesToViewerComments].sort((a, b) => new Date(a.date_comment || a.created_at || 0).getTime() -
        new Date(b.date_comment || b.created_at || 0).getTime());
    try {
        console.log('listViewerScopedComments ->', {
            postId,
            viewerUserId,
            ownCount: enrichedOwnComments.length,
            repliesCount: repliesToViewerComments.length,
            mergedCount: merged.length,
            sampleReplies: repliesToViewerComments.slice(0, 5).map((r) => ({ id: r.id, user_id: r.user_id, parent_comment_id: r.parent_comment_id, user: r.user }))
        });
    }
    catch (_) { }
    return merged.map((comment) => ({
        ...comment,
        commentaire: comment.commentaire ?? comment.contenu,
        created_at: comment.created_at ?? comment.date_comment,
    }));
};
exports.listViewerScopedComments = listViewerScopedComments;
/**
 * Enrich comments with user information (university or center)
 */
const enrichCommentsWithUsers = async (supabase, comments) => {
    if (!comments || comments.length === 0)
        return [];
    const userIds = comments.map(c => c.user_id).filter(Boolean);
    // Fetch universities matching either id or profile_id safely using .in()
    let universities = [];
    let uniError = null;
    if (userIds.length) {
        const { data: uById, error: uByIdErr } = await supabase
            .from('universites')
            .select('id, profile_id, nom, sigle')
            .in('id', userIds);
        if (uByIdErr)
            uniError = uByIdErr;
        else
            universities = universities.concat(uById || []);
        const { data: uByProfile, error: uByProfileErr } = await supabase
            .from('universites')
            .select('id, profile_id, nom, sigle')
            .in('profile_id', userIds);
        if (uByProfileErr)
            uniError = uniError || uByProfileErr;
        else
            universities = universities.concat(uByProfile || []);
    }
    // Fetch centers matching either id or profile_id safely using .in()
    let centers = [];
    let centerError = null;
    if (userIds.length) {
        const { data: cById, error: cByIdErr } = await supabase
            .from('centres_formation')
            .select('id, profile_id, nom, sigle')
            .in('id', userIds);
        if (cByIdErr)
            centerError = cByIdErr;
        else
            centers = centers.concat(cById || []);
        const { data: cByProfile, error: cByProfileErr } = await supabase
            .from('centres_formation')
            .select('id, profile_id, nom, sigle')
            .in('profile_id', userIds);
        if (cByProfileErr)
            centerError = centerError || cByProfileErr;
        else
            centers = centers.concat(cByProfile || []);
    }
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, profile_type')
        .in('id', userIds.length ? userIds : ['']);
    if (uniError) {
        console.error('Universities query error:', uniError);
    }
    if (centerError) {
        console.error('Centers query error:', centerError);
    }
    if (profileError) {
        console.error('Profiles query error:', profileError);
    }
    const userMap = new Map();
    (universities || []).forEach(u => {
        const info = { name: u.nom, sigle: u.sigle, type: 'universite' };
        userMap.set(u.id, info);
        if (u.profile_id)
            userMap.set(u.profile_id, info);
    });
    (centers || []).forEach(c => {
        const info = { name: c.nom, sigle: c.sigle, type: 'centre_formation' };
        userMap.set(c.id, info);
        if (c.profile_id)
            userMap.set(c.profile_id, info);
    });
    (profiles || []).forEach((profile) => {
        if (userMap.has(profile.id)) {
            return;
        }
        const fullName = [profile.prenom, profile.nom]
            .filter((value) => value && String(value).trim().length > 0)
            .join(' ')
            .trim();
        userMap.set(profile.id, {
            name: fullName || profile.nom || profile.email || 'Utilisateur',
            type: normalizeCommentUserType(profile.profile_type),
        });
    });
    try {
        console.log('enrichCommentsWithUsers -> built userMap entries:', Array.from(userMap.entries()).slice(0, 10));
    }
    catch (_) { }
    return comments.map(comment => {
        const userInfo = userMap.get(comment.user_id);
        return {
            ...comment,
            user: userInfo ? {
                name: userInfo.name,
                sigle: userInfo.sigle,
                type: userInfo.type
            } : null
        };
    });
};
/**
 * RÃƒÂ©cupÃƒÂ©rer un post par ID
 */
const getPost = async (supabase, postId) => {
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
    if (postError || !post) {
        throw new Error('Post not found');
    }
    // RÃƒÂ©cupÃƒÂ©rer les compteurs (si ces tables existent)
    const counts = await getPostCounts(supabase, postId);
    return {
        ...post,
        ...counts,
    };
};
exports.getPost = getPost;
/**
 * Mettre ÃƒÂ  jour un post
 */
const updatePost = async (supabase, postId, authorId, payload) => {
    // VÃƒÂ©rifier que l'auteur du post est bien l'auteur connectÃƒÂ©
    const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .single();
    if (fetchError || !post) {
        throw new Error('Post not found');
    }
    if (post.author_id !== authorId) {
        throw new Error('Unauthorized: You can only modify your own posts');
    }
    const updateData = {
        ...payload,
    };
    if (payload.hashtags !== undefined) {
        updateData.hashtags = normalizeHashtags(payload.hashtags);
    }
    let { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId)
        .select()
        .single();
    if (error && Array.isArray(updateData.hashtags)) {
        const fallbackUpdateData = { ...updateData, hashtags: updateData.hashtags.join(' ') };
        const fallbackResult = await supabase
            .from('posts')
            .update(fallbackUpdateData)
            .eq('id', postId)
            .select()
            .single();
        if (fallbackResult.error) {
            throw new Error(`Failed to update post: ${fallbackResult.error.message}`);
        }
        data = fallbackResult.data;
    }
    if (error && !data) {
        throw new Error(`Failed to update post: ${error.message}`);
    }
    return data;
};
exports.updatePost = updatePost;
/**
 * Supprimer un post avec suppression en cascade de tous les éléments associés
 *
 * Cascade de suppression:
 * 1. Les likes du post (post_likes)
 * 2. Les commentaires et leurs réponses (post_comments avec ON DELETE CASCADE)
 * 3. Les vues du post (post_views)
 * 4. Les partages du post (post_shares)
 * 5. Le post lui-même (posts)
 */
const deletePost = async (supabase, postId, authorId) => {
    // Vérifier que l'auteur du post est bien l'auteur connecté
    const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .single();
    if (fetchError || !post) {
        throw new Error('Post not found');
    }
    if (post.author_id !== authorId) {
        throw new Error('Unauthorized: You can only delete your own posts');
    }
    // Supprimer les likes du post
    await supabase.from('post_likes').delete().eq('post_id', postId);
    // Supprimer les commentaires (et les réponses via ON DELETE CASCADE)
    // Note: ON DELETE CASCADE supprime aussi les réponses aux commentaires
    await supabase.from('post_comments').delete().eq('post_id', postId);
    // Supprimer les vues du post
    await supabase.from('post_views').delete().eq('post_id', postId);
    // Supprimer les partages du post
    await supabase.from('post_shares').delete().eq('post_id', postId);
    // Supprimer le post
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
        throw new Error(`Failed to delete post: ${error.message}`);
    }
};
exports.deletePost = deletePost;
//# sourceMappingURL=posts.service.js.map