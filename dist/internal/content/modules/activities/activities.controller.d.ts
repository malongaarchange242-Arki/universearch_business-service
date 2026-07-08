import { FastifyReply, FastifyRequest } from 'fastify';
export declare const createActivity: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const listActivities: (request: FastifyRequest<{
    Querystring: {
        organization_id?: string;
        organization_type?: string;
    };
}>, reply: FastifyReply) => Promise<void>;
export declare const getActivity: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const updateActivity: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const deleteActivity: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=activities.controller.d.ts.map