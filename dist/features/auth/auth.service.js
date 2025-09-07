import { AuthError, } from "./auth.types.js";
import { AUTH_ERRORS, SUCCESS_MESSAGES, } from "../../constants/errorMessages.js";
export class AuthService {
    authRepository;
    tokenService;
    passwordService;
    emailService;
    cookieService;
    logger;
    securitySettings;
    loginAttempts = new Map();
    constructor(authRepository, tokenService, passwordService, emailService, cookieService, logger, config) {
        this.authRepository = authRepository;
        this.tokenService = tokenService;
        this.passwordService = passwordService;
        this.emailService = emailService;
        this.cookieService = cookieService;
        this.logger = logger;
        this.securitySettings = config.securitySettings;
    }
    async login(loginData, ipAddress, userAgent, res) {
        try {
            const logData = {
                email: loginData.email,
                action: "login_attempt",
                ipAddress,
                userAgent,
                success: false,
                metadata: { rememberMe: loginData.rememberMe },
            };
            await this.logAuthEvent(logData);
            const rateLimitResult = await this.checkRateLimit(loginData.email, ipAddress);
            if (!rateLimitResult.allowed) {
                throw this.createAuthError("TOO_MANY_ATTEMPTS", AUTH_ERRORS.ACCOUNT_LOCKED, 429, { retryAfter: rateLimitResult.retryAfter });
            }
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
                throw this.createAuthError("INVALID_CREDENTIALS", AUTH_ERRORS.INVALID_CREDENTIALS, 401);
            }
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
                throw this.createAuthError("ACCOUNT_SUSPENDED", AUTH_ERRORS.ACCOUNT_DISABLED, 403);
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
                throw this.createAuthError("ACCOUNT_NOT_ACTIVATED", AUTH_ERRORS.EMAIL_NOT_VERIFIED, 403);
            }
            const userWithPassword = await this.getUserWithPassword(user.id);
            if (!userWithPassword) {
                throw this.createAuthError("INVALID_CREDENTIALS", AUTH_ERRORS.INVALID_CREDENTIALS, 401);
            }
            const isPasswordValid = await this.passwordService.verifyPassword(loginData.password, userWithPassword.passwordHash);
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
                throw this.createAuthError("INVALID_CREDENTIALS", AUTH_ERRORS.INVALID_CREDENTIALS, 401);
            }
            const tokenPair = await this.tokenService.generateTokenPair(user.id, user.email, user.establishments);
            await this.authRepository.updateUser(user.id, { lastLogin: new Date() });
            this.loginAttempts.delete(loginData.email);
            await this.logAuthEvent({
                userId: user.id,
                email: loginData.email,
                action: "login_success",
                ipAddress,
                userAgent,
                success: true,
            });
            this.cookieService.setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken);
            const response = {
                user,
                expiresIn: tokenPair.expiresIn,
            };
            return {
                success: true,
                data: response,
                message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            };
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Login failed with unexpected error", {
                error,
                email: loginData.email,
            });
            throw this.createAuthError("LOGIN_FAILED", AUTH_ERRORS.SESSION_EXPIRED, 500);
        }
    }
    async register(registerData) {
        try {
            const emailExists = await this.authRepository.checkEmailExists(registerData.email);
            if (emailExists) {
                throw this.createAuthError("EMAIL_ALREADY_EXISTS", AUTH_ERRORS.EMAIL_ALREADY_EXISTS, 409);
            }
            const passwordValidation = this.passwordService.validatePasswordStrength(registerData.password);
            if (!passwordValidation.isValid) {
                throw this.createAuthError("WEAK_PASSWORD", AUTH_ERRORS.INVALID_PASSWORD_FORMAT, 400, { errors: passwordValidation.errors });
            }
            const passwordHash = await this.passwordService.hashPassword(registerData.password);
            const activationToken = this.tokenService.generateSecureToken(32);
            const expiresAt = new Date(Date.now() +
                this.securitySettings.activationTokenExpiry * 60 * 60 * 1000);
            await this.authRepository.storeRegistrationWithToken(registerData.email, activationToken, {
                passwordHash,
                firstName: registerData.firstName,
                lastName: registerData.lastName,
                ...(registerData.phone && { phone: registerData.phone }),
            }, expiresAt);
            const activationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/activate?token=${activationToken}`;
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
                    message: SUCCESS_MESSAGES.REGISTER_SUCCESS +
                        ". Lütfen hesabınızı aktifleştirmek için e-postanızı kontrol edin.",
                },
            };
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Registration failed with unexpected error", {
                error,
                email: registerData.email,
            });
            throw this.createAuthError("REGISTRATION_FAILED", `Kayıt başarısız oldu: ${error}`, 500);
        }
    }
    async activateAccount(activationData, ipAddress, userAgent, res) {
        try {
            const registrationData = await this.authRepository.findRegistrationByToken(activationData.token);
            if (!registrationData) {
                throw this.createAuthError("INVALID_TOKEN", AUTH_ERRORS.INVALID_TOKEN, 400);
            }
            const existingUser = await this.authRepository.findUserByEmail(registrationData.email);
            if (existingUser) {
                throw this.createAuthError("EMAIL_ALREADY_EXISTS", AUTH_ERRORS.EMAIL_ALREADY_EXISTS, 409);
            }
            const userId = await this.authRepository.createUser({
                email: registrationData.email,
                passwordHash: registrationData.registrationData.passwordHash,
                firstName: registrationData.registrationData.firstName,
                lastName: registrationData.registrationData.lastName,
                ...(registrationData.registrationData.phone && {
                    phone: registrationData.registrationData.phone,
                }),
                status: "active",
            });
            await this.authRepository.markEmailTokenAsUsed(activationData.token);
            await this.authRepository.updateUser(userId, {
                emailVerified: true,
                lastLogin: new Date(),
            });
            const user = await this.authRepository.findUserById(userId);
            if (!user) {
                throw this.createAuthError("USER_CREATION_FAILED", "Kullanıcı oluşturulamadı", 500);
            }
            await this.emailService.sendWelcomeEmail({ firstName: user.firstName, email: user.email }, null);
            const tokenPair = await this.tokenService.generateTokenPair(user.id, user.email, user.establishments);
            await this.logAuthEvent({
                userId: user.id,
                email: user.email,
                action: "account_activation",
                ipAddress,
                userAgent,
                success: true,
            });
            this.cookieService.setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken);
            const response = {
                user,
                expiresIn: tokenPair.expiresIn,
            };
            return {
                success: true,
                data: response,
                message: "Hesap başarıyla aktifleştirildi",
            };
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Account activation failed with unexpected error", {
                error,
                token: activationData.token,
            });
            throw this.createAuthError("ACTIVATION_FAILED", "Hesap aktifleştirme başarısız oldu", 500);
        }
    }
    async forgotPassword(forgotData, ipAddress, userAgent) {
        try {
            const user = await this.authRepository.findUserByEmail(forgotData.email);
            const successMessage = "Bu e-posta adresine sahip bir hesap varsa, şifre sıfırlama talimatlarını alacaksınız.";
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
            const resetToken = this.tokenService.generatePasswordResetToken(user.id, user.email);
            const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;
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
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Forgot password failed with unexpected error", {
                error,
                email: forgotData.email,
            });
            throw this.createAuthError("FORGOT_PASSWORD_FAILED", "Şifre sıfırlama isteği başarısız oldu", 500);
        }
    }
    async resetPassword(resetData, ipAddress, userAgent) {
        try {
            const tokenData = this.tokenService.verifySpecialToken(resetData.token, "password_reset");
            if (!tokenData) {
                throw this.createAuthError("INVALID_TOKEN", AUTH_ERRORS.INVALID_TOKEN, 400);
            }
            const user = await this.authRepository.findUserById(tokenData.sub);
            if (!user) {
                throw this.createAuthError("USER_NOT_FOUND", AUTH_ERRORS.USER_NOT_FOUND, 404);
            }
            const passwordValidation = this.passwordService.validatePasswordStrength(resetData.newPassword);
            if (!passwordValidation.isValid) {
                throw this.createAuthError("WEAK_PASSWORD", AUTH_ERRORS.INVALID_PASSWORD_FORMAT, 400, { errors: passwordValidation.errors });
            }
            const passwordHash = await this.passwordService.hashPassword(resetData.newPassword);
            await this.authRepository.updateUserPassword(user.id, passwordHash);
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
                    message: SUCCESS_MESSAGES.PASSWORD_CHANGED +
                        ". Lütfen yeni şifrenizle giriş yapın.",
                },
            };
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Password reset failed with unexpected error", {
                error,
            });
            throw this.createAuthError("PASSWORD_RESET_FAILED", "Şifre sıfırlama başarısız oldu", 500);
        }
    }
    async changePassword(userId, changeData, ipAddress, userAgent) {
        try {
            const user = await this.authRepository.findUserById(userId);
            if (!user) {
                throw this.createAuthError("USER_NOT_FOUND", AUTH_ERRORS.USER_NOT_FOUND, 404);
            }
            const userWithPassword = await this.getUserWithPassword(userId);
            if (!userWithPassword) {
                throw this.createAuthError("USER_NOT_FOUND", AUTH_ERRORS.USER_NOT_FOUND, 404);
            }
            const isCurrentPasswordValid = await this.passwordService.verifyPassword(changeData.currentPassword, userWithPassword.passwordHash);
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
                throw this.createAuthError("INVALID_PASSWORD", "Mevcut şifre yanlış", 400);
            }
            const passwordValidation = this.passwordService.validatePasswordStrength(changeData.newPassword);
            if (!passwordValidation.isValid) {
                throw this.createAuthError("WEAK_PASSWORD", AUTH_ERRORS.INVALID_PASSWORD_FORMAT, 400, { errors: passwordValidation.errors });
            }
            const newPasswordHash = await this.passwordService.hashPassword(changeData.newPassword);
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
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Password change failed with unexpected error", {
                error,
                userId,
            });
            throw this.createAuthError("PASSWORD_CHANGE_FAILED", "Şifre değiştirme başarısız oldu", 500);
        }
    }
    async refreshToken(req, res, ipAddress, userAgent) {
        try {
            const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
            if (!refreshToken) {
                throw this.createAuthError("REFRESH_TOKEN_REQUIRED", AUTH_ERRORS.REFRESH_TOKEN_REQUIRED, 401);
            }
            const tokenData = await this.tokenService.verifyRefreshToken(refreshToken);
            if (!tokenData) {
                throw this.createAuthError("INVALID_TOKEN", AUTH_ERRORS.INVALID_REFRESH_TOKEN, 401);
            }
            const user = await this.authRepository.findUserById(tokenData.sub);
            if (!user || user.status !== "active") {
                await this.tokenService.revokeRefreshToken(refreshToken);
                throw this.createAuthError("USER_NOT_FOUND", AUTH_ERRORS.USER_NOT_FOUND, 404);
            }
            const newTokenPair = await this.tokenService.generateTokenPair(user.id, user.email, user.establishments);
            await this.tokenService.revokeRefreshToken(refreshToken);
            this.cookieService.setTokenCookies(res, newTokenPair.accessToken, newTokenPair.refreshToken);
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
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Token refresh failed with unexpected error", {
                error,
            });
            throw this.createAuthError("TOKEN_REFRESH_FAILED", "Token yenileme başarısız oldu", 500);
        }
    }
    async logout(userId, req, res, ipAddress, userAgent) {
        try {
            const user = await this.authRepository.findUserById(userId);
            const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
            if (refreshToken) {
                await this.tokenService.revokeRefreshToken(refreshToken);
            }
            this.cookieService.clearAllAuthCookies(res);
            const logData = {
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
        }
        catch (error) {
            this.logger.error("Logout failed with unexpected error", {
                error,
                userId,
            });
            throw this.createAuthError("LOGOUT_FAILED", "Çıkış başarısız oldu", 500);
        }
    }
    async getCurrentUser(userId) {
        try {
            const user = await this.authRepository.findUserById(userId);
            if (!user) {
                throw this.createAuthError("USER_NOT_FOUND", AUTH_ERRORS.USER_NOT_FOUND, 404);
            }
            return {
                success: true,
                data: user,
            };
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            this.logger.error("Get current user failed with unexpected error", {
                error,
                userId,
            });
            throw this.createAuthError("USER_FETCH_FAILED", "Kullanıcı verileri alınamadı", 500);
        }
    }
    async getUserWithPassword(userId) {
        try {
            return await this.authRepository.getUserPasswordHash(userId);
        }
        catch (error) {
            this.logger.error("Failed to get user password", { error, userId });
            return null;
        }
    }
    async checkRateLimit(email, ipAddress) {
        const key = `${email}-${ipAddress}`;
        const now = new Date();
        const attempt = this.loginAttempts.get(key);
        if (!attempt) {
            return { allowed: true };
        }
        const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();
        const lockoutDuration = this.securitySettings.lockoutDuration * 60 * 1000;
        if (attempt.count >= this.securitySettings.maxLoginAttempts) {
            if (timeSinceLastAttempt < lockoutDuration) {
                return {
                    allowed: false,
                    retryAfter: Math.ceil((lockoutDuration - timeSinceLastAttempt) / 1000),
                };
            }
            else {
                this.loginAttempts.delete(key);
                return { allowed: true };
            }
        }
        return { allowed: true };
    }
    async recordFailedAttempt(email, ipAddress) {
        const key = `${email}-${ipAddress}`;
        const now = new Date();
        const attempt = this.loginAttempts.get(key);
        if (attempt) {
            this.loginAttempts.set(key, {
                count: attempt.count + 1,
                lastAttempt: now,
            });
        }
        else {
            this.loginAttempts.set(key, {
                count: 1,
                lastAttempt: now,
            });
        }
    }
    async logAuthEvent(logData) {
        await this.authRepository.logAuthEvent(logData);
    }
    createAuthError(code, message, statusCode, details) {
        return new AuthError(message, code, statusCode, details);
    }
}
