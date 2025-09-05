import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRoutes } from './auth.routes.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { TokenService } from './services/TokenService.js';
import { PasswordService } from './services/PasswordService.js';
import { EmailService, ConsoleEmailProvider } from './services/EmailService.js';
export class AuthFactory {
    static instance;
    authService;
    authController;
    authMiddleware;
    authRoutes;
    constructor() { }
    static getInstance() {
        if (!AuthFactory.instance) {
            AuthFactory.instance = new AuthFactory();
        }
        return AuthFactory.instance;
    }
    createAuthModule(db, logger, config) {
        const authRepository = new AuthRepository(db, logger);
        const tokenService = new TokenService(db, logger, {
            accessTokenSecret: config.accessTokenSecret,
            refreshTokenSecret: config.refreshTokenSecret,
            securitySettings: config.securitySettings
        });
        const passwordService = new PasswordService(logger, config.securitySettings);
        const emailProvider = new ConsoleEmailProvider(logger);
        const emailService = new EmailService(emailProvider, logger, {
            frontendUrl: config.frontendUrl,
            companyName: config.companyName,
            supportEmail: config.supportEmail
        });
        this.authService = new AuthService(authRepository, tokenService, passwordService, emailService, logger, {
            securitySettings: config.securitySettings,
            frontendUrl: config.frontendUrl,
            companyName: config.companyName,
            supportEmail: config.supportEmail
        });
        this.authController = new AuthController(this.authService, logger);
        this.authMiddleware = new AuthMiddleware(tokenService, authRepository, logger);
        this.authRoutes = new AuthRoutes(this.authController, this.authMiddleware);
        return {
            authService: this.authService,
            authController: this.authController,
            authMiddleware: this.authMiddleware,
            authRoutes: this.authRoutes
        };
    }
    getDefaultSecuritySettings() {
        return {
            maxLoginAttempts: 5,
            lockoutDuration: 15,
            passwordMinLength: 8,
            passwordRequireUppercase: true,
            passwordRequireLowercase: true,
            passwordRequireNumbers: true,
            passwordRequireSymbols: true,
            tokenExpiryTime: 15,
            refreshTokenExpiryTime: 7,
            activationTokenExpiry: 24,
            passwordResetTokenExpiry: 1
        };
    }
    getAuthService() {
        return this.authService;
    }
    getAuthController() {
        return this.authController;
    }
    getAuthMiddleware() {
        return this.authMiddleware;
    }
    getAuthRoutes() {
        return this.authRoutes;
    }
}
