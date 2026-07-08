"use strict";
// src/middleware/authenticate.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.resolveAuthenticatedUser = void 0;
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2)
            return null;
        const payload = parts[1];
        const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
        return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    }
    catch (e) {
        return null;
    }
}
const resolveAuthenticatedUser = async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7);
    const decoded = decodeJWT(token);
    const userId = decoded?.id || decoded?.sub;
    if (!userId) {
        return null;
    }
    const fastify = request.server;
    let role = '';
    const rawRole = decoded.user_metadata?.role ||
        decoded.role ||
        decoded.user_role ||
        '';
    const normalized = rawRole.toString().toLowerCase();
    if (normalized.includes('univers'))
        role = 'universite';
    if (normalized.includes('centre'))
        role = 'centre_formation';
    if (normalized.includes('utilisateur'))
        role = 'utilisateur';
    if (normalized.includes('admin'))
        role = 'admin';
    if (normalized.includes('superviseur'))
        role = 'superviseur';
    if (normalized.includes('bde'))
        role = 'bde';
    if (!role) {
        const { data: uni } = await fastify.supabase
            .from('universites')
            .select('profile_id')
            .eq('profile_id', userId)
            .maybeSingle();
        if (uni) {
            role = 'universite';
        }
        else {
            const { data: centre } = await fastify.supabase
                .from('centres_formation')
                .select('profile_id')
                .eq('profile_id', userId)
                .maybeSingle();
            if (centre) {
                role = 'centre_formation';
            }
            else {
                const { data: profile } = await fastify.supabase
                    .from('profiles')
                    .select('profile_type')
                    .eq('id', userId)
                    .maybeSingle();
                if (profile?.profile_type) {
                    role = profile.profile_type;
                }
            }
        }
    }
    return {
        id: userId,
        role,
        email: decoded.email || undefined,
    };
};
exports.resolveAuthenticatedUser = resolveAuthenticatedUser;
const authenticate = async (request, reply) => {
    const resolvedUser = await (0, exports.resolveAuthenticatedUser)(request);
    if (!resolvedUser) {
        return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }
    request.user = resolvedUser;
    return;
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.substring(7);
    const decoded = decodeJWT(token);
    const userId = decoded?.id || decoded?.sub;
    if (!userId) {
        return reply.status(401).send({ error: 'Invalid token' });
    }
    const fastify = request.server;
    let role = '';
    // 1️⃣ Try token role
    const rawRole = decoded.user_metadata?.role ||
        decoded.role ||
        decoded.user_role ||
        '';
    const normalized = rawRole.toString().toLowerCase();
    if (normalized.includes('univers'))
        role = 'universite';
    if (normalized.includes('centre'))
        role = 'centre_formation';
    if (normalized.includes('utilisateur'))
        role = 'utilisateur';
    if (normalized.includes('admin'))
        role = 'admin';
    if (normalized.includes('superviseur'))
        role = 'superviseur';
    if (normalized.includes('bde'))
        role = 'bde';
    // 2️⃣ If missing, resolve from DB
    if (!role) {
        const { data: uni } = await fastify.supabase
            .from('universites')
            .select('profile_id')
            .eq('profile_id', userId)
            .maybeSingle();
        if (uni) {
            role = 'universite';
        }
        else {
            const { data: centre } = await fastify.supabase
                .from('centres_formation')
                .select('profile_id')
                .eq('profile_id', userId)
                .maybeSingle();
            if (centre) {
                role = 'centre_formation';
            }
            else {
                const { data: profile } = await fastify.supabase
                    .from('profiles')
                    .select('profile_type')
                    .eq('id', userId)
                    .maybeSingle();
                if (profile?.profile_type) {
                    role = profile.profile_type;
                }
            }
        }
    }
    request.user = {
        id: userId,
        role,
        email: decoded.email || undefined,
    };
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map