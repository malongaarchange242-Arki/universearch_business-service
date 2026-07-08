"use strict";
// src/modules/activities/activities.routes.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activitiesRoutes = void 0;
const ActivitiesController = __importStar(require("./activities.controller"));
const activities_schema_1 = require("./activities.schema");
const middleware_1 = require("../../middleware");
const activitiesRoutes = async (app, _options) => {
    app.post('/activities', {
        schema: activities_schema_1.createActivitySchema,
        preHandler: [middleware_1.authenticate],
    }, ActivitiesController.createActivity);
    app.get('/activities', ActivitiesController.listActivities);
    app.get('/activities/:id', {
        schema: activities_schema_1.getActivitySchema,
    }, ActivitiesController.getActivity);
    app.put('/activities/:id', {
        schema: activities_schema_1.updateActivitySchema,
        preHandler: [middleware_1.authenticate],
    }, ActivitiesController.updateActivity);
    app.delete('/activities/:id', {
        preHandler: [middleware_1.authenticate],
    }, ActivitiesController.deleteActivity);
};
exports.activitiesRoutes = activitiesRoutes;
//# sourceMappingURL=activities.routes.js.map