import { FastifyReply, FastifyRequest } from 'fastify';
export declare const getOrganizationViewsTotal: (request: FastifyRequest<{
    Querystring: {
        organization_id?: string;
        organization_type?: string;
    };
}>, reply: FastifyReply) => Promise<void>;
export declare const getOrganizationTopFollowers: (request: FastifyRequest<{
    Querystring: {
        organization_id?: string;
        organization_type?: string;
    };
}>, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=stats.controller.d.ts.map