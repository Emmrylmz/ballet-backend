import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRoutes } from './auth.routes.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { TokenService } from './services/TokenService.js';
import { PasswordService } from './services/PasswordService.js';
import { EmailService, ConsoleEmailProvider } from './services/EmailService.js';
import { CookieService } from './services/CookieService.js';
export class AuthFactory {
    static instance;
    authService;
    authController;
    authMiddleware;
    authRoutes;
    tokenService;
    passwordService;
    authRepository;
    cookieService;
    constructor() { }
    static getInstance() {
        if (!AuthFactory.instance) {
            AuthFactory.instance = new AuthFactory();
        }
        return AuthFactory.instance;
    }
    createAuthModule(db, logger, config) {
        this.authRepository = new AuthRepository(db, logger);
        this.tokenService = new TokenService(db, logger, {
            accessTokenSecret: config.accessTokenSecret,
            refreshTokenSecret: config.refreshTokenSecret,
            securitySettings: config.securitySettings
        });
        this.passwordService = new PasswordService(logger, config.securitySettings);
        const emailProvider = new ConsoleEmailProvider(logger);
        const emailService = new EmailService(emailProvider, logger, {
            frontendUrl: config.frontendUrl,
            companyName: config.companyName,
            supportEmail: config.supportEmail
        });
        this.cookieService = new CookieService(logger, {
            domain: process.env.COOKIE_DOMAIN,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            accessTokenExpiry: config.securitySettings.tokenExpiryTime * 60,
            refreshTokenExpiry: config.securitySettings.refreshTokenExpiryTime * 24 * 60 * 60
        });
        this.authService = new AuthService(this.authRepository, this.tokenService, this.passwordService, emailService, this.cookieService, logger, {
            securitySettings: config.securitySettings,
            frontendUrl: config.frontendUrl,
            companyName: config.companyName,
            supportEmail: config.supportEmail
        });
        this.authController = new AuthController(this.authService, logger);
        this.authMiddleware = new AuthMiddleware(this.tokenService, this.cookieService, this.authRepository, logger);
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
    getTokenService() {
        return this.tokenService;
    }
    getPasswordService() {
        return this.passwordService;
    }
    getAuthRepository() {
        return this.authRepository;
    }
    getCookieService() {
        return this.cookieService;
    }
}
