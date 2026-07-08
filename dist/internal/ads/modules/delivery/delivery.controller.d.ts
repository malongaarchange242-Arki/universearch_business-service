import { FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryService } from './delivery.service';
export declare class DeliveryController {
    private deliveryService;
    constructor(deliveryService: DeliveryService);
    private parseRequestedLimit;
    /**
     * Normalise les paramètres de query (supporte plusieurs conventions de nommage)
     * Accepte: userId OU user_id, gender OU user_gender, etc.
     */
    private parseUserProfile;
    getCarousel(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getShorts(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=delivery.controller.d.ts.map