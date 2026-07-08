"use strict";
// src/modules/posts/posts.schema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommentSchema = exports.updatePostSchema = exports.createPostSchema = void 0;
exports.createPostSchema = {
    body: {
        type: 'object',
        required: ['titre'],
        properties: {
            titre: { type: 'string', minLength: 1, maxLength: 500 },
            description: {
                type: ['string', 'null'],
                minLength: 0,
                maxLength: 5000,
                description: 'Description du post (optionnel)',
            },
            media_url: {
                type: ['string', 'null'],
                description: 'URL du media (si disponible)',
            },
            thumbnail_url: {
                type: ['string', 'null'],
                description: 'URL de la miniature video (si disponible)',
            },
            media_type: {
                type: ['string', 'null'],
                enum: ['image', 'video'],
                description: 'Type de media',
            },
            category: {
                type: ['string', 'null'],
                description: 'Catégorie du post (ex: général, admission, information, événement)',
            },
            hashtags: {
                type: ['string', 'array', 'null'],
                items: { type: 'string' },
                description: 'Hashtags associés au post',
            },
            media_processing_status: {
                type: ['string', 'null'],
                enum: ['queued', 'processing', 'completed', 'failed'],
            },
            media_processing_error: {
                type: ['string', 'null'],
            },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        author_id: { type: 'string' },
                        author_type: { type: 'string' },
                        titre: { type: 'string' },
                        description: { type: ['string', 'null'] },
                        contenu: { type: 'string' },
                        media_url: { type: ['string', 'null'] },
                        thumbnail_url: { type: ['string', 'null'] },
                        media_type: { type: ['string', 'null'] },
                        category: { type: ['string', 'null'] },
                        media_processing_status: { type: ['string', 'null'] },
                        media_processing_error: { type: ['string', 'null'] },
                        statut: { type: 'string' },
                        date_creation: { type: 'string' },
                    },
                },
            },
        },
    },
};
exports.updatePostSchema = {
    body: {
        type: 'object',
        properties: {
            description: {
                type: 'string',
                minLength: 1,
                maxLength: 5000,
            },
            media_url: {
                type: 'string',
                format: 'uri',
            },
            thumbnail_url: {
                type: 'string',
                format: 'uri',
            },
            media_type: {
                type: 'string',
                enum: ['image', 'video'],
            },
            hashtags: {
                type: 'string',
            },
            media_processing_status: {
                type: 'string',
                enum: ['queued', 'processing', 'completed', 'failed'],
            },
            media_processing_error: {
                type: 'string',
            },
        },
    },
};
exports.createCommentSchema = {
    body: {
        type: 'object',
        required: ['contenu'],
        properties: {
            contenu: { type: 'string', minLength: 1, maxLength: 2000 },
            parent_comment_id: {
                type: ['string', 'null'],
                description: 'ID du commentaire parent (pour les reponses)',
            },
        },
    },
};
//# sourceMappingURL=posts.schema.js.map