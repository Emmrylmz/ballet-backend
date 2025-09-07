import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/LoggerService.js';
import { DatabaseService } from '../services/DatabaseService.js';
interface Establishment {
    id: string;
    name: string;
    role: string;
}
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishments?: Establishment[];
    };
    establishment?: {
        id: string;
        name: string;
        userRole: string;
    };
}
export declare class EstablishmentMiddleware {
    private logger;
    private db?;
    constructor(logger: LoggerService, db?: DatabaseService | undefined);
    extractEstablishment(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    validateEstablishmentAccess(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    private isValidUUID;
}
export {};
