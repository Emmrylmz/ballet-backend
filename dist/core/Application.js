import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { DatabaseService, } from "../services/DatabaseService.js";
import { LoggerService } from "../services/LoggerService.js";
import { errorHandler } from "../middleware/errorHandler.js";
import swaggerSpec from "../config/swagger.js";
import { AuthFactory } from "../features/auth/auth.factory.js";
import { InvitationFactory } from "../features/invitations/invitation.factory.js";
import { InvitationCleanupService } from "../features/invitations/invitation.cleanup.service.js";
import { InvitationRepository } from "../features/invitations/invitation.repository.js";
export class Application {
    app;
    server = null;
    database;
    logger;
    config;
    isStarted = false;
    authMiddleware;
    invitationCleanupService;
    constructor(config) {
        this.config = config;
        this.app = express();
        this.database = new DatabaseService(config.database);
        this.logger = new LoggerService(config.logger);
        this.setupGracefulShutdown();
    }
    async start() {
        try {
            if (this.isStarted) {
                throw new Error("Application already started");
            }
            this.logger.info("Starting application...");
            await this.startServices();
            this.setupMiddleware();
            await this.setupRoutes();
            this.setupErrorHandling();
            await this.startServer();
            this.isStarted = true;
            this.logger.info(`Application started successfully on port ${this.config.port}`);
        }
        catch (error) {
            this.logger.error("Failed to start application", { error });
            throw error;
        }
    }
    async stop() {
        try {
            if (!this.isStarted) {
                return;
            }
            this.logger.info("Stopping application...");
            await this.stopServer();
            await this.stopServices();
            this.isStarted = false;
            this.logger.info("Application stopped successfully.");
        }
        catch (error) {
            this.logger.error("Error during application shutdown", { error });
            throw error;
        }
    }
    getApp() {
        return this.app;
    }
    getDatabase() {
        return this.database;
    }
    getLogger() {
        return this.logger;
    }
    isReady() {
        return this.isStarted && this.database.getStatus().connected;
    }
    getAuthMiddleware() {
        return this.authMiddleware;
    }
    async startServices() {
        this.logger.info("Starting services...");
        await this.logger.start();
        this.logger.info("Logger service started");
        await this.database.start();
        this.logger.info("Database service started");
        this.database.on("error", (error) => {
            this.logger.error("Database error", { error });
        });
        this.database.on("connect", () => {
            this.logger.info("Database connected");
        });
        this.database.on("disconnect", () => {
            this.logger.warn("Database disconnected");
        });
        this.database.on("reconnecting", (attempt) => {
            this.logger.info(`Database reconnecting (attempt ${attempt})`);
        });
        this.database.on("reconnected", () => {
            this.logger.info("Database reconnected");
        });
        try {
            const invitationRepository = new InvitationRepository(this.database);
            this.invitationCleanupService = new InvitationCleanupService(invitationRepository, this.logger);
            this.invitationCleanupService.start();
            this.logger.info("Invitation cleanup service started");
        }
        catch (error) {
            this.logger.warn("Failed to start invitation cleanup service", { error });
        }
    }
    async stopServices() {
        this.logger.info("Stopping services...");
        try {
            if (this.invitationCleanupService) {
                this.invitationCleanupService.stop();
                this.logger.info("Invitation cleanup service stopped");
            }
        }
        catch (error) {
            this.logger.error("Error stopping invitation cleanup service", { error });
        }
        try {
            await this.database.stop();
            this.logger.info("Database service stopped");
        }
        catch (error) {
            this.logger.error("Error stopping database service", { error });
        }
        try {
            await this.logger.stop();
        }
        catch (error) {
            console.error("Error stopping logger service", error);
        }
    }
    setupMiddleware() {
        this.logger.info("Setting up middleware...");
        this.app.use(helmet());
        this.app.use(compression());
        const corsOptions = {
            origin: (origin, callback) => {
                if (!origin || this.config.cors.origins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: this.config.cors.credentials,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allowedHeaders: [
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "Accept",
                "Origin",
                "X-Establishment-ID",
            ],
        };
        this.app.use(cors(corsOptions));
        const limiter = rateLimit({
            windowMs: this.config.rateLimit.windowMs,
            max: this.config.rateLimit.max,
            message: {
                error: "Too many requests from this IP, please try again later",
            },
        });
        this.app.use(limiter);
        this.app.use(cookieParser());
        this.app.use(express.json({ limit: "10mb" }));
        this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
        this.app.use(this.logger.createRequestLogger());
        this.app.get("/health", (req, res) => {
            const status = {
                status: this.isReady() ? "healthy" : "unhealthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: this.database.getStatus(),
                memory: process.memoryUsage(),
            };
            const statusCode = status.status === "healthy" ? 200 : 503;
            res.status(statusCode).json(status);
        });
        if (this.config.swagger?.enabled) {
            this.app.use(this.config.swagger.path, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
            this.logger.info(`Swagger documentation available at ${this.config.swagger.path}`);
        }
    }
    async setupRoutes() {
        this.logger.info("Setting up routes...");
        await this.loadExistingRoutes();
        this.app.get("/api", (req, res) => {
            res.json({
                name: "Ballet Teacher Management API",
                version: "1.0.0",
                status: "running",
                timestamp: new Date().toISOString(),
            });
        });
    }
    async loadExistingRoutes() {
        await this.setupAuthModule();
        const routes = [
            { path: "/api/v1/auth", module: "auth", isAuth: true },
            {
                path: "/api/v1/invitations",
                module: "invitations",
                isInvitation: true,
            },
            {
                path: "/api/v1/dashboard",
                module: "../features/dashboard/dashboard.routes.js",
                isAuth: false,
            },
        ];
        for (const { path, module, isAuth, isInvitation } of routes) {
            try {
                if (isAuth) {
                    const authFactory = AuthFactory.getInstance();
                    const authRoutes = authFactory.getAuthRoutes();
                    if (authRoutes) {
                        this.app.use(path, authRoutes.getRouter());
                        this.logger.info(`Loaded auth routes: ${path}`);
                    }
                }
                else if (isInvitation) {
                    const invitationRoutes = await this.setupInvitationModule();
                    if (invitationRoutes) {
                        this.app.use(path, invitationRoutes);
                        this.logger.info(`Loaded invitation routes: ${path}`);
                    }
                }
                else {
                    const routeModule = await import(module);
                    const createRoutes = routeModule.default;
                    if (createRoutes && typeof createRoutes === "function") {
                        const router = createRoutes(this.database, this.logger);
                        this.app.use(path, router);
                        this.logger.info(`Loaded route: ${path}`);
                    }
                    else {
                        this.logger.warn(`Route creator function not found for ${path}`);
                    }
                }
            }
            catch (error) {
                this.logger.debug(`Skipped route ${path} - module not available`, {
                    error,
                });
            }
        }
    }
    async setupAuthModule() {
        try {
            const authFactory = AuthFactory.getInstance();
            const securitySettings = authFactory.getDefaultSecuritySettings();
            const authModule = authFactory.createAuthModule(this.database, this.logger, {
                accessTokenSecret: this.config.auth.accessTokenSecret,
                refreshTokenSecret: this.config.auth.refreshTokenSecret,
                frontendUrl: this.config.auth.frontendUrl,
                companyName: this.config.auth.companyName,
                supportEmail: this.config.auth.supportEmail,
                securitySettings,
            });
            this.authMiddleware = authModule.authMiddleware;
            this.logger.info("Auth module initialized successfully");
        }
        catch (error) {
            this.logger.error("Failed to setup auth module", { error });
            throw error;
        }
    }
    async setupInvitationModule() {
        try {
            const authFactory = AuthFactory.getInstance();
            const tokenService = authFactory.getTokenService();
            const authRepository = authFactory.getAuthRepository();
            const passwordService = authFactory.getPasswordService();
            if (!tokenService || !authRepository || !passwordService) {
                throw new Error("Auth module must be initialized before invitation module");
            }
            const invitationFactory = InvitationFactory.getInstance();
            const invitationModule = invitationFactory.createInvitationModule(this.database, this.logger, tokenService, authRepository, passwordService);
            this.logger.info("Invitation module initialized successfully");
            return invitationModule.invitationRoutes;
        }
        catch (error) {
            this.logger.error("Failed to setup invitation module", { error });
            throw error;
        }
    }
    loadRoute(path) {
        return null;
    }
    setupErrorHandling() {
        this.logger.info("Setting up error handling...");
        this.app.use(errorHandler);
    }
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(8001, () => {
                this.logger.info(`HTTP server listening on port ${this.config.port}`);
                resolve();
            });
            this.server.on("error", (error) => {
                this.logger.error("Server error", { error });
                if (error.code === "EADDRINUSE") {
                    this.logger.error(`Port ${this.config.port} is already in use. Exiting...`);
                    process.exit(1);
                }
                reject(error);
            });
        });
    }
    async stopServer() {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close((error) => {
                if (error) {
                    reject(error);
                }
                else {
                    this.logger.info("HTTP server stopped");
                    resolve();
                }
            });
        });
    }
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            this.logger.info(`Received ${signal}, starting graceful shutdown...`);
            try {
                await this.stop();
                setTimeout(() => process.exit(0), 100);
            }
            catch (error) {
                this.logger.error("Error during graceful shutdown", { error });
                process.exit(1);
            }
        };
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGQUIT", () => shutdown("SIGQUIT"));
        process.on("SIGHUP", () => shutdown("SIGHUP"));
        process.on("SIGUSR2", () => shutdown("SIGUSR2"));
        process.on("uncaughtException", (error) => {
            this.logger.error("Uncaught Exception", { error });
            process.exit(1);
        });
        process.on("unhandledRejection", (reason, promise) => {
            this.logger.error("Unhandled Rejection", { reason, promise });
            process.exit(1);
        });
    }
}
