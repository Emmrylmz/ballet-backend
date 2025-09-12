import { Request, Response, NextFunction } from "express";
import { TokenService } from "../services/TokenService.js";
import { CookieService } from "../services/CookieService.js";
import { AuthRepository } from "../auth.repository.js";
import { LoggerService } from "../../../services/LoggerService.js";
import { UserRole, Establishment } from "../auth.types.js";
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishments: Establishment[] | undefined;
    };
    establishment?: {
        id: string;
        name: string;
        role: string;
        isPrimary: boolean;
        status: string;
    };
}
export declare class AuthMiddleware {
    private tokenService;
    private cookieService;
    private authRepository;
    private logger;
    constructor(tokenService: TokenService, cookieService: CookieService, authRepository: AuthRepository, logger: LoggerService);
    authenticate(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    requireRoles(...roles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    requirePermissions(...permissions: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    requireEstablishmentAccess(requiredRoles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    optional(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    rateLimitByUser(maxRequests?: number, windowMs?: number): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    validateEstablishmentContext(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    logRequest(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
    private attemptTokenRefresh;
    private sendUnauthorized;
    private hashToken;
    private getClientIp;
}
export {};
