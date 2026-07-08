"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../middleware/auth");
const authPlugin = async (fastify) => {
    fastify.decorate('authMiddleware', auth_1.authMiddleware);
};
exports.default = authPlugin;
//# sourceMappingURL=auth.js.map