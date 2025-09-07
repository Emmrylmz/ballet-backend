import { Response, Request } from "express";
import { LoggerService } from "../../services/LoggerService.js";
import { AuthRepository } from "./auth.repository.js";
import { TokenService } from "./services/TokenService.js";
import { PasswordService } from "./services/PasswordService.js";
import { EmailService } from "./services/EmailService.js";
import { CookieService } from "./services/CookieService.js";
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ActivateAccountRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  UserRole,
  UserStatus,
  SecuritySettings,
  AuthResponse,
  AuthError,
} from "./auth.types.js";
import {
  AUTH_ERRORS,
  SUCCESS_MESSAGES,
} from "../../constants/errorMessages.js";

export class AuthService {
  private readonly securitySettings: SecuritySettings;
  private readonly loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  constructor(
    private authRepository: AuthRepository,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private emailService: EmailService,
    private cookieService: CookieService,
    private logger: LoggerService,
    config: {
      securitySettings: SecuritySettings;
      frontendUrl: string;
      companyName: string;
      supportEmail: string;
    }
  ) {
    this.securitySettings = config.securitySettings;
  }

  async login(
    loginData: LoginRequest,
    ipAddress: string,
    userAgent: string,
    res: Response
  ): Promise<AuthResponse<LoginResponse>> {
    try {
      const logData: any = {
        email: loginData.email,
        action: "login_attempt",
        ipAddress,
        userAgent,
        success: false,
        metadata: { rememberMe: loginData.rememberMe },
      };
      await this.logAuthEvent(logData);

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(
        loginData.email,
        ipAddress
      );
      if (!rateLimitResult.allowed) {
        throw this.createAuthError(
          "TOO_MANY_ATTEMPTS",
          AUTH_ERRORS.ACCOUNT_LOCKED,
          429,
          { retryAfter: rateLimitResult.retryAfter }
        );
      }

      // Find user
      const user = await this.authRepository.findUserByEmail(loginData.email);
      if (!user) {
        await this.recordFailedAttempt(loginData.email, ipAddress);
        await this.logAuthEvent({
          email: loginData.email,
          action: "login_failure",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "User not found",
        });

        throw this.createAuthError(
          "INVALID_CREDENTIALS",
          AUTH_ERRORS.INVALID_CREDENTIALS,
          401
        );
      }

      // Check user status
      if (user.status === "suspended") {
        await this.logAuthEvent({
          userId: user.id,
          email: loginData.email,
          action: "login_failure",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Account suspended",
        });

        throw this.createAuthError(
          "ACCOUNT_SUSPENDED",
          AUTH_ERRORS.ACCOUNT_DISABLED,
          403
        );
      }

      if (user.status === "pending") {
        await this.logAuthEvent({
          userId: user.id,
          email: loginData.email,
          action: "login_failure",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Account not activated",
        });

        throw this.createAuthError(
          "ACCOUNT_NOT_ACTIVATED",
          AUTH_ERRORS.EMAIL_NOT_VERIFIED,
          403
        );
      }

      // Get password hash from database
      const userWithPassword = await this.getUserWithPassword(user.id);
      if (!userWithPassword) {
        throw this.createAuthError(
          "INVALID_CREDENTIALS",
          AUTH_ERRORS.INVALID_CREDENTIALS,
          401
        );
      }

      // Verify password
      const isPasswordValid = await this.passwordService.verifyPassword(
        loginData.password,
        userWithPassword.passwordHash
      );

      if (!isPasswordValid) {
        await this.recordFailedAttempt(loginData.email, ipAddress);
        await this.logAuthEvent({
          userId: user.id,
          email: loginData.email,
          action: "login_failure",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Invalid password",
        });

        throw this.createAuthError(
          "INVALID_CREDENTIALS",
          AUTH_ERRORS.INVALID_CREDENTIALS,
          401
        );
      }

      // Generate tokens
      const tokenPair = await this.tokenService.generateTokenPair(
        user.id,
        user.email,
        user.establishments
      );

      // Update last login
      await this.authRepository.updateUser(user.id, { lastLogin: new Date() });

      // Clear failed attempts
      this.loginAttempts.delete(loginData.email);

      await this.logAuthEvent({
        userId: user.id,
        email: loginData.email,
        action: "login_success",
        ipAddress,
        userAgent,
        success: true,
      });

      // Set HTTP-only cookies instead of returning tokens
      this.cookieService.setTokenCookies(
        res,
        tokenPair.accessToken,
        tokenPair.refreshToken
      );

      const response: LoginResponse = {
        user,
        expiresIn: tokenPair.expiresIn,
      };

      return {
        success: true,
        data: response,
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Login failed with unexpected error", {
        error,
        email: loginData.email,
      });
      throw this.createAuthError(
        "LOGIN_FAILED",
        AUTH_ERRORS.SESSION_EXPIRED,
        500
      );
    }
  }

  async register(
    registerData: RegisterRequest
  ): Promise<AuthResponse<{ message: string }>> {
    try {
      // Check if email already exists in users table or pending registrations
      const emailExists = await this.authRepository.checkEmailExists(
        registerData.email
      );

      if (emailExists) {
        throw this.createAuthError(
          "EMAIL_ALREADY_EXISTS",
          AUTH_ERRORS.EMAIL_ALREADY_EXISTS,
          409
        );
      }

      // Validate password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(
        registerData.password
      );
      if (!passwordValidation.isValid) {
        throw this.createAuthError(
          "WEAK_PASSWORD",
          AUTH_ERRORS.INVALID_PASSWORD_FORMAT,
          400,
          { errors: passwordValidation.errors }
        );
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(
        registerData.password
      );

      // Generate activation token
      const activationToken = this.tokenService.generateSecureToken(32);
      const expiresAt = new Date(
        Date.now() +
          this.securitySettings.activationTokenExpiry * 60 * 60 * 1000
      );

      // Store registration data with activation token (user not created yet)
      await this.authRepository.storeRegistrationWithToken(
        registerData.email,
        activationToken,
        {
          passwordHash,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          ...(registerData.phone && { phone: registerData.phone }),
        },
        expiresAt
      );

      // Send activation email
      const activationUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/auth/activate?token=${activationToken}`;

      await this.emailService.sendActivationEmail({
        user: {
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          email: registerData.email,
        },
        activationUrl,
        invitedBy: undefined,
        expiresIn: `${this.securitySettings.activationTokenExpiry} hours`,
      });

      this.logger.info("Registration initiated, activation email sent", {
        email: registerData.email,
      });

      return {
        success: true,
        data: {
          message:
            SUCCESS_MESSAGES.REGISTER_SUCCESS +
            ". Lütfen hesabınızı aktifleştirmek için e-postanızı kontrol edin.",
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Registration failed with unexpected error", {
        error,
        email: registerData.email,
      });
      throw this.createAuthError(
        "REGISTRATION_FAILED",
        `Kayıt başarısız oldu: ${error}`,
        500
      );
    }
  }

  async activateAccount(
    activationData: ActivateAccountRequest,
    ipAddress: string,
    userAgent: string,
    res: Response
  ): Promise<AuthResponse<LoginResponse>> {
    try {
      // Find registration data by activation token
      const registrationData =
        await this.authRepository.findRegistrationByToken(activationData.token);
      if (!registrationData) {
        throw this.createAuthError(
          "INVALID_TOKEN",
          AUTH_ERRORS.INVALID_TOKEN,
          400
        );
      }

      // Check if user already exists (email might have been registered elsewhere)
      const existingUser = await this.authRepository.findUserByEmail(
        registrationData.email
      );
      if (existingUser) {
        throw this.createAuthError(
          "EMAIL_ALREADY_EXISTS",
          AUTH_ERRORS.EMAIL_ALREADY_EXISTS,
          409
        );
      }

      // Create the user now that email is verified
      const userId = await this.authRepository.createUser({
        email: registrationData.email,
        passwordHash: registrationData.registrationData.passwordHash,
        firstName: registrationData.registrationData.firstName,
        lastName: registrationData.registrationData.lastName,
        ...(registrationData.registrationData.phone && {
          phone: registrationData.registrationData.phone,
        }),
        status: "active", // User is immediately active after email verification
      });

      // Mark the activation token as used
      await this.authRepository.markEmailTokenAsUsed(activationData.token);

      // Update user to be email verified and set last login
      await this.authRepository.updateUser(userId, {
        emailVerified: true,
        lastLogin: new Date(),
      });

      // Get the created user with all data
      const user = await this.authRepository.findUserById(userId);
      if (!user) {
        throw this.createAuthError(
          "USER_CREATION_FAILED",
          "Kullanıcı oluşturulamadı",
          500
        );
      }

      // Send welcome email
      await this.emailService.sendWelcomeEmail(
        { firstName: user.firstName, email: user.email },
        null // No establishment yet
      );

      // Generate tokens (user has no role/establishment yet, so empty permissions)
      const tokenPair = await this.tokenService.generateTokenPair(
        user.id,
        user.email,
        user.establishments
      );

      await this.logAuthEvent({
        userId: user.id,
        email: user.email,
        action: "account_activation",
        ipAddress,
        userAgent,
        success: true,
      });

      // Set HTTP-only cookies
      this.cookieService.setTokenCookies(
        res,
        tokenPair.accessToken,
        tokenPair.refreshToken
      );

      const response: LoginResponse = {
        user,
        expiresIn: tokenPair.expiresIn,
      };

      return {
        success: true,
        data: response,
        message: "Hesap başarıyla aktifleştirildi",
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Account activation failed with unexpected error", {
        error,
        token: activationData.token,
      });
      throw this.createAuthError(
        "ACTIVATION_FAILED",
        "Hesap aktifleştirme başarısız oldu",
        500
      );
    }
  }

  async forgotPassword(
    forgotData: ForgotPasswordRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResponse<{ message: string }>> {
    try {
      // Find user
      const user = await this.authRepository.findUserByEmail(forgotData.email);

      // Always return success to prevent email enumeration attacks
      const successMessage =
        "Bu e-posta adresine sahip bir hesap varsa, şifre sıfırlama talimatlarını alacaksınız.";

      if (!user) {
        await this.logAuthEvent({
          email: forgotData.email,
          action: "password_reset_request",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "User not found",
        });

        return {
          success: true,
          data: { message: successMessage },
        };
      }

      if (user.status !== "active") {
        await this.logAuthEvent({
          userId: user.id,
          email: forgotData.email,
          action: "password_reset_request",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Account not active",
        });

        return {
          success: true,
          data: { message: successMessage },
        };
      }

      // Generate password reset token
      const resetToken = this.tokenService.generatePasswordResetToken(
        user.id,
        user.email
      );

      // Send password reset email
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/auth/reset-password?token=${resetToken}`;
      this.logger.info(resetUrl);
      console.log(resetUrl);
      await this.emailService.sendPasswordResetEmail({
        user: {
          firstName: user.firstName,
          email: user.email,
        },

        resetUrl,
        expiresIn: `${this.securitySettings.passwordResetTokenExpiry} hours`,
      });

      await this.logAuthEvent({
        userId: user.id,
        email: user.email,
        action: "password_reset_request",
        ipAddress,
        userAgent,
        success: true,
      });

      return {
        success: true,
        data: { message: successMessage },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Forgot password failed with unexpected error", {
        error,
        email: forgotData.email,
      });
      throw this.createAuthError(
        "FORGOT_PASSWORD_FAILED",
        "Şifre sıfırlama isteği başarısız oldu",
        500
      );
    }
  }

  async resetPassword(
    resetData: ResetPasswordRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResponse<{ message: string }>> {
    try {
      // Verify reset token
      const tokenData = this.tokenService.verifySpecialToken(
        resetData.token,
        "password_reset"
      );
      if (!tokenData) {
        throw this.createAuthError(
          "INVALID_TOKEN",
          AUTH_ERRORS.INVALID_TOKEN,
          400
        );
      }

      // Find user
      const user = await this.authRepository.findUserById(tokenData.sub);
      if (!user) {
        throw this.createAuthError(
          "USER_NOT_FOUND",
          AUTH_ERRORS.USER_NOT_FOUND,
          404
        );
      }

      // Validate new password
      const passwordValidation = this.passwordService.validatePasswordStrength(
        resetData.newPassword
      );
      if (!passwordValidation.isValid) {
        throw this.createAuthError(
          "WEAK_PASSWORD",
          AUTH_ERRORS.INVALID_PASSWORD_FORMAT,
          400,
          { errors: passwordValidation.errors }
        );
      }

      // Hash new password
      const passwordHash = await this.passwordService.hashPassword(
        resetData.newPassword
      );

      // Update password
      await this.authRepository.updateUserPassword(user.id, passwordHash);

      // Revoke all existing tokens for security
      await this.tokenService.revokeAllUserTokens(user.id);

      await this.logAuthEvent({
        userId: user.id,
        email: user.email,
        action: "password_reset_success",
        ipAddress,
        userAgent,
        success: true,
      });

      return {
        success: true,
        data: {
          message:
            SUCCESS_MESSAGES.PASSWORD_CHANGED +
            ". Lütfen yeni şifrenizle giriş yapın.",
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Password reset failed with unexpected error", {
        error,
      });
      throw this.createAuthError(
        "PASSWORD_RESET_FAILED",
        "Şifre sıfırlama başarısız oldu",
        500
      );
    }
  }

  async changePassword(
    userId: string,
    changeData: ChangePasswordRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResponse<{ message: string }>> {
    try {
      // Find user
      const user = await this.authRepository.findUserById(userId);
      if (!user) {
        throw this.createAuthError(
          "USER_NOT_FOUND",
          AUTH_ERRORS.USER_NOT_FOUND,
          404
        );
      }

      // Get current password hash
      const userWithPassword = await this.getUserWithPassword(userId);
      if (!userWithPassword) {
        throw this.createAuthError(
          "USER_NOT_FOUND",
          AUTH_ERRORS.USER_NOT_FOUND,
          404
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.verifyPassword(
        changeData.currentPassword,
        userWithPassword.passwordHash
      );

      if (!isCurrentPasswordValid) {
        await this.logAuthEvent({
          userId,
          email: user.email,
          action: "password_change",
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Invalid current password",
        });

        throw this.createAuthError(
          "INVALID_PASSWORD",
          "Mevcut şifre yanlış",
          400
        );
      }

      // Validate new password
      const passwordValidation = this.passwordService.validatePasswordStrength(
        changeData.newPassword
      );
      if (!passwordValidation.isValid) {
        throw this.createAuthError(
          "WEAK_PASSWORD",
          AUTH_ERRORS.INVALID_PASSWORD_FORMAT,
          400,
          { errors: passwordValidation.errors }
        );
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hashPassword(
        changeData.newPassword
      );

      // Update password
      await this.authRepository.updateUserPassword(userId, newPasswordHash);

      await this.logAuthEvent({
        userId,
        email: user.email,
        action: "password_change",
        ipAddress,
        userAgent,
        success: true,
      });

      return {
        success: true,
        data: { message: SUCCESS_MESSAGES.PASSWORD_CHANGED },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Password change failed with unexpected error", {
        error,
        userId,
      });
      throw this.createAuthError(
        "PASSWORD_CHANGE_FAILED",
        "Şifre değiştirme başarısız oldu",
        500
      );
    }
  }

  async refreshToken(
    req: Request,
    res: Response,
    ipAddress: string,
    userAgent: string
  ): Promise<
    AuthResponse<{
      expiresIn: number;
    }>
  > {
    try {
      // Get refresh token from cookies
      const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
      if (!refreshToken) {
        throw this.createAuthError(
          "REFRESH_TOKEN_REQUIRED",
          AUTH_ERRORS.REFRESH_TOKEN_REQUIRED,
          401
        );
      }

      // Verify refresh token
      const tokenData = await this.tokenService.verifyRefreshToken(
        refreshToken
      );
      if (!tokenData) {
        throw this.createAuthError(
          "INVALID_TOKEN",
          AUTH_ERRORS.INVALID_REFRESH_TOKEN,
          401
        );
      }

      // Find user
      const user = await this.authRepository.findUserById(tokenData.sub);
      if (!user || user.status !== "active") {
        await this.tokenService.revokeRefreshToken(refreshToken);
        throw this.createAuthError(
          "USER_NOT_FOUND",
          AUTH_ERRORS.USER_NOT_FOUND,
          404
        );
      }

      // Generate new token pair
      const newTokenPair = await this.tokenService.generateTokenPair(
        user.id,
        user.email,
        user.establishments
      );

      // Revoke old refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);

      // Set new HTTP-only cookies
      this.cookieService.setTokenCookies(
        res,
        newTokenPair.accessToken,
        newTokenPair.refreshToken
      );

      await this.logAuthEvent({
        userId: user.id,
        email: user.email,
        action: "token_refresh",
        ipAddress,
        userAgent,
        success: true,
      });

      return {
        success: true,
        data: {
          expiresIn: newTokenPair.expiresIn,
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Token refresh failed with unexpected error", {
        error,
      });
      throw this.createAuthError(
        "TOKEN_REFRESH_FAILED",
        "Token yenileme başarısız oldu",
        500
      );
    }
  }

  async logout(
    userId: string,
    req: Request,
    res: Response,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResponse<{ message: string }>> {
    try {
      const user = await this.authRepository.findUserById(userId);

      // Get refresh token from cookies and revoke it
      const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
      if (refreshToken) {
        await this.tokenService.revokeRefreshToken(refreshToken);
      }

      // Clear all authentication cookies
      this.cookieService.clearAllAuthCookies(res);

      const logData: any = {
        userId,
        email: user?.email || "unknown",
        action: "logout",
        ipAddress,
        userAgent,
        success: true,
      };
      if (user && user.establishments && user.establishments?.length > 0) {
        logData.establishmentId = user.establishments;
      }
      await this.logAuthEvent(logData);

      return {
        success: true,
        data: { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS },
      };
    } catch (error) {
      this.logger.error("Logout failed with unexpected error", {
        error,
        userId,
      });
      throw this.createAuthError("LOGOUT_FAILED", "Çıkış başarısız oldu", 500);
    }
  }

  async getCurrentUser(userId: string): Promise<AuthResponse<AuthUser>> {
    try {
      const user = await this.authRepository.findUserById(userId);
      if (!user) {
        throw this.createAuthError(
          "USER_NOT_FOUND",
          AUTH_ERRORS.USER_NOT_FOUND,
          404
        );
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      this.logger.error("Get current user failed with unexpected error", {
        error,
        userId,
      });
      throw this.createAuthError(
        "USER_FETCH_FAILED",
        "Kullanıcı verileri alınamadı",
        500
      );
    }
  }

  // Helper methods
  private async getUserWithPassword(
    userId: string
  ): Promise<{ passwordHash: string } | null> {
    try {
      return await this.authRepository.getUserPasswordHash(userId);
    } catch (error) {
      this.logger.error("Failed to get user password", { error, userId });
      return null;
    }
  }

  private async checkRateLimit(
    email: string,
    ipAddress: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `${email}-${ipAddress}`;
    const now = new Date();
    const attempt = this.loginAttempts.get(key);

    if (!attempt) {
      return { allowed: true };
    }

    const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();
    const lockoutDuration = this.securitySettings.lockoutDuration * 60 * 1000; // Convert to milliseconds

    if (attempt.count >= this.securitySettings.maxLoginAttempts) {
      if (timeSinceLastAttempt < lockoutDuration) {
        return {
          allowed: false,
          retryAfter: Math.ceil(
            (lockoutDuration - timeSinceLastAttempt) / 1000
          ),
        };
      } else {
        // Reset attempts after lockout period
        this.loginAttempts.delete(key);
        return { allowed: true };
      }
    }

    return { allowed: true };
  }

  private async recordFailedAttempt(
    email: string,
    ipAddress: string
  ): Promise<void> {
    const key = `${email}-${ipAddress}`;
    const now = new Date();
    const attempt = this.loginAttempts.get(key);

    if (attempt) {
      this.loginAttempts.set(key, {
        count: attempt.count + 1,
        lastAttempt: now,
      });
    } else {
      this.loginAttempts.set(key, {
        count: 1,
        lastAttempt: now,
      });
    }
  }

  private async logAuthEvent(logData: {
    userId?: string;
    email: string;
    action: any;
    ipAddress: string;
    userAgent: string;
    establishmentId?: string;
    success: boolean;
    failureReason?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.authRepository.logAuthEvent(logData);
  }

  private createAuthError(
    code: string,
    message: string,
    statusCode: number,
    details?: any
  ): AuthError {
    return new AuthError(message, code, statusCode, details);
  }
}
