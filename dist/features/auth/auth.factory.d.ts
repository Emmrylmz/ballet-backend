import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRoutes } from './auth.routes.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { SecuritySettings } from './auth.types.js';
export declare class AuthFactory {
    private static instance;
    private authService?;
    private authController?;
    private authMiddleware?;
    private authRoutes?;
    private constructor();
    static getInstance(): AuthFactory;
    createAuthModule(db: DatabaseService, logger: LoggerService, config: {
        accessTokenSecret: string;
        refreshTokenSecret: string;
        frontendUrl: string;
        companyName: string;
        supportEmail: string;
        securitySettings: SecuritySettings;
    }): {
        authService: AuthService;
        authController: AuthController;
        authMiddleware: AuthMiddleware;
        authRoutes: AuthRoutes;
    };
    getDefaultSecuritySettings(): SecuritySettings;
    getAuthService(): AuthService | undefined;
    getAuthController(): AuthController | undefined;
    getAuthMiddleware(): AuthMiddleware | undefined;
    getAuthRoutes(): AuthRoutes | undefined;
}
