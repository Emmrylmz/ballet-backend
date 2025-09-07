import express, { Express, Router } from "express";
import { Server } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import {
  DatabaseService,
  DatabaseConfig,
} from "../services/DatabaseService.js";
import { LoggerService, LoggerConfig } from "../services/LoggerService.js";
import { errorHandler } from "../middleware/errorHandler.js";
import swaggerSpec from "../config/swagger.js";
import { AuthFactory } from "../features/auth/auth.factory.js";
import { AuthMiddleware } from "../features/auth/middleware/AuthMiddleware.js";
import { InvitationFactory } from "../features/invitations/invitation.factory.js";
import { InvitationCleanupService } from "../features/invitations/invitation.cleanup.service.js";
import { InvitationRepository } from "../features/invitations/invitation.repository.js";
import { ClassesFactory } from "../features/classes/classes.factory.js";
import { CohortsFactory } from "../features/cohorts/cohorts.factory.js";
import { DashboardFactory } from "../features/dashboard/dashboard.factory.js";

export interface ApplicationConfig {
  port: number;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  database: DatabaseConfig;
  logger: LoggerConfig;
  auth: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    frontendUrl: string;
    companyName: string;
    supportEmail: string;
  };
  swagger?: {
    enabled: boolean;
    path: string;
  };
}

export class Application {
  private app: Express;
  private server: Server | null = null;
  private database: DatabaseService;
  private logger: LoggerService;
  private config: ApplicationConfig;
  private isStarted: boolean = false;
  private authMiddleware?: AuthMiddleware;
  private invitationCleanupService?: InvitationCleanupService;

  constructor(config: ApplicationConfig) {
    this.config = config;
    this.app = express();
    this.database = new DatabaseService(config.database);
    this.logger = new LoggerService(config.logger);

    this.setupGracefulShutdown();
  }

  async start(): Promise<void> {
    try {
      if (this.isStarted) {
        throw new Error("Application already started");
      }

      this.logger.info("Starting application...");

      // Start services
      await this.startServices();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      await this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Start HTTP server
      await this.startServer();

      this.isStarted = true;
      this.logger.info(
        `Application started successfully on port ${this.config.port}`
      );
    } catch (error) {
      this.logger.error("Failed to start application", { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (!this.isStarted) {
        return;
      }

      this.logger.info("Stopping application...");

      // Stop HTTP server
      await this.stopServer();

      // Stop services
      await this.stopServices();

      this.isStarted = false;
      this.logger.info("Application stopped successfully.");
    } catch (error) {
      this.logger.error("Error during application shutdown", { error });
      throw error;
    }
  }

  getApp(): Express {
    return this.app;
  }

  getDatabase(): DatabaseService {
    return this.database;
  }

  getLogger(): LoggerService {
    return this.logger;
  }

  isReady(): boolean {
    return this.isStarted && this.database.getStatus().connected;
  }

  getAuthMiddleware(): AuthMiddleware | undefined {
    return this.authMiddleware;
  }

  private async startServices(): Promise<void> {
    this.logger.info("Starting services...");

    // Start logger service
    await this.logger.start();
    this.logger.info("Logger service started");

    // Start database service
    await this.database.start();
    this.logger.info("Database service started");

    // Setup database event listeners
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

    // Start invitation cleanup service
    try {
      const invitationRepository = new InvitationRepository(this.database);
      this.invitationCleanupService = new InvitationCleanupService(
        invitationRepository,
        this.logger
      );
      this.invitationCleanupService.start();
      this.logger.info("Invitation cleanup service started");
    } catch (error) {
      this.logger.warn("Failed to start invitation cleanup service", { error });
    }
  }

  private async stopServices(): Promise<void> {
    this.logger.info("Stopping services...");

    // Stop invitation cleanup service
    try {
      if (this.invitationCleanupService) {
        this.invitationCleanupService.stop();
        this.logger.info("Invitation cleanup service stopped");
      }
    } catch (error) {
      this.logger.error("Error stopping invitation cleanup service", { error });
    }

    try {
      await this.database.stop();
      this.logger.info("Database service stopped");
    } catch (error) {
      this.logger.error("Error stopping database service", { error });
    }

    try {
      await this.logger.stop();
    } catch (error) {
      console.error("Error stopping logger service", error);
    }
  }

  private setupMiddleware(): void {
    this.logger.info("Setting up middleware...");

    // Security middleware
    this.app.use(helmet());

    // Compression
    this.app.use(compression());

    // CORS
    const corsOptions = {
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ) => {
        if (!origin || this.config.cors.origins.includes(origin)) {
          callback(null, true);
        } else {
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

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: {
        error: "Too many requests from this IP, please try again later",
      },
    });
    this.app.use(limiter);

    // Cookie parsing (must be before auth middleware)
    this.app.use(cookieParser());

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging
    this.app.use(this.logger.createRequestLogger());

    // Health check
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

    // API documentation
    if (this.config.swagger?.enabled) {
      this.app.use(
        this.config.swagger.path,
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec)
      );
      this.logger.info(
        `Swagger documentation available at ${this.config.swagger.path}`
      );
    }
  }

  private async setupRoutes(): Promise<void> {
    this.logger.info("Setting up routes...");

    // Setup existing routes if they exist
    await this.loadExistingRoutes();

    // API info endpoint
    this.app.get("/api", (req, res) => {
      res.json({
        name: "Ballet Teacher Management API",
        version: "1.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async loadExistingRoutes(): Promise<void> {
    // Initialize auth module first
    await this.setupAuthModule();

    const routes = [
      { path: "/api/v1/auth", module: "auth", isAuth: true },
      {
        path: "/api/v1/invitations",
        module: "invitations",
        isInvitation: true,
      },
      {
        path: "/api/v1/classes",
        module: "classes",
        isClasses: true,
      },
      {
        path: "/api/v1/cohorts",
        module: "cohorts",
        isCohorts: true,
      },
      {
        path: "/api/v1/dashboard",
        module: "dashboard",
        isDashboard: true,
      },
    ];

    for (const { path, module, isAuth, isInvitation, isClasses, isCohorts, isDashboard } of routes) {
      try {
        if (isAuth) {
          // Handle auth routes specially
          const authFactory = AuthFactory.getInstance();
          const authRoutes = authFactory.getAuthRoutes();
          if (authRoutes) {
            this.app.use(path, authRoutes.getRouter());
            this.logger.info(`Loaded auth routes: ${path}`);
          }
        } else if (isInvitation) {
          // Handle invitation routes specially
          const invitationRoutes = await this.setupInvitationModule();
          if (invitationRoutes) {
            this.app.use(path, invitationRoutes);
            this.logger.info(`Loaded invitation routes: ${path}`);
          }
        } else if (isClasses) {
          // Handle classes routes specially
          const classesRoutes = await this.setupClassesModule();
          if (classesRoutes) {
            this.app.use(path, classesRoutes);
            this.logger.info(`Loaded classes routes: ${path}`);
          }
        } else if (isCohorts) {
          // Handle cohorts routes specially
          const cohortRoutes = await this.setupCohortsModule();
          if (cohortRoutes) {
            this.app.use(path, cohortRoutes);
            this.logger.info(`Loaded cohorts routes: ${path}`);
          }
        } else if (isDashboard) {
          // Handle dashboard routes specially
          const dashboardRoutes = await this.setupDashboardModule();
          if (dashboardRoutes) {
            this.app.use(path, dashboardRoutes);
            this.logger.info(`Loaded dashboard routes: ${path}`);
          }
        } else {
          // Handle other routes
          const routeModule = await import(module);
          const createRoutes = routeModule.default;

          if (createRoutes && typeof createRoutes === "function") {
            const router = createRoutes(this.database, this.logger);
            this.app.use(path, router);
            this.logger.info(`Loaded route: ${path}`);
          } else {
            this.logger.warn(`Route creator function not found for ${path}`);
          }
        }
      } catch (error) {
        this.logger.debug(`Skipped route ${path} - module not available`, {
          error,
        });
      }
    }
  }

  private async setupAuthModule(): Promise<void> {
    try {
      const authFactory = AuthFactory.getInstance();
      const securitySettings = authFactory.getDefaultSecuritySettings();

      const authModule = authFactory.createAuthModule(
        this.database,
        this.logger,
        {
          accessTokenSecret: this.config.auth.accessTokenSecret,
          refreshTokenSecret: this.config.auth.refreshTokenSecret,
          frontendUrl: this.config.auth.frontendUrl,
          companyName: this.config.auth.companyName,
          supportEmail: this.config.auth.supportEmail,
          securitySettings,
        }
      );

      this.authMiddleware = authModule.authMiddleware;
      this.logger.info("Auth module initialized successfully");
    } catch (error) {
      this.logger.error("Failed to setup auth module", { error });
      throw error;
    }
  }

  private async setupInvitationModule(): Promise<Router> {
    try {
      const authFactory = AuthFactory.getInstance();

      // Get required services from auth factory
      const tokenService = authFactory.getTokenService();
      const authRepository = authFactory.getAuthRepository();
      const passwordService = authFactory.getPasswordService();
      const cookieService = authFactory.getCookieService();

      if (!tokenService || !authRepository || !passwordService || !cookieService) {
        throw new Error(
          "Auth module must be initialized before invitation module"
        );
      }

      const invitationFactory = InvitationFactory.getInstance();
      const invitationModule = invitationFactory.createInvitationModule(
        this.database,
        this.logger,
        tokenService,
        authRepository,
        passwordService,
        cookieService
      );

      this.logger.info("Invitation module initialized successfully");
      return invitationModule.invitationRoutes;
    } catch (error) {
      this.logger.error("Failed to setup invitation module", { error });
      throw error;
    }
  }

  private async setupClassesModule(): Promise<Router> {
    try {
      const authFactory = AuthFactory.getInstance();

      // Get required services from auth factory
      const tokenService = authFactory.getTokenService();
      const authRepository = authFactory.getAuthRepository();
      const passwordService = authFactory.getPasswordService();
      const cookieService = authFactory.getCookieService();

      if (!tokenService || !authRepository || !passwordService || !cookieService) {
        throw new Error(
          "Auth module must be initialized before classes module"
        );
      }

      // Create classes module using factory
      const classesFactory = ClassesFactory.getInstance();
      const classesModule = classesFactory.createClassesModule(
        this.database,
        this.logger,
        tokenService,
        authRepository,
        passwordService,
        cookieService
      );

      this.logger.info("Classes module initialized successfully");
      return classesModule.classesRouter;
    } catch (error) {
      this.logger.error("Failed to setup classes module", { error });
      throw error;
    }
  }

  private async setupCohortsModule(): Promise<Router> {
    try {
      const authFactory = AuthFactory.getInstance();

      // Get required services from auth factory
      const tokenService = authFactory.getTokenService();
      const authRepository = authFactory.getAuthRepository();
      const passwordService = authFactory.getPasswordService();
      const cookieService = authFactory.getCookieService();

      if (!tokenService || !authRepository || !passwordService || !cookieService) {
        throw new Error(
          "Auth module must be initialized before cohorts module"
        );
      }

      // Create cohorts module using factory
      const cohortsFactory = CohortsFactory.getInstance();
      const cohortsModule = cohortsFactory.createCohortsModule(
        this.database,
        this.logger,
        tokenService,
        authRepository,
        passwordService,
        cookieService
      );

      this.logger.info("Cohorts module initialized successfully");
      return cohortsModule.cohortsRouter;
    } catch (error) {
      this.logger.error("Failed to setup cohorts module", { error });
      throw error;
    }
  }

  private async setupDashboardModule(): Promise<Router> {
    try {
      const authFactory = AuthFactory.getInstance();

      // Get required services from auth factory
      const tokenService = authFactory.getTokenService();
      const authRepository = authFactory.getAuthRepository();
      const cookieService = authFactory.getCookieService();

      if (!tokenService || !authRepository || !cookieService) {
        throw new Error(
          "Auth module must be initialized before dashboard module"
        );
      }

      // Create dashboard module using factory
      const dashboardFactory = DashboardFactory.getInstance();
      const dashboardModule = dashboardFactory.createDashboardModule(
        this.database,
        this.logger,
        tokenService,
        authRepository,
        cookieService
      );

      this.logger.info("Dashboard module initialized successfully");
      return dashboardModule.dashboardRouter;
    } catch (error) {
      this.logger.error("Failed to setup dashboard module", { error });
      throw error;
    }
  }

  private loadRoute(path: string): any {
    // This method is deprecated in favor of loadExistingRoutes
    return null;
  }

  private setupErrorHandling(): void {
    this.logger.info("Setting up error handling...");
    this.app.use(errorHandler);
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(8001, () => {
        this.logger.info(`HTTP server listening on port ${this.config.port}`);
        resolve();
      });

      this.server.on("error", (error: any) => {
        this.logger.error("Server error", { error });

        // If port is busy, exit immediately to prevent conflicting logs
        if (error.code === "EADDRINUSE") {
          this.logger.error(
            `Port ${this.config.port} is already in use. Exiting...`
          );
          process.exit(1);
        }

        reject(error);
      });
    });
  }
  private async stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info("HTTP server stopped");
          resolve();
        }
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        await this.stop();
        // Add a small delay to ensure port is fully released
        setTimeout(() => process.exit(0), 100);
      } catch (error) {
        this.logger.error("Error during graceful shutdown", { error });
        process.exit(1);
      }
    };

    // Handle more signals that tsx might send
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGQUIT", () => shutdown("SIGQUIT"));
    process.on("SIGHUP", () => shutdown("SIGHUP"));

    // Handle tsx watch restarts
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
