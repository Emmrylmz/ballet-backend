import { AUTH_ERRORS } from "../../../constants/errorMessages.js";
import crypto from "crypto";
export class AuthMiddleware {
    tokenService;
    cookieService;
    authRepository;
    logger;
    constructor(tokenService, cookieService, authRepository, logger) {
        this.tokenService = tokenService;
        this.cookieService = cookieService;
        this.authRepository = authRepository;
        this.logger = logger;
    }
    authenticate() {
        return async (req, res, next) => {
            const timeoutId = setTimeout(() => {
                if (!res.headersSent) {
                    this.logger.error("Authentication middleware timeout");
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
                }
            }, 10000);
            try {
                if (!this.cookieService) {
                    this.logger.error("CookieService not initialized in AuthMiddleware");
                    clearTimeout(timeoutId);
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
                    return;
                }
                if (!req.cookies || typeof req.cookies !== "object") {
                    clearTimeout(timeoutId);
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
                    return;
                }
                const accessToken = this.cookieService.getAccessTokenFromCookies(req);
                if (!accessToken) {
                    this.logger.debug("No access token found in cookies or Authorization header");
                    clearTimeout(timeoutId);
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
                    return;
                }
                const tokenPayload = this.tokenService.verifyAccessToken(accessToken);
                if (!tokenPayload) {
                    this.logger.debug("Invalid access token from cookies");
                    try {
                        const refreshResult = await Promise.race([
                            this.attemptTokenRefresh(req, res),
                            new Promise((_, reject) => setTimeout(() => reject(new Error("Token refresh timeout")), 8000))
                        ]);
                        if (!refreshResult || !refreshResult.success) {
                            clearTimeout(timeoutId);
                            this.sendUnauthorized(res, AUTH_ERRORS.INVALID_TOKEN);
                            return;
                        }
                        req.user = refreshResult.user;
                        clearTimeout(timeoutId);
                        next();
                        return;
                    }
                    catch (refreshError) {
                        this.logger.error("Token refresh failed", { error: refreshError });
                        clearTimeout(timeoutId);
                        this.sendUnauthorized(res, AUTH_ERRORS.INVALID_TOKEN);
                        return;
                    }
                }
                req.user = {
                    id: tokenPayload.sub,
                    email: tokenPayload.email,
                    establishments: tokenPayload.establishments || [],
                };
                req.establishment =
                    tokenPayload.establishments?.find((est) => est.isPrimary) ||
                        tokenPayload.establishments?.[0];
                const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
                if (refreshToken) {
                    this.updateSessionInfoAsync(refreshToken, req).catch(error => {
                        this.logger.error("Session info update failed", { error });
                    });
                }
                clearTimeout(timeoutId);
                next();
            }
            catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : error
                        ? String(error)
                        : "Unknown error occurred";
                const errorStack = error instanceof Error ? error.stack : undefined;
                this.logger.error("Authentication middleware error", {
                    error: errorMessage,
                    stack: errorStack,
                    originalError: error
                        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
                        : null,
                });
                clearTimeout(timeoutId);
                if (!res.headersSent) {
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
                }
            }
        };
    }
    requireRoles(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
                return;
            }
            next();
        };
    }
    requirePermissions(...permissions) {
        return (req, res, next) => {
            if (!req.user) {
                this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
                return;
            }
            next();
        };
    }
    requireEstablishmentAccess(requiredRoles) {
        return async (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                    code: "AUTH_REQUIRED",
                });
            }
            const establishmentId = req.headers["x-establishment-id"] ||
                req.params.establishmentId ||
                req.query.establishmentId ||
                req.body.establishmentId;
            if (!establishmentId) {
                return res.status(400).json({
                    success: false,
                    message: "Establishment ID required",
                    code: "ESTABLISHMENT_ID_REQUIRED",
                });
            }
            const userEstablishment = req.user.establishments?.find((est) => est.id === establishmentId);
            if (!userEstablishment) {
                return res.status(403).json({
                    success: false,
                    message: "No access to this establishment",
                    code: "NO_ESTABLISHMENT_ACCESS",
                });
            }
            if (!requiredRoles.includes(userEstablishment.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permission",
                    code: "INSUFFICIENT_PERMISSION",
                });
            }
            req.establishment = userEstablishment;
            next();
        };
    }
    optional() {
        return async (req, res, next) => {
            try {
                if (!this.cookieService) {
                    this.logger.error("CookieService not initialized in optional AuthMiddleware");
                    next();
                    return;
                }
                const accessToken = this.cookieService.getAccessTokenFromCookies(req);
                if (!accessToken) {
                    next();
                    return;
                }
                const tokenPayload = this.tokenService.verifyAccessToken(accessToken);
                if (tokenPayload) {
                    req.user = {
                        id: tokenPayload.sub,
                        email: tokenPayload.email,
                        establishments: tokenPayload.establishments || [],
                    };
                    req.establishment =
                        tokenPayload.establishments?.find((est) => est.isPrimary) ||
                            tokenPayload.establishments?.[0];
                }
                next();
            }
            catch (error) {
                this.logger.error("Optional auth middleware error", { error });
                next();
            }
        };
    }
    rateLimitByUser(maxRequests = 10000, windowMs = 15 * 60 * 1000) {
        const requests = new Map();
        return (req, res, next) => {
            const userId = req.user?.id;
            if (!userId) {
                next();
                return;
            }
            const now = Date.now();
            const userKey = userId;
            const userRequests = requests.get(userKey);
            if (!userRequests || now > userRequests.resetTime) {
                requests.set(userKey, {
                    count: 1,
                    resetTime: now + windowMs,
                });
                next();
                return;
            }
            if (userRequests.count >= maxRequests) {
                const resetIn = Math.ceil((userRequests.resetTime - now) / 1000);
                res.status(429).json({
                    success: false,
                    message: "Too many requests",
                    code: "RATE_LIMIT_EXCEEDED",
                    details: {
                        retryAfter: resetIn,
                    },
                });
                return;
            }
            userRequests.count++;
            next();
        };
    }
    validateEstablishmentContext() {
        return async (req, res, next) => {
            if (!req.user) {
                this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
                return;
            }
            try {
                next();
            }
            catch (error) {
                this.logger.error("Establishment validation error", {
                    error,
                    userId: req.user.id,
                });
                res.status(500).json({
                    success: false,
                    message: "Establishment validation failed",
                    code: "ESTABLISHMENT_VALIDATION_ERROR",
                });
            }
        };
    }
    logRequest() {
        return (req, res, next) => {
            const startTime = Date.now();
            this.logger.info("API Request", {
                method: req.method,
                url: req.url,
                userAgent: req.get("User-Agent"),
                ip: this.getClientIp(req),
                userId: req.user?.id,
            });
            res.on("finish", () => {
                const duration = Date.now() - startTime;
                this.logger.info("API Response", {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    userId: req.user?.id,
                });
            });
            next();
        };
    }
    async updateSessionInfoAsync(refreshToken, req) {
        try {
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get("User-Agent") || "Unknown";
            const tokenHash = this.hashToken(refreshToken);
            await Promise.race([
                this.tokenService.updateSessionInfo(tokenHash, ipAddress, userAgent),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Session update timeout")), 5000))
            ]);
        }
        catch (error) {
            this.logger.error("Session info background update failed", { error });
        }
    }
    async attemptTokenRefresh(req, res) {
        try {
            const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
            if (!refreshToken) {
                this.logger.debug("No refresh token available for token refresh");
                return { success: false };
            }
            const refreshPayload = await Promise.race([
                this.tokenService.verifyRefreshToken(refreshToken),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Refresh token verification timeout")), 3000))
            ]);
            if (!refreshPayload) {
                this.logger.debug("Invalid refresh token for token refresh");
                try {
                    this.cookieService.clearAllAuthCookies(res);
                }
                catch (clearError) {
                    this.logger.error("Failed to clear cookies", { clearError });
                }
                return { success: false };
            }
            const user = await Promise.race([
                this.authRepository.findUserById(refreshPayload.sub),
                new Promise((_, reject) => setTimeout(() => reject(new Error("User lookup timeout")), 3000))
            ]);
            if (!user || user.status !== "active") {
                this.logger.warn("User not found or inactive during token refresh", {
                    userId: refreshPayload.sub,
                });
                try {
                    this.cookieService.clearAllAuthCookies(res);
                }
                catch (clearError) {
                    this.logger.error("Failed to clear cookies", { clearError });
                }
                return { success: false };
            }
            const newTokenPair = await Promise.race([
                this.tokenService.generateTokenPair(user.id, user.email, user.establishments),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Token generation timeout")), 3000))
            ]);
            this.tokenService.revokeRefreshToken(refreshToken).catch(error => {
                this.logger.error("Failed to revoke old refresh token", { error });
            });
            try {
                this.cookieService.setTokenCookies(res, newTokenPair.accessToken, newTokenPair.refreshToken);
            }
            catch (cookieError) {
                this.logger.error("Failed to set new token cookies", { cookieError });
                return { success: false };
            }
            this.logger.info("Token refreshed successfully via middleware", {
                userId: user.id,
            });
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    establishments: user.establishments || [],
                },
            };
        }
        catch (error) {
            this.logger.error("Token refresh failed in middleware", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            try {
                this.cookieService.clearAllAuthCookies(res);
            }
            catch (clearError) {
                this.logger.error("Failed to clear cookies during token refresh error", {
                    clearError: clearError instanceof Error
                        ? clearError.message
                        : String(clearError),
                });
            }
            return { success: false };
        }
    }
    sendUnauthorized(res, message) {
        try {
            if (!res.headersSent) {
                res.status(401).json({
                    success: false,
                    message,
                    code: "UNAUTHORIZED",
                });
            }
        }
        catch (error) {
            this.logger.error("Failed to send unauthorized response", { error });
        }
    }
    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    }
    getClientIp(req) {
        return (req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            "unknown");
    }
}
