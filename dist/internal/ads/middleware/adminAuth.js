"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAdminToken = void 0;
const adminToken = process.env.VIDEO_QUEUE_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
const validateAdminToken = async (request, reply) => {
    if (!adminToken) {
        reply.code(500).send({
            success: false,
            error: 'Server misconfiguration: admin token missing.',
        });
        return;
    }
    const authHeader = request.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = bearerToken || request.headers['x-admin-token'];
    if (!token || token !== adminToken) {
        reply.code(401).send({
            success: false,
            error: 'Unauthorized access to internal queue metrics.',
        });
    }
};
exports.validateAdminToken = validateAdminToken;
//# sourceMappingURL=adminAuth.js.map