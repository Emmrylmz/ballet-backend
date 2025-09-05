import { Express } from 'express';
import { DatabaseService, DatabaseConfig } from '../services/DatabaseService.js';
import { LoggerService, LoggerConfig } from '../services/LoggerService.js';
export interface SimpleApplicationConfig {
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
}
export declare class SimpleApplication {
    private app;
    private server;
    private database;
    private logger;
    private config;
    private isStarted;
    constructor(config: SimpleApplicationConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getApp(): Express;
    getDatabase(): DatabaseService;
    getLogger(): LoggerService;
    isReady(): boolean;
    private startServices;
    private stopServices;
    private setupMiddleware;
    private setupBasicRoutes;
    private setupFeatureRoutes;
    private setupErrorHandling;
    private startServer;
    private stopServer;
    private setupGracefulShutdown;
}
