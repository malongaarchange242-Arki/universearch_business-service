"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBusinessRoutes = exports.registerContentRoutes = exports.registerAdsRoutes = void 0;
const routes_1 = require("../internal/ads/routes");
const feedbacks_1 = __importDefault(require("../internal/content/routes/feedbacks"));
const activities_routes_1 = require("../internal/content/modules/activities/activities.routes");
const feed_routes_1 = require("../internal/content/modules/feed/feed.routes");
const interactions_routes_1 = require("../internal/content/modules/interactions/interactions.routes");
const posts_routes_1 = require("../internal/content/modules/posts/posts.routes");
const stats_routes_1 = require("../internal/content/modules/stats/stats.routes");
const routes_2 = require("../internal/tracking/routes");
const registerAdsRoutes = (app) => {
    (0, routes_1.registerRoutes)(app);
};
exports.registerAdsRoutes = registerAdsRoutes;
const registerContentRoutes = async (app) => {
    app.register(posts_routes_1.postsRoutes);
    app.register(interactions_routes_1.interactionsRoutes);
    app.register(activities_routes_1.activitiesRoutes);
    app.register(feed_routes_1.feedRoutes);
    app.register(stats_routes_1.statsRoutes);
    app.register(feedbacks_1.default);
};
exports.registerContentRoutes = registerContentRoutes;
const registerBusinessRoutes = async (app) => {
    (0, exports.registerAdsRoutes)(app);
    await (0, exports.registerContentRoutes)(app);
    await (0, routes_2.registerTrackingRoutes)(app);
};
exports.registerBusinessRoutes = registerBusinessRoutes;
//# sourceMappingURL=index.js.map