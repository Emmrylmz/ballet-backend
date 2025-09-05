import jwt from "jsonwebtoken";
import crypto from "crypto";
export class TokenService {
    db;
    logger;
    accessTokenSecret;
    refreshTokenSecret;
    securitySettings;
    constructor(db, logger, config) {
        this.db = db;
        this.logger = logger;
        this.accessTokenSecret = config.accessTokenSecret;
        this.refreshTokenSecret = config.refreshTokenSecret;
        this.securitySettings = config.securitySettings;
    }
    async generateTokenPair(userId, email, role, establishmentId, permissions) {
        try {
            const now = Math.floor(Date.now() / 1000);
            const accessTokenExpiry = now + this.securitySettings.tokenExpiryTime * 60;
            const refreshTokenExpiry = now + this.securitySettings.refreshTokenExpiryTime * 24 * 60 * 60;
            const accessPayload = {
                sub: userId,
                email,
                role,
                establishmentId,
                permissions,
                tokenType: "access",
                iat: now,
                exp: accessTokenExpiry,
            };
            const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
                algorithm: "HS256",
            });
            const refreshPayload = {
                sub: userId,
                email,
                role,
                establishmentId,
                permissions: [],
                tokenType: "refresh",
                iat: now,
                exp: refreshTokenExpiry,
            };
            const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
                algorithm: "HS256",
            });
            await this.storeRefreshToken(userId, refreshToken, new Date(refreshTokenExpiry * 1000));
            this.logger.info("Generated token pair for user", {
                userId,
                role,
                establishmentId,
                accessTokenExpiry: new Date(accessTokenExpiry * 1000),
                refreshTokenExpiry: new Date(refreshTokenExpiry * 1000),
            });
            return {
                accessToken,
                refreshToken,
                expiresIn: this.securitySettings.tokenExpiryTime * 60,
            };
        }
        catch (error) {
            this.logger.error("Failed to generate token pair", { error, userId });
            throw new Error("Token generation failed");
        }
    }
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret);
            if (decoded.tokenType !== "access") {
                throw new Error("Invalid token type");
            }
            return decoded;
        }
        catch (error) {
            this.logger.debug("Access token verification failed", {
                error: error.message,
            });
            return null;
        }
    }
    async verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret);
            if (decoded.tokenType !== "refresh") {
                throw new Error("Invalid token type");
            }
            const result = await this.db.query(`
        SELECT id, user_id, expires_at, is_revoked 
        FROM user_sessions 
        WHERE token_hash = $1
      `, [this.hashToken(token)]);
            if (result.rows.length === 0) {
                throw new Error("Refresh token not found");
            }
            const session = result.rows[0];
            if (session.is_revoked) {
                throw new Error("Refresh token revoked");
            }
            if (new Date(session.expires_at) < new Date()) {
                await this.revokeRefreshToken(token);
                throw new Error("Refresh token expired");
            }
            return decoded;
        }
        catch (error) {
            this.logger.debug("Refresh token verification failed", {
                error: error.message,
            });
            return null;
        }
    }
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString("hex");
    }
    generateActivationToken(userId, email) {
        const payload = {
            sub: userId,
            email,
            type: "activation",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) +
                this.securitySettings.activationTokenExpiry * 60 * 60,
        };
        return jwt.sign(payload, this.accessTokenSecret);
    }
    generatePasswordResetToken(userId, email) {
        const payload = {
            sub: userId,
            email,
            type: "password_reset",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) +
                this.securitySettings.passwordResetTokenExpiry * 60 * 60,
        };
        return jwt.sign(payload, this.accessTokenSecret);
    }
    verifySpecialToken(token, expectedType) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret);
            if (decoded.type !== expectedType) {
                throw new Error("Invalid token type");
            }
            return {
                sub: decoded.sub,
                email: decoded.email,
            };
        }
        catch (error) {
            this.logger.debug(`${expectedType} token verification failed`, {
                error: error.message,
            });
            return null;
        }
    }
    async storeRefreshToken(userId, token, expiresAt) {
        const tokenHash = this.hashToken(token);
        await this.db.query(`
      INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, tokenHash, expiresAt, null, null]);
    }
    async revokeRefreshToken(token) {
        try {
            const tokenHash = this.hashToken(token);
            await this.db.query(`
        UPDATE user_sessions 
        SET is_revoked = true 
        WHERE token_hash = $1
      `, [tokenHash]);
            this.logger.info("Refresh token revoked", { tokenHash });
        }
        catch (error) {
            this.logger.error("Failed to revoke refresh token", { error });
            throw error;
        }
    }
    async revokeAllUserTokens(userId) {
        try {
            await this.db.query(`
        UPDATE user_sessions 
        SET is_revoked = true 
        WHERE user_id = $1 AND is_revoked = false
      `, [userId]);
            this.logger.info("All refresh tokens revoked for user", { userId });
        }
        catch (error) {
            this.logger.error("Failed to revoke all user tokens", { error, userId });
            throw error;
        }
    }
    async cleanupExpiredTokens() {
        try {
            const result = await this.db.query(`
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
      `);
            this.logger.info(`Cleaned up ${result.rows.length} expired tokens`);
        }
        catch (error) {
            this.logger.error("Failed to cleanup expired tokens", { error });
        }
    }
    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    }
    async getUserSessions(userId) {
        try {
            const result = await this.db.query(`
        SELECT 
          id,
          ip_address,
          user_agent,
          created_at,
          expires_at,
          is_revoked
        FROM user_sessions 
        WHERE user_id = $1 
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
      `, [userId]);
            return result.rows;
        }
        catch (error) {
            this.logger.error("Failed to get user sessions", { error, userId });
            throw error;
        }
    }
    async updateSessionInfo(tokenHash, ipAddress, userAgent) {
        try {
            await this.db.query(`
        UPDATE user_sessions 
        SET ip_address = $1, user_agent = $2
        WHERE token_hash = $3
      `, [ipAddress, userAgent, tokenHash]);
        }
        catch (error) {
            this.logger.error("Failed to update session info", { error });
        }
    }
}
