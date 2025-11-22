import { Request, Response, NextFunction } from "express";
import { TokenService } from "../services/TokenService.js";
import { CookieService } from "../services/CookieService.js";
import { AuthRepository } from "../auth.repository.js";
import { LoggerService } from "../../../services/LoggerService.js";
import { AUTH_ERRORS } from "../../../constants/errorMessages.js";
import crypto from "crypto";
import {
  UserRole,
  JWTPayload,
  AuthError,
  Establishment,
} from "../auth.types.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    establishments: Establishment[] | undefined;
  };
  establishment?: {
    id: string;
    name: string;
    role: string;
    isPrimary: boolean;
    status: string;
  };
}

export class AuthMiddleware {
  constructor(
    private tokenService: TokenService,
    private cookieService: CookieService,
    private authRepository: AuthRepository,
    private logger: LoggerService
  ) {}

  authenticate() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Set a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
          this.logger.error("Authentication middleware timeout");
          this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
        }
      }, 10000); // 10 second timeout

      try {
        // Check if CookieService is available
        if (!this.cookieService) {
          this.logger.error("CookieService not initialized in AuthMiddleware");
          clearTimeout(timeoutId);
          this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_VERIFICATION_FAILED);
          return;
        }

        // Check if cookies are properly configured (simple check)
        if (!req.cookies || typeof req.cookies !== "object") {
          clearTimeout(timeoutId);
          this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
          return;
        }

        // Get access token from cookies
        const accessToken = this.cookieService.getAccessTokenFromCookies(req);

        console.log(`🔍 [${req.method}] ${req.path} - Access token: ${accessToken ? 'FOUND' : 'MISSING'}`);

        if (!accessToken) {
          console.log(`❌ No access token for ${req.path}. Cookies:`, Object.keys(req.cookies || {}));
          this.logger.debug(
            "No access token found in cookies or Authorization header",
            {
              path: req.path,
              method: req.method,
              hasCookies: !!req.cookies,
              cookieNames: req.cookies ? Object.keys(req.cookies) : [],
            }
          );
          clearTimeout(timeoutId);
          this.sendUnauthorized(res, AUTH_ERRORS.TOKEN_REQUIRED);
          return;
        }

        // Verify access token - this is synchronous and should not hang
        const tokenPayload = this.tokenService.verifyAccessToken(accessToken);

        if (process.env.NODE_ENV !== 'production' && accessToken) {
          // Log first 20 chars of token for debugging (not full token for security)
          this.logger.debug("Verifying access token", {
            path: req.path,
            tokenPreview: accessToken.substring(0, 20) + "...",
            isValid: !!tokenPayload
          });
        }

        if (!tokenPayload) {
          console.log(`⚠️ Invalid access token for ${req.path} - attempting AUTO-REFRESH`);
          this.logger.debug("Invalid access token from cookies - attempting auto-refresh", {
            path: req.path,
            method: req.method
          });

          try {
            // Try to refresh token if available - wrap in timeout
            const refreshResult = await Promise.race([
              this.attemptTokenRefresh(req, res),
              new Promise<{ success: boolean }>((_, reject) =>
                setTimeout(() => reject(new Error("Token refresh timeout")), 8000)
              )
            ]);

            if (!refreshResult || !refreshResult.success) {
              console.log(`❌ Auto-refresh FAILED for ${req.path}`);
              this.logger.debug("Auto-refresh failed", {
                path: req.path,
                refreshResult
              });
              clearTimeout(timeoutId);
              this.sendUnauthorized(res, AUTH_ERRORS.INVALID_TOKEN);
              return;
            }

            console.log(`✅ Auto-refresh SUCCEEDED for ${req.path} - request will proceed`);
            this.logger.debug("Auto-refresh succeeded, request will proceed", {
              path: req.path,
              userId: refreshResult.user?.id
            });

            // Use the new token payload and user data
            req.user = refreshResult.user;
            clearTimeout(timeoutId);
            next();
            return;
          } catch (refreshError) {
            console.log(`❌ Auto-refresh ERROR for ${req.path}:`, refreshError);
            this.logger.error("Token refresh failed in middleware", {
              error: refreshError,
              path: req.path
            });
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

        // Add establishment context to request for easier access
        (req as any).establishment =
          tokenPayload.establishments?.find((est: any) => est.isPrimary) ||
          tokenPayload.establishments?.[0];

        // Update session info if needed - make this non-blocking
        const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);
        if (refreshToken) {
          // Run session update in background, don't await it
          this.updateSessionInfoAsync(refreshToken, req).catch(error => {
            this.logger.error("Session info update failed", { error });
          });
        }

        clearTimeout(timeoutId);
        next();
      } catch (error) {
        const errorMessage =
          error instanceof Error
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

  requireRoles(roles: UserRole[]) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      if (!req.user) {
        this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
        return;
      }

      // Get establishment ID from header
      const establishmentId = req.headers['x-establishment-id'] as string;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID required in X-Establishment-ID header'
        });
        return;
      }

      // Find the user's role for this establishment
      const establishment = req.user.establishments?.find(
        (est) => est.id === establishmentId
      );

      if (!establishment) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You do not have access to this establishment'
        });
        return;
      }

      // Check if user's role for this establishment is in the allowed roles
      if (!roles.includes(establishment.role as UserRole)) {
        this.logger.warn('Role authorization failed', {
          userId: req.user.id,
          userRole: establishment.role,
          requiredRoles: roles,
          establishmentId
        });

        res.status(403).json({
          success: false,
          message: `Insufficient permissions: This action requires one of the following roles: ${roles.join(', ')}`
        });
        return;
      }

      // Update establishment context with the correct role
      req.establishment = establishment as any;
      next();
    };
  }

  requirePermissions(...permissions: string[]) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      if (!req.user) {
        this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
        return;
      }

      // For now, just allow all authenticated users - permissions system not fully implemented
      next();
    };
  }

  requireEstablishmentAccess(requiredRoles: UserRole[]) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          // Add return here
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      // Get establishment ID from various sources
      const establishmentId =
        req.headers["x-establishment-id"] ||
        req.params.establishmentId ||
        req.query.establishmentId ||
        req.body.establishmentId;

      // Check if establishment ID is provided
      if (!establishmentId) {
        return res.status(400).json({
          success: false,
          message: "Establishment ID required",
          code: "ESTABLISHMENT_ID_REQUIRED",
        });
      }

      // Find the establishment in user's token data instead of database call
      const userEstablishment = req.user.establishments?.find(
        (est: any) => est.id === establishmentId
      );

      // Check if user has no access to this establishment
      if (!userEstablishment) {
        return res.status(403).json({
          success: false,
          message: "No access to this establishment",
          code: "NO_ESTABLISHMENT_ACCESS",
        });
      }

      // Check if user's role meets the required roles
      if (!requiredRoles.includes(userEstablishment.role as UserRole)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permission",
          code: "INSUFFICIENT_PERMISSION",
        });
      }

      // Add the specific establishment context to request
      (req as any).establishment = userEstablishment;

      // All checks passed, proceed to next middleware/controller
      next();
    };
  }

  optional() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Check if CookieService is available
        if (!this.cookieService) {
          this.logger.error(
            "CookieService not initialized in optional AuthMiddleware"
          );
          next();
          return;
        }

        const accessToken = this.cookieService.getAccessTokenFromCookies(req);

        if (!accessToken) {
          // No token present, continue without authentication
          next();
          return;
        }

        const tokenPayload = this.tokenService.verifyAccessToken(accessToken);

        if (tokenPayload) {
          // Use data directly from token payload - no database call needed
          req.user = {
            id: tokenPayload.sub,
            email: tokenPayload.email,
            establishments: tokenPayload.establishments || [],
          };

          // Add establishment context to request for easier access
          (req as any).establishment =
            tokenPayload.establishments?.find((est: any) => est.isPrimary) ||
            tokenPayload.establishments?.[0];
        }

        next();
      } catch (error) {
        this.logger.error("Optional auth middleware error", { error });
        // Don't fail the request for optional authentication
        next();
      }
    };
  }

  rateLimitByUser(
    maxRequests: number = 10000,
    windowMs: number = 15 * 60 * 1000
  ) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
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
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      if (!req.user) {
        this.sendUnauthorized(res, AUTH_ERRORS.AUTHENTICATION_REQUIRED);
        return;
      }

      try {
        // For now, just pass validation - establishment validation not fully implemented
        next();
      } catch (error) {
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
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
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
   * Update session info in background without blocking the request
   */
  private async updateSessionInfoAsync(refreshToken: string, req: AuthenticatedRequest): Promise<void> {
    try {
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";
      const tokenHash = this.hashToken(refreshToken);
      
      // Add timeout to prevent hanging
      await Promise.race([
        this.tokenService.updateSessionInfo(tokenHash, ipAddress, userAgent),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error("Session update timeout")), 5000)
        )
      ]);
    } catch (error) {
      // Log error but don't throw - this is background operation
      this.logger.error("Session info background update failed", { error });
    }
  }

  /**
   * Attempt to refresh access token using refresh token from cookies
   */
  private async attemptTokenRefresh(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<{ success: boolean; user?: any }> {
    try {
      console.log(`🔄 Attempting auto-refresh for ${req.path}`);
      const refreshToken = this.cookieService.getRefreshTokenFromCookies(req);

      if (!refreshToken) {
        console.log(`❌ No refresh token found in cookies`);
        this.logger.debug("No refresh token available for token refresh");
        return { success: false };
      }

      console.log(`✅ Refresh token found, verifying...`);

      // Add timeout to refresh token verification
      const refreshPayload = await Promise.race([
        this.tokenService.verifyRefreshToken(refreshToken),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("Refresh token verification timeout")), 3000)
        )
      ]);

      if (!refreshPayload) {
        console.log(`❌ Invalid refresh token`);
        this.logger.debug("Invalid refresh token for token refresh");
        try {
          this.cookieService.clearAllAuthCookies(res);
        } catch (clearError) {
          this.logger.error("Failed to clear cookies", { clearError });
        }
        return { success: false };
      }

      console.log(`✅ Refresh token valid, looking up user ${refreshPayload.sub}`);

      // Add timeout to user lookup
      const user = await Promise.race([
        this.authRepository.findUserById(refreshPayload.sub),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("User lookup timeout")), 3000)
        )
      ]);

      if (!user || user.status !== "active") {
        console.log(`❌ User not found or inactive: ${refreshPayload.sub}`);
        this.logger.warn("User not found or inactive during token refresh", {
          userId: refreshPayload.sub,
        });
        try {
          this.cookieService.clearAllAuthCookies(res);
        } catch (clearError) {
          this.logger.error("Failed to clear cookies", { clearError });
        }
        return { success: false };
      }

      console.log(`✅ User found, generating new token pair`);

      // Add timeout to token generation
      const newTokenPair = await Promise.race([
        this.tokenService.generateTokenPair(
          user.id,
          user.email,
          user.establishments
        ),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("Token generation timeout")), 3000)
        )
      ]);

      console.log(`✅ New tokens generated, setting cookies`);

      // Revoke old refresh token in background - don't wait for it
      this.tokenService.revokeRefreshToken(refreshToken).catch(error => {
        this.logger.error("Failed to revoke old refresh token", { error });
      });

      // Set new cookies
      try {
        this.cookieService.setTokenCookies(
          res,
          newTokenPair.accessToken,
          newTokenPair.refreshToken
        );
        console.log(`✅ NEW COOKIES SET via auto-refresh`);
      } catch (cookieError) {
        console.log(`❌ Failed to set new cookies:`, cookieError);
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
    } catch (error) {
      this.logger.error("Token refresh failed in middleware", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      try {
        this.cookieService.clearAllAuthCookies(res);
      } catch (clearError) {
        this.logger.error(
          "Failed to clear cookies during token refresh error",
          {
            clearError:
              clearError instanceof Error
                ? clearError.message
                : String(clearError),
          }
        );
      }
      return { success: false };
    }
  }

  /**
   * Send unauthorized response
   */
  private sendUnauthorized(res: Response, message: string): void {
    try {
      if (!res.headersSent) {
        res.status(401).json({
          success: false,
          message,
          code: "UNAUTHORIZED",
        });
      }
    } catch (error) {
      this.logger.error("Failed to send unauthorized response", { error });
    }
  }

  /**
   * Hash token for storage (should match TokenService implementation)
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

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
}
