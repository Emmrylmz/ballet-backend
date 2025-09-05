import { Request, Response, NextFunction } from "express";
import { TokenService } from "../services/TokenService.js";
import { AuthRepository } from "../auth.repository.js";
import { LoggerService } from "../../../services/LoggerService.js";
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
}

export class AuthMiddleware {
  constructor(
    private tokenService: TokenService,
    private authRepository: AuthRepository,
    private logger: LoggerService
  ) {}

  authenticate() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          res.status(401).json({
            success: false,
            message: "Access token is required",
            code: "TOKEN_MISSING",
          });
          return;
        }

        // Verify token
        const payload = this.tokenService.verifyAccessToken(token);
        if (!payload) {
          res.status(401).json({
            success: false,
            message: "Invalid or expired token",
            code: "TOKEN_INVALID",
          });
          return;
        }

        // Get fresh user data to ensure account is still active
        const user = await this.authRepository.findUserById(payload.sub);
        if (!user) {
          res.status(401).json({
            success: false,
            message: "User not found",
            code: "USER_NOT_FOUND",
          });
          return;
        }

        // Check user status
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

          res.status(403).json({
            success: false,
            message: "Account is not active",
            code: "ACCOUNT_INACTIVE",
          });
          return;
        }

        // Attach user to request
        req.user = {
          id: user.id,
          email: user.email,
          establishments: user.establishments,
        };

        next();
      } catch (error) {
        this.logger.error("Authentication middleware error", { error });

        res.status(500).json({
          success: false,
          message: "Authentication failed",
          code: "AUTH_ERROR",
        });
      }
    };
  }

  requireRoles(...roles: UserRole[]) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

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
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
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

      console.log(req.headers);

      // Get establishment ID from various sources
      const establishmentId ="0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"
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
      const role = await this.authRepository.getRole(
        req.user.id,
        establishmentId
      );

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
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          // No token provided, continue without user context
          next();
          return;
        }

        const payload = this.tokenService.verifyAccessToken(token);
        if (!payload) {
          // Invalid token, continue without user context
          next();
          return;
        }

        const user = await this.authRepository.findUserById(payload.sub);
        if (user && user.status === "active") {
          req.user = {
            id: user.id,
            email: user.email,
            establishments: user.establishments || [],
          };
        }

        next();
      } catch (error) {
        this.logger.error("Optional auth middleware error", { error });
        // Continue without user context on error
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
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
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

  private extractToken(req: Request): string | null {
    const authHeader = req.get("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    // Also check for token in cookies (optional)
    const cookieToken = req.cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
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
