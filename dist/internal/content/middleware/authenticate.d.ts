import { FastifyRequest, FastifyReply } from 'fastify';
export declare const resolveAuthenticatedUser: (request: FastifyRequest) => Promise<{
    id: string;
    role: string;
    email?: string;
} | null>;
export declare const authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=authenticate.d.ts.map