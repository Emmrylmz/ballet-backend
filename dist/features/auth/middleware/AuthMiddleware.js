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
            try {
                if (!this.cookieService) {
                    this.logger.error("CookieService not initialized in AuthMiddleware");
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
                    return;
                }
                if (!req.cookies || typeof req.cookies !== "object") {
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
                    return;
                }
                const accessToken = this.cookieService.getAccessTokenFromCookies(req);
                if (!accessToken) {
                    this.logger.debug("No access token found in cookies");
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
                    return;
                }
                const tokenPayload = this.tokenService.verifyAccessToken(accessToken);
                if (!tokenPayload) {
                    this.logger.debug("Invalid access token from cookies");
                    const refreshResult = await this.attemptTokenRefresh(req, res);
                    if (!refreshResult || !refreshResult.success) {
                        this.sendUnauthorized(res, AUTH_ERRORS.INVALID_TOKEN);
                        return;
                    }
                    req.user = refreshResult.user;
                    next();
                    return;
                }
                const user = await this.authRepository.findUserById(tokenPayload.sub);
                if (!user || user.status !== "active") {
                    this.logger.warn("User not found or inactive", {
                        userId: tokenPayload.sub,
                    });
                    this.cookieService.clearAllAuthCookies(res);
                    this.sendUnauthorized(res, AUTH_ERRORS.USER_NOT_FOUND);
                    return;
                }
                if (user.status !== "active") {
                    await this.authRepository.logAuthEvent({
                        userId: user.id,
                        email: user.email,
                        action: "permission_denied",
                        ipAddress: this.getClientIp(req),
                        userAgent: req.get("User-Agent") || "Unknown",
                        success: false,
                        failureReason: `User status is ${user.status}`,
                    });
                }
                req.user = {
                    id: user.id,
                    email: user.email,
                    establishments: user.establishments || [],
                };
                const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
                if (refreshToken) {
                    const ipAddress = this.getClientIp(req);
                    const userAgent = req.get("User-Agent") || "Unknown";
                    const tokenHash = this.hashToken(refreshToken);
                    await this.tokenService.updateSessionInfo(tokenHash, ipAddress, userAgent);
                }
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
                this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
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
            const role = await this.authRepository.getRole(req.user.id, establishmentId);
            if (!role) {
                return res.status(403).json({
                    success: false,
                    message: "No access to this establishment",
                    code: "NO_ESTABLISHMENT_ACCESS",
                });
            }
            if (!requiredRoles.includes(role)) {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permission",
                    code: "INSUFFICIENT_PERMISSION",
                });
            }
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
                    const user = await this.authRepository.findUserById(tokenPayload.sub);
                    if (user && user.status === "active") {
                        req.user = {
                            id: user.id,
                            email: user.email,
                            establishments: user.establishments || [],
                        };
                    }
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
    async attemptTokenRefresh(req, res) {
        try {
            const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
            if (!refreshToken) {
                this.logger.debug("No refresh token available for token refresh");
                return { success: false };
            }
            const refreshPayload = await this.tokenService.verifyRefreshToken(refreshToken);
            if (!refreshPayload) {
                this.logger.debug("Invalid refresh token for token refresh");
                this.cookieService.clearAllAuthCookies(res);
                return { success: false };
            }
            const user = await this.authRepository.findUserById(refreshPayload.sub);
            if (!user || user.status !== "active") {
                this.logger.warn("User not found or inactive during token refresh", {
                    userId: refreshPayload.sub,
                });
                this.cookieService.clearAllAuthCookies(res);
                return { success: false };
            }
            const newTokenPair = await this.tokenService.generateTokenPair(user.id, user.email, user.establishments);
            await this.tokenService.revokeRefreshToken(refreshToken);
            this.cookieService.setTokenCookies(res, newTokenPair.accessToken, newTokenPair.refreshToken);
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
        res.status(401).json({
            success: false,
            message,
            code: "UNAUTHORIZED",
        });
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
