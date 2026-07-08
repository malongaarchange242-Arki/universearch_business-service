import { FastifyRequest, FastifyReply } from 'fastify';
/**
 * Middleware pour vérifier qu'un utilisateur est un organisation APPROVED
 * (universite ou centre_formation avec statut APPROVED)
 */
export declare const authorizeOrg: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=authorizeOrg.d.ts.map