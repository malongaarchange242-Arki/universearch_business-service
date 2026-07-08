"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueAdminRoutes = queueAdminRoutes;
const queue_controller_1 = require("./queue.controller");
const internalRateLimit_1 = require("../../middleware/internalRateLimit");
const adminAuth_1 = require("../../middleware/adminAuth");
async function queueAdminRoutes(app) {
    const queueController = new queue_controller_1.QueueController();
    app.get('/stats', {
        preHandler: [adminAuth_1.validateAdminToken, internalRateLimit_1.internalRateLimit],
    }, queueController.getQueueMetrics.bind(queueController));
    app.post('/retry/:id', {
        preHandler: [adminAuth_1.validateAdminToken, internalRateLimit_1.internalRateLimit],
    }, queueController.retryJob.bind(queueController));
    app.post('/failed/retry-all', {
        preHandler: [adminAuth_1.validateAdminToken, internalRateLimit_1.internalRateLimit],
    }, queueController.retryAllFailedJobs.bind(queueController));
}
//# sourceMappingURL=queue.routes.js.map