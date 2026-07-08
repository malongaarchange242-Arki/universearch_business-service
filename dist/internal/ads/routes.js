"use strict";
// src/routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const campaign_routes_1 = require("./modules/campaign/campaign.routes");
const media_routes_1 = require("./modules/media/media.routes");
const delivery_routes_1 = require("./modules/delivery/delivery.routes");
const analytics_routes_1 = require("./modules/analytics/analytics.routes");
const queue_routes_1 = require("./modules/internal/queue.routes");
const registerRoutes = (app) => {
    app.register(campaign_routes_1.campaignRoutes, { prefix: '/ads' });
    app.register(media_routes_1.mediaRoutes, { prefix: '/ads/media' });
    app.register(delivery_routes_1.deliveryRoutes, { prefix: '/ads' });
    app.register(analytics_routes_1.analyticsRoutes, { prefix: '/ads' });
    app.register(queue_routes_1.queueAdminRoutes, { prefix: '/internal/queues/video-processing' });
};
exports.registerRoutes = registerRoutes;
//# sourceMappingURL=routes.js.map