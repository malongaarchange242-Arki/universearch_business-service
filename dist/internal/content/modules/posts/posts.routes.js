"use strict";
// src/modules/posts/posts.routes.ts
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
exports.postsRoutes = void 0;
const PostsController = __importStar(require("./posts.controller"));
const posts_schema_1 = require("./posts.schema");
const middleware_1 = require("../../middleware");
const uploadRateLimit_1 = require("../../middleware/uploadRateLimit");
const postsRoutes = async (app, _options) => {
    /**
     * POST /posts - Créer un post
     * Protégé: authentifié + organisation APPROVED
     */
    app.post('/posts', {
        schema: posts_schema_1.createPostSchema,
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg],
    }, PostsController.createPost);
    /**
     * GET /posts/mine - Lister les posts de l'organisation authentifiée
     * Protégé: authentifié + organisation APPROVED
     */
    app.get('/posts/mine', {
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg, uploadRateLimit_1.uploadRateLimit],
    }, PostsController.listPosts);
    /**
     * GET /posts/entity - Lister les posts par entité (université ou centre)
     * Public - MUST come BEFORE /posts/:id to avoid being matched by :id parameter
     */
    app.get('/posts/entity', PostsController.listPostsByEntity);
    /**
     * GET /posts - Lister les posts (public)
     */
    app.get('/posts', PostsController.listPosts);
    /**
     * GET /posts/:id - Récupérer un post
     * Public
     */
    app.get('/posts/:id', PostsController.getPost);
    /**
     * POST /uploads - upload a file to Supabase Storage (server-side)
     * Protected: authenticated + organisation APPROVED
     * Expects multipart/form-data with field `file`.
     */
    app.post('/uploads', {
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg],
    }, PostsController.uploadFile);
    app.get('/uploads/jobs/:id', {
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg],
    }, PostsController.getUploadJob);
    /**
     * POST /signed-url - Create a temporary signed URL for a storage object
     * Protected: authenticated + organisation APPROVED
     * Body: { bucket, path, expires }
     */
    app.post('/signed-url', {
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg],
    }, PostsController.createSignedUrl);
    /**
     * PUT /posts/:id - Modifier un post
     * Protégé: authentifié + organisation APPROVED + propriétaire
     */
    app.put('/posts/:id', {
        schema: posts_schema_1.updatePostSchema,
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg],
    }, PostsController.updatePost);
    /**
     * DELETE /posts/:id - Supprimer un post
     * Protégé: authentifié + organisation APPROVED + propriétaire
     */
    app.delete('/posts/:id', {
        preHandler: [middleware_1.authenticate, middleware_1.authorizeOrg],
    }, PostsController.deletePost);
    /**
     * POST /posts/:id/comments - Ajouter un commentaire (auth required)
     */
    app.post('/posts/:id/comments', {
        schema: posts_schema_1.createCommentSchema,
        preHandler: [middleware_1.authenticate],
    }, PostsController.createComment);
    /**
     * GET /posts/:id/comments - Lister les commentaires d'un post
     * Public
     */
    app.get('/posts/:id/comments', PostsController.listComments);
};
exports.postsRoutes = postsRoutes;
//# sourceMappingURL=posts.routes.js.map