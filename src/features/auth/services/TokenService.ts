import jwt from "jsonwebtoken";
import crypto from "crypto";
import { DatabaseService } from "../../../services/DatabaseService.js";
import { LoggerService } from "../../../services/LoggerService.js";
import {
  JWTPayload,
  UserRole,
  SecuritySettings,
  Establishment,
} from "../auth.types.js";

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly securitySettings: SecuritySettings;

  constructor(
    private db: DatabaseService,
    private logger: LoggerService,
    config: {
      accessTokenSecret: string;
      refreshTokenSecret: string;
      securitySettings: SecuritySettings;
    }
  ) {
    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.securitySettings = config.securitySettings;
  }

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokenPair(
    userId: string,
    email: string,
    establishments?: Establishment[]
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const accessTokenExpiry =
        now + this.securitySettings.tokenExpiryTime * 60;
      const refreshTokenExpiry =
        now + this.securitySettings.refreshTokenExpiryTime * 24 * 60 * 60;
      const places =
        establishments && establishments.length > 0 ? establishments : [];
      // Create access token
      const accessPayload: JWTPayload = {
        sub: userId,
        email,
        establishments: places,
        tokenType: "access",
        iat: now,
        exp: accessTokenExpiry,
      };

      const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
        algorithm: "HS256",
      });

      // Create refresh token
      const refreshPayload: JWTPayload = {
        sub: userId,
        email,
        establishments: places,
        tokenType: "refresh",
        iat: now,
        exp: refreshTokenExpiry,
      };

      const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
        algorithm: "HS256",
      });

      // Store refresh token in database
      await this.storeRefreshToken(
        userId,
        refreshToken,
        new Date(refreshTokenExpiry * 1000)
      );

      this.logger.info("Generated token pair for user", {
        userId,
        establishments,
        accessTokenExpiry: new Date(accessTokenExpiry * 1000),
        refreshTokenExpiry: new Date(refreshTokenExpiry * 1000),
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: this.securitySettings.tokenExpiryTime * 60, // in seconds
      };
    } catch (error) {
      this.logger.error("Failed to generate token pair", { error, userId });
      throw new Error("Token generation failed");
    }
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as JWTPayload;

      if (decoded.tokenType !== "access") {
        throw new Error("Invalid token type");
      }

      return decoded;
    } catch (error) {
      this.logger.debug("Access token verification failed", {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Verify refresh token and check if it exists in database
   */
  async verifyRefreshToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;

      if (decoded.tokenType !== "refresh") {
        throw new Error("Invalid token type");
      }

      // Check if token exists in database and is not revoked
      const result = await this.db.query(
        `
        SELECT id, user_id, expires_at, is_revoked 
        FROM user_sessions 
        WHERE token_hash = $1
      `,
        [this.hashToken(token)]
      );

      if (result.rows.length === 0) {
        throw new Error("Refresh token not found");
      }

      const session = result.rows[0];

      if (session.is_revoked) {
        throw new Error("Refresh token revoked");
      }

      if (new Date(session.expires_at) < new Date()) {
        // Clean up expired token
        await this.revokeRefreshToken(token);
        throw new Error("Refresh token expired");
      }

      return decoded;
    } catch (error) {
      this.logger.debug("Refresh token verification failed", {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Generate a secure random token for activations, password resets, etc.
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Generate activation token that expires after configured time
   */
  generateActivationToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: "activation",
      iat: Math.floor(Date.now() / 1000),
      exp:
        Math.floor(Date.now() / 1000) +
        this.securitySettings.activationTokenExpiry * 60 * 60,
    };

    return jwt.sign(payload, this.accessTokenSecret);
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: "password_reset",
      iat: Math.floor(Date.now() / 1000),
      exp:
        Math.floor(Date.now() / 1000) +
        this.securitySettings.passwordResetTokenExpiry * 60 * 60,
    };

    return jwt.sign(payload, this.accessTokenSecret);
  }

  /**
   * Verify special token (activation, password reset, etc.)
   */
  verifySpecialToken(
    token: string,
    expectedType: string
  ): { sub: string; email: string } | null {
    try {
      console.log(token, "TOKENNNN");
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;

      console.log(decoded, "DECODED");
      if (decoded.type !== expectedType) {
        throw new Error("Invalid token type");
      }

      return {
        sub: decoded.sub,
        email: decoded.email,
      };
    } catch (error) {
      this.logger.debug(`${expectedType} token verification failed`, {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.db.query(
      `
      INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [userId, tokenHash, expiresAt, null, null]
    ); // IP and user agent will be set by middleware
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);

      await this.db.query(
        `
        UPDATE user_sessions 
        SET is_revoked = true 
        WHERE token_hash = $1
      `,
        [tokenHash]
      );

      this.logger.info("Refresh token revoked", { tokenHash });
    } catch (error) {
      this.logger.error("Failed to revoke refresh token", { error });
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user (useful for logout from all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE user_sessions 
        SET is_revoked = true 
        WHERE user_id = $1 AND is_revoked = false
      `,
        [userId]
      );

      this.logger.info("All refresh tokens revoked for user", { userId });
    } catch (error) {
      this.logger.error("Failed to revoke all user tokens", { error, userId });
      throw error;
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.db.query(`
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
      `);

      this.logger.info(`Cleaned up ${result.rows.length} expired tokens`);
    } catch (error) {
      this.logger.error("Failed to cleanup expired tokens", { error });
    }
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        `
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
      `,
        [userId]
      );

      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get user sessions", { error, userId });
      throw error;
    }
  }

  /**
   * Update session with IP and user agent info
   */
  async updateSessionInfo(
    tokenHash: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE user_sessions 
        SET ip_address = $1, user_agent = $2
        WHERE token_hash = $3
      `,
        [ipAddress, userAgent, tokenHash]
      );
    } catch (error) {
      this.logger.error("Failed to update session info", { error });
    }
  }
}
