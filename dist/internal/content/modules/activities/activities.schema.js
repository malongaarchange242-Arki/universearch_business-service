"use strict";
// src/modules/activities/activities.schema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateActivitySchema = exports.getActivitySchema = exports.createActivitySchema = void 0;
exports.createActivitySchema = {
    body: {
        type: 'object',
        required: ['title'],
        properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            status: {
                type: 'string',
                enum: ['active', 'completed', 'archived'],
            },
            is_public: { type: 'boolean' },
            organization_id: { type: 'string' },
            organization_type: {
                type: 'string',
                enum: ['universite', 'centre', 'centre_formation'],
            },
        },
        additionalProperties: false,
    },
};
exports.getActivitySchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' },
        },
        additionalProperties: false,
    },
};
exports.updateActivitySchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' },
        },
        additionalProperties: false,
    },
    body: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            status: {
                type: 'string',
                enum: ['active', 'completed', 'archived'],
            },
            is_public: { type: 'boolean' },
            organization_id: { type: 'string' },
            organization_type: {
                type: 'string',
                enum: ['universite', 'centre', 'centre_formation'],
            },
        },
        additionalProperties: false,
    },
};
//# sourceMappingURL=activities.schema.js.map