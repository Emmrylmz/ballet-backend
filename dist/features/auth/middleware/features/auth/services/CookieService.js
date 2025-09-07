export class CookieService {
    constructor(logger, config) {
        this.logger = logger;
        this.config = {
            domain: config.domain,
            secure: config.secure ?? process.env.NODE_ENV === "production",
            sameSite: config.sameSite ?? "strict",
            accessTokenExpiry: config.accessTokenExpiry,
            refreshTokenExpiry: config.refreshTokenExpiry,
        };
        this.logger.info("CookieService initialized", {
            secure: this.config.secure,
            sameSite: this.config.sameSite,
            domain: this.config.domain,
        });
    }
    /**
     * Set HTTP-only access token cookie
     */
    setAccessTokenCookie(res, token) {
        try {
            const cookieOptions = {
                httpOnly: true,
                secure: this.config.secure,
                sameSite: this.config.sameSite,
                maxAge: this.config.accessTokenExpiry * 1000, // Convert to milliseconds
                path: "/",
                ...(this.config.domain && { domain: this.config.domain }),
            };
            res.cookie("access_token", token, cookieOptions);
            this.logger.debug("Access token cookie set", {
                maxAge: cookieOptions.maxAge,
                secure: cookieOptions.secure,
                sameSite: cookieOptions.sameSite,
            });
        }
        catch (error) {
            this.logger.error("Failed to set access token cookie", { error });
            throw new Error("Failed to set access token cookie");
        }
    }
    /**
     * Set HTTP-only refresh token cookie
     */
    setRefreshTokenCookie(res, token) {
        try {
            const cookieOptions = {
                httpOnly: true,
                secure: this.config.secure,
                sameSite: this.config.sameSite,
                maxAge: this.config.refreshTokenExpiry * 1000, // Convert to milliseconds
                path: "/",
                ...(this.config.domain && { domain: this.config.domain }),
            };
            res.cookie("refresh_token", token, cookieOptions);
            this.logger.debug("Refresh token cookie set", {
                maxAge: cookieOptions.maxAge,
                secure: cookieOptions.secure,
                sameSite: cookieOptions.sameSite,
            });
        }
        catch (error) {
            this.logger.error("Failed to set refresh token cookie", { error });
            throw new Error("Failed to set refresh token cookie");
        }
    }
    /**
     * Set both access and refresh token cookies
     */
    setTokenCookies(res, accessToken, refreshToken) {
        this.setAccessTokenCookie(res, accessToken);
        this.setRefreshTokenCookie(res, refreshToken);
    }
    /**
     * Get access token from request cookies
     */
    getAccessTokenFromCookies(req) {
        return req.cookies?.access_token;
    }
    /**
     * Get refresh token from request cookies
     */
    getRefreshTokenFromCookies(req) {
        return req.cookies?.refresh_token;
    }
    /**
     * Clear access token cookie
     */
    clearAccessTokenCookie(res) {
        try {
            const cookieOptions = {
                httpOnly: true,
                secure: this.config.secure,
                sameSite: this.config.sameSite,
                path: "/",
                ...(this.config.domain && { domain: this.config.domain }),
            };
            res.clearCookie("access_token", cookieOptions);
            this.logger.debug("Access token cookie cleared");
        }
        catch (error) {
            this.logger.error("Failed to clear access token cookie", { error });
        }
    }
    /**
     * Clear refresh token cookie
     */
    clearRefreshTokenCookie(res) {
        try {
            const cookieOptions = {
                httpOnly: true,
                secure: this.config.secure,
                sameSite: this.config.sameSite,
                path: "/",
                ...(this.config.domain && { domain: this.config.domain }),
            };
            res.clearCookie("refresh_token", cookieOptions);
            this.logger.debug("Refresh token cookie cleared");
        }
        catch (error) {
            this.logger.error("Failed to clear refresh token cookie", { error });
        }
    }
    /**
     * Clear all authentication cookies
     */
    clearAllAuthCookies(res) {
        this.clearAccessTokenCookie(res);
        this.clearRefreshTokenCookie(res);
        this.logger.info("All authentication cookies cleared");
    }
    /**
     * Check if request has valid cookie structure
     */
    hasValidCookieStructure(req) {
        return (req.cookies !== undefined &&
            typeof req.cookies === "object" &&
            req.cookies !== null);
    }
    /**
     * Get cookie configuration for debugging
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Set secure cookie flags for production
     */
    setSecureFlags(secure) {
        this.config.secure = secure;
        this.logger.info("Cookie security flags updated", { secure });
    }
    /**
     * Validate cookie security configuration
     */
    validateSecurityConfig() {
        const warnings = [];
        let isValid = true;
        // Check HTTPS in production
        if (process.env.NODE_ENV === "production" && !this.config.secure) {
            warnings.push("Secure flag should be true in production");
            isValid = false;
        }
        // Check SameSite configuration
        if (this.config.sameSite === "none" && !this.config.secure) {
            warnings.push("SameSite=none requires Secure flag to be true");
            isValid = false;
        }
        // Check token expiry times
        if (this.config.accessTokenExpiry > this.config.refreshTokenExpiry) {
            warnings.push("Access token expiry should be shorter than refresh token");
            isValid = false;
        }
        if (this.config.accessTokenExpiry < 300) {
            warnings.push("Access token expiry is very short (< 5 minutes)");
        }
        if (this.config.refreshTokenExpiry > 30 * 24 * 3600) {
            warnings.push("Refresh token expiry is very long (> 30 days)");
        }
        return { isValid, warnings };
    }
}
