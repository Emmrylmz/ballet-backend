import { CorsOptions } from "cors";
import { LoggerService } from "../services/LoggerService.js";

export class CorsConfigurationService {
  private logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  /**
   * Get CORS configuration with credentials support for HTTP-only cookies
   */
  getCorsOptions(): CorsOptions {
    // Allowed origins for production and development
    const allowedOrigins = this.getAllowedOrigins();
    
    const corsOptions: CorsOptions = {
      // Enable credentials (required for HTTP-only cookies)
      credentials: true,
      
      // Origin configuration
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          this.logger.warn("CORS: Origin not allowed", { origin, allowedOrigins });
          callback(new Error("Not allowed by CORS"), false);
        }
      },

      // Allowed HTTP methods
      methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS"
      ],

      // Allowed headers
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "X-Establishment-Id",
        "X-Client-Version",
        "Cache-Control"
      ],

      // Expose headers to the client
      exposedHeaders: [
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset"
      ],

      // Preflight cache duration (in seconds)
      maxAge: 86400, // 24 hours

      // Handle preflight requests
      preflightContinue: false,
      optionsSuccessStatus: 200
    };

    this.logger.info("CORS configuration initialized", {
      allowedOrigins,
      credentials: corsOptions.credentials,
      methods: corsOptions.methods
    });

    return corsOptions;
  }

  /**
   * Get allowed origins based on environment
   */
  private getAllowedOrigins(): string[] {
    const baseOrigins = [];

    // Development origins
    if (process.env.NODE_ENV !== "production") {
      baseOrigins.push(
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:5173", // Vite default
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
      );
    }

    // Production origins from environment variables
    const prodOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
    baseOrigins.push(...prodOrigins);

    // Frontend URL from environment
    if (process.env.FRONTEND_URL) {
      baseOrigins.push(process.env.FRONTEND_URL);
    }

    // Admin dashboard URL if different
    if (process.env.ADMIN_FRONTEND_URL) {
      baseOrigins.push(process.env.ADMIN_FRONTEND_URL);
    }

    // Remove duplicates and empty strings
    const uniqueOrigins = [...new Set(baseOrigins)].filter(origin => 
      origin && origin.trim().length > 0
    );

    return uniqueOrigins;
  }

  /**
   * Validate CORS configuration
   */
  validateConfiguration(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    const allowedOrigins = this.getAllowedOrigins();

    // Check if origins are configured
    if (allowedOrigins.length === 0) {
      warnings.push("No allowed origins configured - this may block all requests");
      isValid = false;
    }

    // Check for wildcard in production
    if (process.env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
      warnings.push("Wildcard origin (*) not recommended for production");
      isValid = false;
    }

    // Check for HTTP origins in production
    if (process.env.NODE_ENV === "production") {
      const httpOrigins = allowedOrigins.filter(origin => 
        origin.startsWith("http://") && !origin.includes("localhost")
      );
      
      if (httpOrigins.length > 0) {
        warnings.push(`HTTP origins in production: ${httpOrigins.join(", ")}`);
      }
    }

    // Check for localhost in production
    if (process.env.NODE_ENV === "production") {
      const localhostOrigins = allowedOrigins.filter(origin => 
        origin.includes("localhost") || origin.includes("127.0.0.1")
      );
      
      if (localhostOrigins.length > 0) {
        warnings.push(`Localhost origins in production: ${localhostOrigins.join(", ")}`);
      }
    }

    return { isValid, warnings };
  }

  /**
   * Get security headers middleware configuration
   */
  getSecurityHeaders() {
    return {
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },

      // Referrer Policy
      referrerPolicy: "same-origin",

      // X-Content-Type-Options
      noSniff: true,

      // X-Frame-Options
      frameguard: { action: "deny" },

      // X-XSS-Protection
      xssFilter: true,

      // Hide X-Powered-By header
      hidePoweredBy: true
    };
  }

  /**
   * Get cookie security configuration
   */
  getCookieSecurityConfig() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: "/",
    };
  }

  /**
   * Log CORS configuration for debugging
   */
  logConfiguration(): void {
    const allowedOrigins = this.getAllowedOrigins();
    const validation = this.validateConfiguration();

    this.logger.info("CORS Configuration Summary", {
      environment: process.env.NODE_ENV,
      allowedOrigins,
      credentialsEnabled: true,
      validationResult: validation
    });

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        this.logger.warn("CORS Configuration Warning", { warning });
      });
    }
  }
}