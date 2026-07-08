"use strict";
// src/modules/delivery/delivery.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRoutes = deliveryRoutes;
const delivery_controller_1 = require("./delivery.controller");
const delivery_service_1 = require("./delivery.service");
async function deliveryRoutes(app) {
    const deliveryService = new delivery_service_1.DeliveryService(app.supabase);
    const deliveryController = new delivery_controller_1.DeliveryController(deliveryService);
    // GET /ads/carousel
    app.get('/carousel', deliveryController.getCarousel.bind(deliveryController));
    // GET /ads/shorts
    app.get('/shorts', deliveryController.getShorts.bind(deliveryController));
}
//# sourceMappingURL=delivery.routes.js.map