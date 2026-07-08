"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const isValidUUID = (value) => {
    if (typeof value !== 'string')
        return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};
const authMiddleware = async (request, reply) => {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                success: false,
                error: 'Unauthorized',
                message: 'Missing or invalid Authorization header',
            });
        }
        const token = authHeader.slice(7); // Remove "Bearer " prefix
        // Decode JWT (base64 decode the payload part)
        const parts = token.split('.');
        if (parts.length !== 3) {
            return reply.status(401).send({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid token format',
            });
        }
        try {
            const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            // Extract user ID from various possible fields
            const userId = decodedPayload.user_id || decodedPayload.id || decodedPayload.sub;
            if (!userId || !isValidUUID(userId)) {
                return reply.status(401).send({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid or missing user ID in token',
                });
            }
            request.userId = userId;
        }
        catch (decodeError) {
            return reply.status(401).send({
                success: false,
                error: 'Unauthorized',
                message: 'Invalid token format',
            });
        }
    }
    catch (error) {
        return reply.status(500).send({
            success: false,
            error: 'Authentication error',
        });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map