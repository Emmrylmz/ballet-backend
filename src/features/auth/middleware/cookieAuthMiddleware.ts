import { Request, Response, NextFunction } from "express";
import { TokenService } from "../services/TokenService.js";
import { CookieService } from "../services/CookieService.js";
import { AuthRepository } from "../auth.repository.js";
import { LoggerService } from "../../../services/LoggerService.js";
import { AUTH_ERRORS } from "../../../constants/errorMessages.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    establishments: any[];
  };
}

export class CookieAuthMiddleware {
  constructor(
    private tokenService: TokenService,
    private cookieService: CookieService,
    private authRepository: AuthRepository,
    private logger: LoggerService
  ) {}

  /**
   * Middleware to authenticate requests using HTTP-only cookies
   */
  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
        
        // Use the new token payload
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
    } catch (error) {
      this.logger.error("Authentication middleware error", { error });
      this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
    }
  };

  /**
   * Optional authentication - doesn't fail if no token is present
   */
  optionalAuthenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
    } catch (error) {
      this.logger.error("Optional authentication middleware error", { error });
      // Don't fail the request for optional authentication
      next();
    }
  };

  /**
   * Attempt to refresh access token using refresh token from cookies
   */
  private async attemptTokenRefresh(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<{ success: boolean; user?: any }> {
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
      const newTokenPair = await this.tokenService.generateTokenPair(
        user.id,
        user.email,
        user.establishments
      );

      // Revoke old refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);

      // Set new cookies
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
    } catch (error) {
      this.logger.error("Token refresh failed in middleware", { error });
      this.cookieService.clearAllAuthCookies(res);
      return { success: false };
    }
  }

  /**
   * Send unauthorized response
   */
  private sendUnauthorized(res: Response, message: string): void {
    res.status(401).json({
      success: false,
      message,
      code: "UNAUTHORIZED",
    });
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      "unknown"
    );
  }

  /**
   * Hash token for storage (should match TokenService implementation)
   */
  private hashToken(token: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Middleware factory for role-based access control
   */
  requireRole = (allowedRoles: string | string[]) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

        // Check if user has any of the required roles in any establishment
        const hasRequiredRole = user.establishments.some(est => 
          roles.includes(est.role)
        );

        if (!hasRequiredRole) {
          res.status(403).json({
            success: false,
            message: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
            code: "INSUFFICIENT_PERMISSIONS",
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error("Role check middleware error", { error });
        res.status(500).json({
          success: false,
          message: "İç sunucu hatası",
          code: "INTERNAL_ERROR",
        });
      }
    };
  };

  /**
   * Middleware factory for establishment access control
   */
  requireEstablishmentAccess = () => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      } catch (error) {
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