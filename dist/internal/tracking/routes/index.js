"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTrackingRoutes = void 0;
const tracking_proxy_1 = require("../services/tracking.proxy");
const registerTrackingRoutes = async (app) => {
    app.post('/tracking/batch', tracking_proxy_1.proxyTrackingBatch);
    app.post('/api/v1/tracking/batch', tracking_proxy_1.proxyTrackingBatch);
    app.post('/api/tracking', tracking_proxy_1.proxyTrackingBatch);
    app.post('/api/tracking/batch', tracking_proxy_1.proxyTrackingBatch);
};
exports.registerTrackingRoutes = registerTrackingRoutes;
//# sourceMappingURL=index.js.map