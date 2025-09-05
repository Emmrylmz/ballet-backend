import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/TokenService.js';
import { AuthRepository } from '../auth.repository.js';
import { LoggerService } from '../../../services/LoggerService.js';
import { UserRole } from '../auth.types.js';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishmentId: string;
        role: UserRole;
        permissions: string[];
    };
}
export declare class AuthMiddleware {
    private tokenService;
    private authRepository;
    private logger;
    constructor(tokenService: TokenService, authRepository: AuthRepository, logger: LoggerService);
    authenticate(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    requireRoles(...roles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    requirePermissions(...permissions: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    requireEstablishmentAccess(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    optional(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    rateLimitByUser(maxRequests?: number, windowMs?: number): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    validateEstablishmentContext(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    logRequest(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    private extractToken;
    private getClientIp;
}
export {};
