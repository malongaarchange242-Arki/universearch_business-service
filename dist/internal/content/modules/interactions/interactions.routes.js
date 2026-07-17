"use strict";
// src/modules/interactions/interactions.routes.ts
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
exports.interactionsRoutes = void 0;
const InteractionsController = __importStar(require("./interactions.controller"));
const interactions_schema_1 = require("./interactions.schema");
const middleware_1 = require("../../middleware");
const interactionsRoutes = async (app, _options) => {
    /**
     * POST /posts/:id/like - Aimer un post
     * Protégé: authentifié
     */
    app.post('/posts/:id/like', { preHandler: [middleware_1.authenticate] }, InteractionsController.likePost);
    app.get('/posts/:id/like-status', { preHandler: [middleware_1.authenticate] }, InteractionsController.getLikeStatus);
    /**
     * DELETE /posts/:id/like - Retirer un like
     * Protégé: authentifié
     */
    app.delete('/posts/:id/like', { preHandler: [middleware_1.authenticate] }, InteractionsController.unlikePost);
    /**
     * POST /posts/:id/comment - Commenter un post
     * Protégé: authentifié
     */
    app.post('/posts/:id/comment', {
        schema: interactions_schema_1.createCommentSchema,
        preHandler: [middleware_1.authenticate],
    }, InteractionsController.commentPost);
    /**
     * DELETE /posts/:id/comment/:commentId - Supprimer un commentaire
     * Protégé: authentifié
     */
    app.delete('/posts/:id/comment/:commentId', { preHandler: [middleware_1.authenticate] }, InteractionsController.deleteComment);
    /**
     * POST /posts/:id/view - Enregistrer une vue
     * Public, avec user_id si Authorization fournie
     */
    app.post('/posts/:id/view', {
        schema: interactions_schema_1.recordViewSchema,
    }, InteractionsController.recordView);
    /**
     * GET /posts/:id/views - Lister les vues d'un post
     * Public
     */
    app.get('/posts/:id/views', {
        schema: interactions_schema_1.getViewsSchema,
    }, InteractionsController.getViews);
};
exports.interactionsRoutes = interactionsRoutes;
//# sourceMappingURL=interactions.routes.js.map