import { FastifyRequest, FastifyReply } from 'fastify';
/**
 * Récupérer le feed complet
 */
export declare const getFeed: (request: FastifyRequest<{
    Querystring: {
        page?: number;
        limit?: number;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Récupérer le feed des universités
 */
export declare const getUniversitesFeed: (request: FastifyRequest<{
    Querystring: {
        page?: number;
        limit?: number;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Récupérer le feed des centres
 */
export declare const getCentresFeed: (request: FastifyRequest<{
    Querystring: {
        page?: number;
        limit?: number;
    };
}>, reply: FastifyReply) => Promise<void>;
/**
 * Récupérer le feed d'une organisation spécifique
 */
export declare const getOrganizationFeed: (request: FastifyRequest<{
    Querystring: {
        organization_id?: string;
        organization_type?: string;
        page?: number;
        limit?: number;
    };
}>, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=feed.controller.d.ts.map