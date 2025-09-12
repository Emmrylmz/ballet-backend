import { Express } from "express";
import { DatabaseService, DatabaseConfig } from "../services/DatabaseService.js";
import { LoggerService, LoggerConfig } from "../services/LoggerService.js";
import { AuthMiddleware } from "../features/auth/middleware/AuthMiddleware.js";
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
export declare class Application {
    private app;
    private server;
    private database;
    private logger;
    private config;
    private isStarted;
    private authMiddleware?;
    private invitationCleanupService?;
    constructor(config: ApplicationConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getApp(): Express;
    getDatabase(): DatabaseService;
    getLogger(): LoggerService;
    isReady(): boolean;
    getAuthMiddleware(): AuthMiddleware | undefined;
    private startServices;
    private stopServices;
    private setupMiddleware;
    private setupRoutes;
    private loadExistingRoutes;
    private setupAuthModule;
    private setupInvitationModule;
    private setupClassesModule;
    private setupCohortsModule;
    private setupDashboardModule;
    private setupStudentsModule;
    private setupAttendanceModule;
    private loadRoute;
    private setupErrorHandling;
    private startServer;
    private stopServer;
    private setupGracefulShutdown;
}
