"use strict";
// src/modules/analytics/analytics.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = analyticsRoutes;
const analytics_controller_1 = require("./analytics.controller");
const analytics_service_1 = require("./analytics.service");
async function analyticsRoutes(app) {
    const analyticsService = new analytics_service_1.AnalyticsService(app.supabase);
    const analyticsController = new analytics_controller_1.AnalyticsController(analyticsService);
    // POST /ads/impression
    app.post('/impression', analyticsController.recordImpression.bind(analyticsController));
    // POST /ads/click
    app.post('/click', analyticsController.recordClick.bind(analyticsController));
    // POST /ads/view
    app.post('/view', analyticsController.recordView.bind(analyticsController));
    // POST /ads/:adId/view - Alternative route with adId in path
    app.post('/:adId/view', async (request, reply) => {
        try {
            const { adId } = request.params;
            const { view_duration, user_id } = request.body;
            const view = await analyticsService.recordView(adId, {
                view_duration,
                user_id,
            });
            const latestViews = await analyticsService.getViews(adId, 1, 1);
            reply.send({
                success: true,
                data: view,
                views_count: latestViews.total,
            });
        }
        catch (error) {
            const message = error.message;
            const statusCode = message.includes('not found') ? 404 : 500;
            reply.code(statusCode).send({ success: false, error: message });
        }
    });
    // GET /ads/views/:adId
    app.get('/views/:adId', analyticsController.getViews.bind(analyticsController));
    // GET /ads/views-count/:adId
    app.get('/views-count/:adId', async (request, reply) => {
        try {
            const { adId } = request.params;
            const count = await analyticsService.getViewsCount(adId);
            reply.send({ success: true, views_count: count });
        }
        catch (error) {
            reply.code(500).send({ success: false, error: error.message });
        }
    });
    // POST /ads/like
    app.post('/like', analyticsController.recordLike.bind(analyticsController));
    // DELETE /ads/like
    app.delete('/like', analyticsController.removeLike.bind(analyticsController));
    // GET /ads/likes/:adId
    app.get('/likes/:adId', analyticsController.getLikes.bind(analyticsController));
    // GET /ads/likes-count/:adId
    app.get('/likes-count/:adId', async (request, reply) => {
        try {
            const { adId } = request.params;
            const count = await analyticsService.getLikesCount(adId);
            reply.send({ success: true, likes_count: count });
        }
        catch (error) {
            reply.code(500).send({ success: false, error: error.message });
        }
    });
    // POST /ads/comment
    app.post('/comment', analyticsController.postComment.bind(analyticsController));
    // GET /ads/comments/:adId
    app.get('/comments/:adId', analyticsController.getComments.bind(analyticsController));
    // GET /ads/comments-count/:adId
    app.get('/comments-count/:adId', async (request, reply) => {
        try {
            const { adId } = request.params;
            const count = await analyticsService.getCommentsCount(adId);
            reply.send({ success: true, comments_count: count });
        }
        catch (error) {
            reply.code(500).send({ success: false, error: error.message });
        }
    });
}
//# sourceMappingURL=analytics.routes.js.map