import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoggerService } from '../../services/LoggerService.js';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishmentId: string;
        role: string;
        permissions: string[];
    };
}
export declare class AuthController {
    private authService;
    private logger;
    constructor(authService: AuthService, logger: LoggerService);
    login(req: Request, res: Response): Promise<void>;
    register(req: Request, res: Response): Promise<void>;
    activateAccount(req: Request, res: Response): Promise<void>;
    forgotPassword(req: Request, res: Response): Promise<void>;
    resetPassword(req: Request, res: Response): Promise<void>;
    changePassword(req: AuthenticatedRequest, res: Response): Promise<void>;
    refreshToken(req: Request, res: Response): Promise<void>;
    logout(req: AuthenticatedRequest, res: Response): Promise<void>;
    getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    validateToken(req: AuthenticatedRequest, res: Response): Promise<void>;
    getPasswordStrength(req: Request, res: Response): Promise<void>;
    getUserSessions(req: AuthenticatedRequest, res: Response): Promise<void>;
    revokeSession(req: AuthenticatedRequest, res: Response): Promise<void>;
    healthCheck(req: Request, res: Response): Promise<void>;
    private getClientIp;
    private handleAuthError;
}
export {};
