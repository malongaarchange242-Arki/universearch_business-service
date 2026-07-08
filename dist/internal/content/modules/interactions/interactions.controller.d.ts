import { FastifyRequest, FastifyReply } from 'fastify';
import * as InteractionsService from './interactions.service';
export declare const getLikeStatus: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Aimer un post
 */
export declare const likePost: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Retirer un like
 */
export declare const unlikePost: (request: FastifyRequest<{
    Params: {
        id: string;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Commenter un post
 */
export declare const commentPost: (request: FastifyRequest<{
    Params: {
        id: string;
    };
    Body: InteractionsService.CommentPayload;
}>, reply: FastifyReply) => Promise<void>;
/**
 * Récupérer les commentaires
 */
export declare const getComments: (request: FastifyRequest<{
    Params: {
        id: string;
    };
    Querystring: {
        page?: number;
        limit?: number;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Enregistrer une vue
 */
export declare const recordView: (request: FastifyRequest<{
    Params: {
        id: string;
    };
    Body: InteractionsService.ViewPayload;
}>, reply: FastifyReply) => Promise<void>;
/**
 * Récupérer les vues d'un post
 */
export declare const getViews: (request: FastifyRequest<{
    Params: {
        id: string;
    };
    Querystring: {
        page?: number;
        limit?: number;
    };
}>, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=interactions.controller.d.ts.map