"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedbacksQuerySchema = exports.createFeedbackSchema = void 0;
// src/schemas/feedbacks.ts
const zod_1 = require("zod");
exports.createFeedbackSchema = zod_1.z.object({
    type: zod_1.z.enum(['bug', 'suggestion', 'review']),
    rating: zod_1.z.number().int().min(1).max(5),
    message: zod_1.z.string().min(1),
    page: zod_1.z.enum(['feed', 'universite', 'quiz', 'messages']),
    metadata: zod_1.z.object({}).catchall(zod_1.z.unknown()).optional(),
});
exports.getFeedbacksQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().optional().default(10),
    offset: zod_1.z.coerce.number().optional().default(0),
    type: zod_1.z.enum(['bug', 'suggestion', 'review']).optional(),
    status: zod_1.z.enum(['pending', 'reviewed', 'resolved']).optional(),
    page: zod_1.z.enum(['feed', 'universite', 'quiz', 'messages']).optional(),
});
//# sourceMappingURL=feedbacks.js.map