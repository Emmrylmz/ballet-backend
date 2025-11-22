import { Response, Request } from "express";
import { LoggerService } from "../../../services/LoggerService.js";

export interface CookieConfig {
  domain?: string;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  accessTokenExpiry: number; // in seconds
  refreshTokenExpiry: number; // in seconds
}

export class CookieService {
  private readonly config: CookieConfig;

  constructor(
    private logger: LoggerService,
    config: {
      domain: string;
      secure?: boolean;
      sameSite?: "strict" | "lax" | "none";
      accessTokenExpiry: number;
      refreshTokenExpiry: number;
    }
  ) {
    this.config = {
      domain: config.domain,
      secure: config.secure ?? process.env.NODE_ENV === "production",
      sameSite: config.sameSite ?? "lax", // Changed from "strict" to "lax" to allow cookies on retried requests
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
  setAccessTokenCookie(res: Response, token: string): void {
    try {
      const cookieOptions = {
        httpOnly: false, // TEMPORARY: Set to false to see cookies in dev tools
        secure: this.config.secure,
        sameSite: this.config.sameSite as "strict" | "lax" | "none",
        maxAge: this.config.accessTokenExpiry * 1000, // Convert to milliseconds
        path: "/",
        ...(this.config.domain && this.config.domain.length > 0 && { domain: this.config.domain }),
      };

      res.cookie("access_token", token, cookieOptions);

      console.log("🍪 Access token cookie set");

      this.logger.debug("Access token cookie set", {
        maxAge: cookieOptions.maxAge,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
      });
    } catch (error) {
      this.logger.error("Failed to set access token cookie", { error });
      throw new Error("Failed to set access token cookie");
    }
  }

  /**
   * Set HTTP-only refresh token cookie
   */
  setRefreshTokenCookie(res: Response, token: string): void {
    try {
      const cookieOptions = {
        httpOnly: false, // TEMPORARY: Set to false to see cookies in dev tools  
        secure: this.config.secure,
        sameSite: this.config.sameSite as "strict" | "lax" | "none",
        maxAge: this.config.refreshTokenExpiry * 1000, // Convert to milliseconds
        path: "/",
        ...(this.config.domain && this.config.domain.length > 0 && { domain: this.config.domain }),
      };

      res.cookie("refresh_token", token, cookieOptions);

      console.log("🍪 Refresh token cookie set");

      this.logger.debug("Refresh token cookie set", {
        maxAge: cookieOptions.maxAge,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
      });
    } catch (error) {
      this.logger.error("Failed to set refresh token cookie", { error });
      throw new Error("Failed to set refresh token cookie");
    }
  }

  /**
   * Set both access and refresh token cookies
   */
  setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
  ): void {
    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);
    console.log("success?")
  }

  /**
   * Get access token from request cookies
   */
  public getAccessTokenFromCookies(req: Request): string | undefined {
    const token = req.cookies?.access_token;
    if (token) {
      console.log("🍪 Access token found in cookies");
    }
    return token;
  }

  /**
   * Get access token from either cookies or Authorization header
   * For now, only use cookies
   */
  public getAccessToken(req: Request): string | undefined {
    return this.getAccessTokenFromCookies(req);
  }

  /**
   * Get refresh token from request cookies
   */
  getRefreshTokenFromCookies(req: Request): string | undefined {
    return req.cookies?.refresh_token;
  }

  /**
   * Clear access token cookie
   */
  clearAccessTokenCookie(res: Response): void {
    try {
      const cookieOptions = {
        httpOnly: true,
        secure: this.config.secure,
        sameSite: this.config.sameSite as "strict" | "lax" | "none",
        path: "/",
        ...(this.config.domain && this.config.domain.length > 0 && { domain: this.config.domain }),
      };

      res.clearCookie("access_token", cookieOptions);
      this.logger.debug("Access token cookie cleared");
    } catch (error) {
      this.logger.error("Failed to clear access token cookie", { error });
    }
  }

  /**
   * Clear refresh token cookie
   */
  clearRefreshTokenCookie(res: Response): void {
    try {
      const cookieOptions = {
        httpOnly: true,
        secure: this.config.secure,
        sameSite: this.config.sameSite as "strict" | "lax" | "none",
        path: "/",
        ...(this.config.domain && this.config.domain.length > 0 && { domain: this.config.domain }),
      };

      res.clearCookie("refresh_token", cookieOptions);
      this.logger.debug("Refresh token cookie cleared");
    } catch (error) {
      this.logger.error("Failed to clear refresh token cookie", { error });
    }
  }

  /**
   * Clear all authentication cookies
   */
  clearAllAuthCookies(res: Response): void {
    this.clearAccessTokenCookie(res);
    this.clearRefreshTokenCookie(res);
    this.logger.info("All authentication cookies cleared");
  }

  /**
   * Check if request has valid cookie structure
   */
  hasValidCookieStructure(req: Request): boolean {
    return (
      req.cookies !== undefined &&
      typeof req.cookies === "object" &&
      req.cookies !== null
    );
  }

  /**
   * Get cookie configuration for debugging
   */
  getConfig(): CookieConfig {
    return { ...this.config };
  }

  /**
   * Set secure cookie flags for production
   */
  setSecureFlags(secure: boolean): void {
    this.config.secure = secure;
    this.logger.info("Cookie security flags updated", { secure });
  }

  /**
   * Validate cookie security configuration
   */
  validateSecurityConfig(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
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
