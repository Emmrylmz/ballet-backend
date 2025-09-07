import { Request, Response, NextFunction } from "express";
import { TokenService } from "../services/TokenService.js";
import { CookieService } from "../services/CookieService.js";
import { AuthRepository } from "../auth.repository.js";
import { LoggerService } from "../../../services/LoggerService.js";
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishments: any[];
    };
}
export declare class CookieAuthMiddleware {
    private tokenService;
    private cookieService;
    private authRepository;
    private logger;
    constructor(tokenService: TokenService, cookieService: CookieService, authRepository: AuthRepository, logger: LoggerService);
    authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    optionalAuthenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    private attemptTokenRefresh;
    private sendUnauthorized;
    private getClientIp;
    private hashToken;
    requireRole: (allowedRoles: string | string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    requireEstablishmentAccess: () => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
export {};
