"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationFeed = exports.getCentresFeed = exports.getUniversitesFeed = exports.getFeed = void 0;
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 50;
const POST_SELECT_FIELDS = `
  id,
  author_id,
  author_type,
  titre,
  description,
  media_type,
  media_url,
  thumbnail_url,
  statut,
  date_creation,
  likes_count,
  comments_count,
  shares_count,
  views_count
`;
const clampPage = (page) => {
    const value = Number(page) || 1;
    return value < 1 ? 1 : value;
};
const clampLimit = (limit) => {
    const value = Number(limit) || DEFAULT_LIMIT;
    if (value < 1)
        return DEFAULT_LIMIT;
    return value > MAX_LIMIT ? MAX_LIMIT : value;
};
const normalizePosts = (posts) => {
    return (posts || []).map((post) => ({
        id: String(post.id),
        author_id: String(post.author_id),
        author_type: String(post.author_type),
        titre: post.titre ?? null,
        description: post.description ?? null,
        media_url: post.media_url ?? null,
        media_type: post.media_type ?? null,
        statut: post.statut ?? null,
        date_creation: String(post.date_creation),
        likes_count: Number(post.likes_count ?? 0),
        comments_count: Number(post.comments_count ?? 0),
        shares_count: Number(post.shares_count ?? 0),
        views_count: Number(post.views_count ?? 0),
    }));
};
const buildFeedResponse = (posts, page, limit, total) => ({
    data: posts,
    pagination: { page, limit, total },
});
const fetchPosts = async (buildBaseQuery, applyFilters, page, limit) => {
    const offset = (page - 1) * limit;
    // Avoid COUNT on large tables for feed queries — select only fields.
    // If you later need totals, prefer cursor-based or approximate counts.
    const query = buildBaseQuery().select(POST_SELECT_FIELDS);
    const filteredQuery = applyFilters(query);
    const response = await filteredQuery.order('date_creation', { ascending: false }).range(offset, offset + limit - 1);
    if (response.error) {
        throw new Error(`Failed to fetch feed posts: ${response.error.message}`);
    }
    const data = response.data || [];
    return {
        posts: data,
        total: data.length,
    };
};
const getFeed = async (supabase, page = 1, limit = DEFAULT_LIMIT) => {
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    const { posts, total } = await fetchPosts(() => supabase.from('posts'), (q) => q.eq('statut', 'PUBLISHED'), safePage, safeLimit);
    const normalizedPosts = normalizePosts(posts);
    return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};
exports.getFeed = getFeed;
const getUniversitesFeed = async (supabase, page = 1, limit = DEFAULT_LIMIT) => {
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    const { posts, total } = await fetchPosts(() => supabase.from('posts'), (q) => q.eq('author_type', 'universite').eq('statut', 'PUBLISHED'), safePage, safeLimit);
    const normalizedPosts = normalizePosts(posts);
    return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};
exports.getUniversitesFeed = getUniversitesFeed;
const getCentresFeed = async (supabase, page = 1, limit = DEFAULT_LIMIT) => {
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    const { posts, total } = await fetchPosts(() => supabase.from('posts'), (q) => q.eq('author_type', 'centre_formation').eq('statut', 'PUBLISHED'), safePage, safeLimit);
    const normalizedPosts = normalizePosts(posts);
    return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};
exports.getCentresFeed = getCentresFeed;
const getOrganizationFeed = async (supabase, organizationId, organizationType, page = 1, limit = DEFAULT_LIMIT) => {
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    const { posts, total } = await fetchPosts(() => supabase.from('posts'), (q) => q.eq('author_id', organizationId).eq('author_type', organizationType).eq('statut', 'PUBLISHED'), safePage, safeLimit);
    const normalizedPosts = normalizePosts(posts);
    return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};
exports.getOrganizationFeed = getOrganizationFeed;
//# sourceMappingURL=feed.service.js.map