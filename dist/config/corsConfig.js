export class CorsConfigurationService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    getCorsOptions() {
        const allowedOrigins = this.getAllowedOrigins();
        const corsOptions = {
            credentials: true,
            origin: (origin, callback) => {
                if (!origin) {
                    return callback(null, true);
                }
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    this.logger.warn("CORS: Origin not allowed", { origin, allowedOrigins });
                    callback(new Error("Not allowed by CORS"), false);
                }
            },
            methods: [
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
            ],
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
            exposedHeaders: [
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining",
                "X-RateLimit-Reset"
            ],
            maxAge: 86400,
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
    getAllowedOrigins() {
        const baseOrigins = [];
        if (process.env.NODE_ENV !== "production") {
            baseOrigins.push("http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173");
        }
        const prodOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
        baseOrigins.push(...prodOrigins);
        if (process.env.FRONTEND_URL) {
            baseOrigins.push(process.env.FRONTEND_URL);
        }
        if (process.env.ADMIN_FRONTEND_URL) {
            baseOrigins.push(process.env.ADMIN_FRONTEND_URL);
        }
        const uniqueOrigins = [...new Set(baseOrigins)].filter(origin => origin && origin.trim().length > 0);
        return uniqueOrigins;
    }
    validateConfiguration() {
        const warnings = [];
        let isValid = true;
        const allowedOrigins = this.getAllowedOrigins();
        if (allowedOrigins.length === 0) {
            warnings.push("No allowed origins configured - this may block all requests");
            isValid = false;
        }
        if (process.env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
            warnings.push("Wildcard origin (*) not recommended for production");
            isValid = false;
        }
        if (process.env.NODE_ENV === "production") {
            const httpOrigins = allowedOrigins.filter(origin => origin.startsWith("http://") && !origin.includes("localhost"));
            if (httpOrigins.length > 0) {
                warnings.push(`HTTP origins in production: ${httpOrigins.join(", ")}`);
            }
        }
        if (process.env.NODE_ENV === "production") {
            const localhostOrigins = allowedOrigins.filter(origin => origin.includes("localhost") || origin.includes("127.0.0.1"));
            if (localhostOrigins.length > 0) {
                warnings.push(`Localhost origins in production: ${localhostOrigins.join(", ")}`);
            }
        }
        return { isValid, warnings };
    }
    getSecurityHeaders() {
        return {
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
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            referrerPolicy: "same-origin",
            noSniff: true,
            frameguard: { action: "deny" },
            xssFilter: true,
            hidePoweredBy: true
        };
    }
    getCookieSecurityConfig() {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            domain: process.env.COOKIE_DOMAIN || undefined,
            path: "/",
        };
    }
    logConfiguration() {
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
