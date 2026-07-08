"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyTrackingBatch = void 0;
const tracking_service_1 = require("./tracking.service");
const proxyTrackingBatch = async (request, reply) => {
    try {
        const result = await (0, tracking_service_1.sendTrackingBatch)(request.body);
        return reply.code(202).send(result);
    }
    catch (error) {
        request.log.error(error, 'Tracking proxy failed');
        return reply.status(502).send({
            success: false,
            error: 'Failed to forward tracking batch',
            details: error.message,
        });
    }
};
exports.proxyTrackingBatch = proxyTrackingBatch;
//# sourceMappingURL=tracking.proxy.js.map