import { AUTH_ERRORS } from "../../../constants/errorMessages.js";
export class CookieAuthMiddleware {
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
    authenticate = async (req, res, next) => {
        try {
            if (!this.cookieService.hasValidCookieStructure(req)) {
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
                if (!refreshResult.success) {
                    this.sendUnauthorized(res, AUTH_ERRORS.INVALID_TOKEN);
                    return;
                }
                req.user = refreshResult.user;
                next();
                return;
            }
            const user = await this.authRepository.findUserById(tokenPayload.sub);
            if (!user || user.status !== "active") {
                this.logger.warn("User not found or inactive", { userId: tokenPayload.sub });
                this.cookieService.clearAllAuthCookies(res);
                this.sendUnauthorized(res, AUTH_ERRORS.USER_NOT_FOUND);
                return;
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
            this.logger.error("Authentication middleware error", { error });
            this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
        }
    };
    optionalAuthenticate = async (req, res, next) => {
        try {
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
            this.logger.error("Optional authentication middleware error", { error });
            next();
        }
    };
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
            const newTokenPair = await this.tokenService.generateTokenPair(user.id, user.email, user.establishments);
            await this.tokenService.revokeRefreshToken(refreshToken);
            this.cookieService.setTokenCookies(res, newTokenPair.accessToken, newTokenPair.refreshToken);
            this.logger.info("Token refreshed successfully via cookie middleware", {
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
    sendUnauthorized(res, message) {
        res.status(401).json({
            success: false,
            message,
            code: "UNAUTHORIZED",
        });
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
    hashToken(token) {
        const crypto = require("crypto");
        return crypto.createHash("sha256").update(token).digest("hex");
    }
    requireRole = (allowedRoles) => {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        return async (req, res, next) => {
            if (!req.user) {
                this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
                return;
            }
            try {
                const user = await this.authRepository.findUserById(req.user.id);
                if (!user || !user.establishments || user.establishments.length === 0) {
                    res.status(403).json({
                        success: false,
                        message: AUTH_ERRORS.ACCESS_DENIED,
                        code: "ACCESS_DENIED",
                    });
                    return;
                }
                const hasRequiredRole = user.establishments.some(est => roles.includes(est.role));
                if (!hasRequiredRole) {
                    res.status(403).json({
                        success: false,
                        message: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
                        code: "INSUFFICIENT_PERMISSIONS",
                    });
                    return;
                }
                next();
            }
            catch (error) {
                this.logger.error("Role check middleware error", { error });
                res.status(500).json({
                    success: false,
                    message: "İç sunucu hatası",
                    code: "INTERNAL_ERROR",
                });
            }
        };
    };
    requireEstablishmentAccess = () => {
        return async (req, res, next) => {
            if (!req.user) {
                this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
                return;
            }
            const establishmentId = req.params.establishmentId || req.headers['x-establishment-id'];
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: AUTH_ERRORS.ESTABLISHMENT_ACCESS_REQUIRED,
                    code: "ESTABLISHMENT_REQUIRED",
                });
                return;
            }
            try {
                const user = await this.authRepository.findUserById(req.user.id);
                if (!user || !user.establishments) {
                    res.status(403).json({
                        success: false,
                        message: AUTH_ERRORS.ACCESS_DENIED,
                        code: "ACCESS_DENIED",
                    });
                    return;
                }
                const hasAccess = user.establishments.some(est => est.id === establishmentId);
                if (!hasAccess) {
                    res.status(403).json({
                        success: false,
                        message: AUTH_ERRORS.USER_NOT_IN_ESTABLISHMENT,
                        code: "NO_ESTABLISHMENT_ACCESS",
                    });
                    return;
                }
                next();
            }
            catch (error) {
                this.logger.error("Establishment access middleware error", { error });
                res.status(500).json({
                    success: false,
                    message: "İç sunucu hatası",
                    code: "INTERNAL_ERROR",
                });
            }
        };
    };
}
