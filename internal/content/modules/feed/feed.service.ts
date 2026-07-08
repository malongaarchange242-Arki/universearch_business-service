import { SupabaseClient } from '@supabase/supabase-js';

export interface FeedPost {
  id: string;
  author_id: string;
  author_type: string;
  titre: string | null;
  description: string | null;
  media_url: string | null;
  media_type: string | null;
  statut: string | null;
  date_creation: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
}

export interface FeedResponse {
  data: FeedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

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

const clampPage = (page: number): number => {
  const value = Number(page) || 1;
  return value < 1 ? 1 : value;
};

const clampLimit = (limit: number): number => {
  const value = Number(limit) || DEFAULT_LIMIT;
  if (value < 1) return DEFAULT_LIMIT;
  return value > MAX_LIMIT ? MAX_LIMIT : value;
};

const normalizePosts = (posts: any[]): FeedPost[] => {
  return (posts || []).map((post: any) => ({
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

const buildFeedResponse = (
  posts: FeedPost[],
  page: number,
  limit: number,
  total: number
): FeedResponse => ({
  data: posts,
  pagination: { page, limit, total },
});

const fetchPosts = async (
  buildBaseQuery: () => any,
  applyFilters: (query: any) => any,
  page: number,
  limit: number
) => {
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

export const getFeed = async (
  supabase: SupabaseClient,
  page: number = 1,
  limit: number = DEFAULT_LIMIT
): Promise<FeedResponse> => {
  const safePage = clampPage(page);
  const safeLimit = clampLimit(limit);

  const { posts, total } = await fetchPosts(
    () => supabase.from('posts'),
    (q) => q.eq('statut', 'PUBLISHED'),
    safePage,
    safeLimit
  );

  const normalizedPosts = normalizePosts(posts);
  return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};

export const getUniversitesFeed = async (
  supabase: SupabaseClient,
  page: number = 1,
  limit: number = DEFAULT_LIMIT
): Promise<FeedResponse> => {
  const safePage = clampPage(page);
  const safeLimit = clampLimit(limit);

  const { posts, total } = await fetchPosts(
    () => supabase.from('posts'),
    (q) => q.eq('author_type', 'universite').eq('statut', 'PUBLISHED'),
    safePage,
    safeLimit
  );

  const normalizedPosts = normalizePosts(posts);
  return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};

export const getCentresFeed = async (
  supabase: SupabaseClient,
  page: number = 1,
  limit: number = DEFAULT_LIMIT
): Promise<FeedResponse> => {
  const safePage = clampPage(page);
  const safeLimit = clampLimit(limit);

  const { posts, total } = await fetchPosts(
    () => supabase.from('posts'),
    (q) => q.eq('author_type', 'centre_formation').eq('statut', 'PUBLISHED'),
    safePage,
    safeLimit
  );

  const normalizedPosts = normalizePosts(posts);
  return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};

export const getOrganizationFeed = async (
  supabase: SupabaseClient,
  organizationId: string,
  organizationType: 'universite' | 'centre_formation',
  page: number = 1,
  limit: number = DEFAULT_LIMIT
): Promise<FeedResponse> => {
  const safePage = clampPage(page);
  const safeLimit = clampLimit(limit);

  const { posts, total } = await fetchPosts(
    () => supabase.from('posts'),
    (q) => q.eq('author_id', organizationId).eq('author_type', organizationType).eq('statut', 'PUBLISHED'),
    safePage,
    safeLimit
  );

  const normalizedPosts = normalizePosts(posts);
  return buildFeedResponse(normalizedPosts, safePage, safeLimit, total);
};
