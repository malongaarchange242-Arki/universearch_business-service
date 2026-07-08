"use strict";
// src/modules/interactions/interactions.schema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getViewsSchema = exports.recordViewSchema = exports.getCommentsSchema = exports.createCommentSchema = void 0;
exports.createCommentSchema = {
    body: {
        type: 'object',
        required: ['commentaire'],
        properties: {
            commentaire: {
                type: 'string',
                minLength: 1,
                maxLength: 1000,
                description: 'Texte du commentaire'
            }
        }
    }
};
exports.getCommentsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: {
                type: 'integer',
                default: 1,
                minimum: 1
            },
            limit: {
                type: 'integer',
                default: 20,
                minimum: 1,
                maximum: 100
            }
        }
    }
};
exports.recordViewSchema = {
    body: {
        type: 'object',
        additionalProperties: false,
        properties: {
            view_duration: {
                type: 'integer',
                minimum: 0,
                description: 'Durée de vue en secondes'
            }
        }
    }
};
exports.getViewsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: {
                type: 'integer',
                default: 1,
                minimum: 1
            },
            limit: {
                type: 'integer',
                default: 20,
                minimum: 1,
                maximum: 100
            }
        }
    }
};
//# sourceMappingURL=interactions.schema.js.map