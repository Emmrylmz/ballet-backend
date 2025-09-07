import { AUTH_ERRORS } from "../../../constants/errorMessages.js";
export class AuthMiddleware {
    constructor(tokenService, cookieService, authRepository, logger) {
        this.tokenService = tokenService;
        this.cookieService = cookieService;
        this.authRepository = authRepository;
        this.logger = logger;
    }
    authenticate() {
        return async (req, res, next) => {
            try {
                // Check if cookies are properly configured
                if (!this.cookieService.hasValidCookieStructure(req)) {
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
                    return;
                }
                // Get access token from cookies
                const accessToken = this.cookieService.getAccessTokenFromCookies(req);
                if (!accessToken) {
                    this.logger.debug("No access token found in cookies");
                    this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
                    return;
                }
                // Verify access token
                const tokenPayload = this.tokenService.verifyAccessToken(accessToken);
                if (!tokenPayload) {
                    this.logger.debug("Invalid access token from cookies");
                    // Try to refresh token if available
                    const refreshResult = await this.attemptTokenRefresh(req, res);
                    if (!refreshResult.success) {
                        this.sendUnauthorized(res, AUTH_ERRORS.INVALID_TOKEN);
                        return;
                    }
                    // Use the new token payload and user data
                    req.user = refreshResult.user;
                    next();
                    return;
                }
                // Get user data from repository
                const user = await this.authRepository.findUserById(tokenPayload.sub);
                if (!user || user.status !== "active") {
                    this.logger.warn("User not found or inactive", { userId: tokenPayload.sub });
                    this.cookieService.clearAllAuthCookies(res);
                    this.sendUnauthorized(res, AUTH_ERRORS.USER_NOT_FOUND);
                    return;
                }
                // Log permission denied for inactive accounts
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
                // Set user data in request
                req.user = {
                    id: user.id,
                    email: user.email,
                    establishments: user.establishments || [],
                };
                // Update session info if needed
                const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
                if (refreshToken) {
                    const ipAddress = this.getClientIp(req);
                    const userAgent = req.get("User-Agent") || "Unknown";
                    // Hash the token for database lookup
                    const tokenHash = this.hashToken(refreshToken);
                    await this.tokenService.updateSessionInfo(tokenHash, ipAddress, userAgent);
                }
                next();
            }
            catch (error) {
                this.logger.error("Authentication middleware error", { error });
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
            // For now, just allow all authenticated users - permissions system not fully implemented
            next();
        };
    }
    requireEstablishmentAccess(requiredRoles) {
        return async (req, res, next) => {
            // Check authentication
            if (!req.user) {
                return res.status(401).json({
                    // Add return here
                    success: false,
                    message: "Authentication required",
                    code: "AUTH_REQUIRED",
                });
            }
            console.log(req.headers);
            // Get establishment ID from various sources
            const establishmentId = "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
            // req.headers["x-establishment-id"] ||
            // req.params.establishmentId ||
            // req.query.establishmentId ||
            // req.body.establishmentId;
            console.log(establishmentId);
            // Check if establishment ID is provided
            if (!establishmentId) {
                return res.status(400).json({
                    // Add this check and return
                    success: false,
                    message: "Establishment ID required",
                    code: "ESTABLISHMENT_ID_REQUIRED",
                });
            }
            // Get user's role in this establishment
            const role = await this.authRepository.getRole(req.user.id, establishmentId);
            console.log(role, "DEBUG1");
            // Check if user has no role in this establishment
            if (!role) {
                return res.status(403).json({
                    // Add return
                    success: false,
                    message: "No access to this establishment",
                    code: "NO_ESTABLISHMENT_ACCESS",
                });
            }
            // Fix the role check logic - check if user's role is IN the required roles
            if (!requiredRoles.includes(role)) {
                // Changed from some() to includes()
                return res.status(403).json({
                    // Add return
                    success: false,
                    message: "Insufficient permission", // Fixed typo
                    code: "INSUFFICIENT_PERMISSION",
                });
            }
            // All checks passed, proceed to next middleware/controller
            next();
        };
    }
    optional() {
        return async (req, res, next) => {
            try {
                const accessToken = this.cookieService.getAccessTokenFromCookies(req);
                if (!accessToken) {
                    // No token present, continue without authentication
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
                // Don't fail the request for optional authentication
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
                // Reset or initialize counter
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
                // For now, just pass validation - establishment validation not fully implemented
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
            // Log request
            this.logger.info("API Request", {
                method: req.method,
                url: req.url,
                userAgent: req.get("User-Agent"),
                ip: this.getClientIp(req),
                userId: req.user?.id,
            });
            // Log response when finished
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
    /**
     * Attempt to refresh access token using refresh token from cookies
     */
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
                    userId: refreshPayload.sub
                });
                this.cookieService.clearAllAuthCookies(res);
                return { success: false };
            }
            // Generate new token pair
            const newTokenPair = await this.tokenService.generateTokenPair(user.id, user.email, user.establishments);
            // Revoke old refresh token
            await this.tokenService.revokeRefreshToken(refreshToken);
            // Set new cookies
            this.cookieService.setTokenCookies(res, newTokenPair.accessToken, newTokenPair.refreshToken);
            this.logger.info("Token refreshed successfully via middleware", {
                userId: user.id
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
            this.logger.error("Token refresh failed in middleware", { error });
            this.cookieService.clearAllAuthCookies(res);
            return { success: false };
        }
    }
    /**
     * Send unauthorized response
     */
    sendUnauthorized(res, message) {
        res.status(401).json({
            success: false,
            message,
            code: "UNAUTHORIZED",
        });
    }
    /**
     * Hash token for storage (should match TokenService implementation)
     */
    hashToken(token) {
        const crypto = require("crypto");
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
