"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTrackingBatch = void 0;
const axios_1 = __importDefault(require("axios"));
const TRACKING_SERVICE_URL = process.env.TRACKING_SERVICE_URL || 'http://localhost:8080';
const TRACKING_API_KEY = process.env.TRACKING_API_KEY || process.env.INTERNAL_API_KEY || '';
const sendTrackingBatch = async (batch) => {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (TRACKING_API_KEY) {
        headers['X-API-Key'] = TRACKING_API_KEY;
    }
    const response = await axios_1.default.post(`${TRACKING_SERVICE_URL}/tracking/batch`, batch, { headers });
    return response.data;
};
exports.sendTrackingBatch = sendTrackingBatch;
//# sourceMappingURL=tracking.service.js.map