import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DatabaseService } from '../services/DatabaseService.js';
import { LoggerService } from '../services/LoggerService.js';
import { AuthService } from '../features/auth/auth.service.js';
import { AuthController } from '../features/auth/auth.controller.js';
import { AuthRepository } from '../features/auth/auth.repository.js';
import { TokenService } from '../features/auth/services/TokenService.js';
import { PasswordService } from '../features/auth/services/PasswordService.js';
import { EmailService } from '../features/auth/services/EmailService.js';
import { CookieService } from '../features/auth/services/CookieService.js';
import { CookieAuthMiddleware } from '../features/auth/middleware/cookieAuthMiddleware.js';
import { CorsConfigurationService } from '../config/corsConfig.js';
export class SecureCookieAuthApp {
    app;
    logger;
    db;
    corsConfig;
    authService;
    authController;
    cookieService;
    authMiddleware;
    constructor() {
        this.app = express();
        this.logger = new LoggerService();
        this.db = new DatabaseService(this.logger);
        this.corsConfig = new CorsConfigurationService(this.logger);
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    initializeServices() {
        const securitySettings = {
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
            passwordResetTokenExpiry: 2,
        };
        this.cookieService = new CookieService(this.logger, {
            domain: process.env.COOKIE_DOMAIN,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            accessTokenExpiry: securitySettings.tokenExpiryTime * 60,
            refreshTokenExpiry: securitySettings.refreshTokenExpiryTime * 24 * 60 * 60
        });
        const tokenService = new TokenService(this.db, this.logger, {
            accessTokenSecret: process.env.JWT_ACCESS_SECRET,
            refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
            securitySettings
        });
        const authRepository = new AuthRepository(this.db, this.logger);
        const passwordService = new PasswordService(this.logger);
        const emailService = new EmailService(this.logger);
        this.authService = new AuthService(authRepository, tokenService, passwordService, emailService, this.cookieService, this.logger, {
            securitySettings,
            frontendUrl: process.env.FRONTEND_URL,
            companyName: 'Ballet Neli',
            supportEmail: process.env.SUPPORT_EMAIL
        });
        this.authController = new AuthController(this.authService, this.logger);
        this.authMiddleware = new CookieAuthMiddleware(tokenService, this.cookieService, authRepository, this.logger);
        this.logger.info('All authentication services initialized with cookie support');
    }
    setupMiddleware() {
        this.app.use(cookieParser());
        const corsOptions = this.corsConfig.getCorsOptions();
        this.app.use(cors(corsOptions));
        this.app.use(helmet(this.corsConfig.getSecurityHeaders()));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                hasCookies: !!req.cookies && Object.keys(req.cookies).length > 0
            });
            next();
        });
        this.logger.info('Middleware setup complete with cookie support');
        this.corsConfig.logConfiguration();
    }
    setupRoutes() {
        const authRouter = express.Router();
        authRouter.post('/login', this.authController.login.bind(this.authController));
        authRouter.post('/register', this.authController.register.bind(this.authController));
        authRouter.post('/activate', this.authController.activateAccount.bind(this.authController));
        authRouter.post('/forgot-password', this.authController.forgotPassword.bind(this.authController));
        authRouter.post('/reset-password', this.authController.resetPassword.bind(this.authController));
        authRouter.post('/refresh-token', this.authMiddleware.authenticate, this.authController.refreshToken.bind(this.authController));
        authRouter.post('/logout', this.authMiddleware.authenticate, this.authController.logout.bind(this.authController));
        authRouter.get('/me', this.authMiddleware.authenticate, this.authController.getCurrentUser.bind(this.authController));
        authRouter.post('/change-password', this.authMiddleware.authenticate, this.authController.changePassword.bind(this.authController));
        authRouter.get('/sessions', this.authMiddleware.authenticate, this.authController.getUserSessions.bind(this.authController));
        authRouter.get('/admin/users', this.authMiddleware.authenticate, this.authMiddleware.requireRole(['admin', 'manager']), this.handleAdminUsers.bind(this));
        authRouter.get('/instructor/dashboard', this.authMiddleware.authenticate, this.authMiddleware.requireRole('instructor'), this.handleInstructorDashboard.bind(this));
        authRouter.get('/establishment/:establishmentId/data', this.authMiddleware.authenticate, this.authMiddleware.requireEstablishmentAccess(), this.handleEstablishmentData.bind(this));
        this.app.use('/api/auth', authRouter);
        this.app.get('/api/health', this.handleHealthCheck.bind(this));
        this.app.get('/api/debug/cookies', this.handleCookieDebug.bind(this));
        this.logger.info('Routes setup complete with cookie authentication');
    }
    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint bulunamadı',
                code: 'NOT_FOUND'
            });
        });
        this.app.use((error, req, res, next) => {
            this.logger.error('Unhandled error', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method
            });
            if (error.name === 'AuthError' || error.code?.includes('AUTH')) {
                this.cookieService.clearAllAuthCookies(res);
            }
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'İç sunucu hatası',
                code: error.code || 'INTERNAL_ERROR',
                ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
            });
        });
    }
    async handleAdminUsers(req, res) {
        try {
            res.json({
                success: true,
                data: { message: 'Admin users endpoint - secure with cookies!' },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Admin kullanıcıları getirilemedi',
            });
        }
    }
    async handleInstructorDashboard(req, res) {
        try {
            res.json({
                success: true,
                data: { message: 'Instructor dashboard - cookie authenticated!' },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Eğitmen gösterge paneli getirilemedi',
            });
        }
    }
    async handleEstablishmentData(req, res) {
        try {
            const { establishmentId } = req.params;
            res.json({
                success: true,
                data: {
                    message: 'Establishment data - access controlled!',
                    establishmentId
                },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Kurum verileri getirilemedi',
            });
        }
    }
    async handleHealthCheck(req, res) {
        try {
            const cookieConfig = this.cookieService.getConfig();
            const cookieValidation = this.cookieService.validateSecurityConfig();
            const corsValidation = this.corsConfig.validateConfiguration();
            res.json({
                success: true,
                data: {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    security: {
                        cookiesEnabled: true,
                        corsEnabled: true,
                        httpsOnly: cookieConfig.secure,
                        sameSite: cookieConfig.sameSite,
                        validations: {
                            cookies: cookieValidation,
                            cors: corsValidation
                        }
                    }
                },
            });
        }
        catch (error) {
            res.status(503).json({
                success: false,
                message: 'Sağlık kontrolü başarısız',
                error: error instanceof Error ? error.message : 'Bilinmeyen hata'
            });
        }
    }
    async handleCookieDebug(req, res) {
        try {
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({
                    success: false,
                    message: 'Debug endpoint not available in production'
                });
            }
            const cookies = req.cookies;
            const hasAccessToken = !!cookies?.access_token;
            const hasRefreshToken = !!cookies?.refresh_token;
            res.json({
                success: true,
                data: {
                    cookieStructure: {
                        hasCookies: !!cookies,
                        cookieCount: cookies ? Object.keys(cookies).length : 0,
                        hasAccessToken,
                        hasRefreshToken
                    },
                    cookieConfig: this.cookieService.getConfig(),
                    headers: {
                        cookie: req.headers.cookie || null,
                        userAgent: req.headers['user-agent'] || null
                    }
                }
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Cookie debug failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async start(port = 3000) {
        try {
            await this.db.connect();
            const cookieValidation = this.cookieService.validateSecurityConfig();
            const corsValidation = this.corsConfig.validateConfiguration();
            if (!cookieValidation.isValid || !corsValidation.isValid) {
                this.logger.warn('Security configuration warnings detected', {
                    cookieWarnings: cookieValidation.warnings,
                    corsWarnings: corsValidation.warnings
                });
            }
            this.app.listen(port, () => {
                this.logger.info(`🍪 Secure Cookie Auth Server running on port ${port}`, {
                    environment: process.env.NODE_ENV,
                    cookiesSecure: process.env.NODE_ENV === 'production',
                    corsCredentials: true
                });
            });
        }
        catch (error) {
            this.logger.error('Failed to start server', { error });
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
}
export async function startSecureAuthServer() {
    const app = new SecureCookieAuthApp();
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.start(port);
}
export default SecureCookieAuthApp;
