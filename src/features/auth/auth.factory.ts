import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRoutes } from './auth.routes.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { TokenService } from './services/TokenService.js';
import { PasswordService } from './services/PasswordService.js';
import { EmailService, ConsoleEmailProvider } from './services/EmailService.js';
import { CookieService } from './services/CookieService.js';
import { SecuritySettings } from './auth.types.js';

export class AuthFactory {
  private static instance: AuthFactory;
  private authService?: AuthService;
  private authController?: AuthController;
  private authMiddleware?: AuthMiddleware;
  private authRoutes?: AuthRoutes;
  private tokenService?: TokenService;
  private passwordService?: PasswordService;
  private authRepository?: AuthRepository;
  private cookieService?: CookieService;

  private constructor() {}

  static getInstance(): AuthFactory {
    if (!AuthFactory.instance) {
      AuthFactory.instance = new AuthFactory();
    }
    return AuthFactory.instance;
  }

  createAuthModule(
    db: DatabaseService,
    logger: LoggerService,
    config: {
      accessTokenSecret: string;
      refreshTokenSecret: string;
      frontendUrl: string;
      companyName: string;
      supportEmail: string;
      securitySettings: SecuritySettings;
    }
  ): {
    authService: AuthService;
    authController: AuthController;
    authMiddleware: AuthMiddleware;
    authRoutes: AuthRoutes;
  } {
    // Create repository
    this.authRepository = new AuthRepository(db, logger);

    // Create services
    this.tokenService = new TokenService(db, logger, {
      accessTokenSecret: config.accessTokenSecret,
      refreshTokenSecret: config.refreshTokenSecret,
      securitySettings: config.securitySettings
    });

    this.passwordService = new PasswordService(logger, config.securitySettings);

    const emailProvider = new ConsoleEmailProvider(logger);
    const emailService = new EmailService(
      emailProvider,
      logger,
      {
        frontendUrl: config.frontendUrl,
        companyName: config.companyName,
        supportEmail: config.supportEmail
      }
    );

    // Create cookie service
    this.cookieService = new CookieService(logger, {
      domain: '', // Empty string means no domain restriction (works for localhost)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-origin compatibility
      accessTokenExpiry: config.securitySettings.tokenExpiryTime * 60, // Convert to seconds
      refreshTokenExpiry: config.securitySettings.refreshTokenExpiryTime * 24 * 60 * 60 // Convert to seconds
    });

    // Create auth service
    this.authService = new AuthService(
      this.authRepository,
      this.tokenService,
      this.passwordService,
      emailService,
      this.cookieService,
      logger,
      {
        securitySettings: config.securitySettings,
        frontendUrl: config.frontendUrl,
        companyName: config.companyName,
        supportEmail: config.supportEmail
      }
    );

    // Create controller and middleware
    this.authController = new AuthController(this.authService, logger);
    this.authMiddleware = new AuthMiddleware(this.tokenService, this.cookieService, this.authRepository, logger);

    // Create routes
    this.authRoutes = new AuthRoutes(this.authController, this.authMiddleware);

    return {
      authService: this.authService,
      authController: this.authController,
      authMiddleware: this.authMiddleware,
      authRoutes: this.authRoutes
    };
  }

  getDefaultSecuritySettings(): SecuritySettings {
    return {
      maxLoginAttempts: 5,
      lockoutDuration: 15, // minutes
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      tokenExpiryTime: 15, // minutes
      refreshTokenExpiryTime: 7, // days
      activationTokenExpiry: 24, // hours
      passwordResetTokenExpiry: 1 // hours
    };
  }

  getAuthService(): AuthService | undefined {
    return this.authService;
  }

  getAuthController(): AuthController | undefined {
    return this.authController;
  }

  getAuthMiddleware(): AuthMiddleware | undefined {
    return this.authMiddleware;
  }

  getAuthRoutes(): AuthRoutes | undefined {
    return this.authRoutes;
  }

  getTokenService(): TokenService | undefined {
    return this.tokenService;
  }

  getPasswordService(): PasswordService | undefined {
    return this.passwordService;
  }

  getAuthRepository(): AuthRepository | undefined {
    return this.authRepository;
  }

  getCookieService(): CookieService | undefined {
    return this.cookieService;
  }
}