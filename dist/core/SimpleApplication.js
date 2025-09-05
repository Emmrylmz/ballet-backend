import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from '../services/DatabaseService.js';
import { LoggerService } from '../services/LoggerService.js';
import { errorHandler } from '../middleware/errorHandler.js';
export class SimpleApplication {
    app;
    server = null;
    database;
    logger;
    config;
    isStarted = false;
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
                throw new Error('Application already started');
            }
            this.logger.info('Starting simple application...');
            await this.startServices();
            this.setupMiddleware();
            await this.setupBasicRoutes();
            this.setupErrorHandling();
            await this.startServer();
            this.isStarted = true;
            this.logger.info(`Simple application started successfully on port ${this.config.port}`);
        }
        catch (error) {
            this.logger.error('Failed to start simple application', { error });
            throw error;
        }
    }
    async stop() {
        try {
            if (!this.isStarted) {
                return;
            }
            this.logger.info('Stopping simple application...');
            await this.stopServer();
            await this.stopServices();
            this.isStarted = false;
            this.logger.info('Simple application stopped successfully');
        }
        catch (error) {
            this.logger.error('Error during simple application shutdown', { error });
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
    async startServices() {
        this.logger.info('Starting services...');
        await this.logger.start();
        this.logger.info('Logger service started');
        await this.database.start();
        this.logger.info('Database service started');
        this.database.on('error', (error) => {
            this.logger.error('Database error', { error });
        });
        this.database.on('connect', () => {
            this.logger.info('Database connected');
        });
    }
    async stopServices() {
        this.logger.info('Stopping services...');
        try {
            await this.database.stop();
            this.logger.info('Database service stopped');
        }
        catch (error) {
            this.logger.error('Error stopping database service', { error });
        }
        try {
            await this.logger.stop();
        }
        catch (error) {
            console.error('Error stopping logger service', error);
        }
    }
    setupMiddleware() {
        this.logger.info('Setting up middleware...');
        this.app.use(helmet());
        this.app.use(compression());
        const corsOptions = {
            origin: (origin, callback) => {
                if (!origin || this.config.cors.origins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: this.config.cors.credentials,
        };
        this.app.use(cors(corsOptions));
        const limiter = rateLimit({
            windowMs: this.config.rateLimit.windowMs,
            max: this.config.rateLimit.max,
            message: {
                error: 'Too many requests from this IP, please try again later',
            },
        });
        this.app.use(limiter);
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(this.logger.createRequestLogger());
    }
    async setupBasicRoutes() {
        this.logger.info('Setting up basic routes...');
        this.app.get('/health', (req, res) => {
            const status = {
                status: this.isReady() ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: this.database.getStatus(),
                memory: process.memoryUsage(),
            };
            const statusCode = status.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(status);
        });
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Ballet Teacher Management API',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
            });
        });
        this.app.get('/api/test-db', async (req, res) => {
            try {
                const result = await this.database.query('SELECT NOW() as current_time, version()');
                res.json({
                    success: true,
                    data: result.rows[0],
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });
        await this.setupFeatureRoutes();
    }
    async setupFeatureRoutes() {
        this.logger.info('Setting up feature routes...');
        try {
            const { default: createDashboardRoutes } = await import('../features/dashboard/dashboard.routes.js');
            this.app.use('/api/v1/dashboard', createDashboardRoutes(this.database, this.logger));
            this.logger.info('Dashboard routes loaded successfully');
        }
        catch (error) {
            this.logger.warn('Failed to setup feature routes', { error });
        }
    }
    setupErrorHandling() {
        this.logger.info('Setting up error handling...');
        this.app.use(errorHandler);
    }
    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, () => {
                this.logger.info(`HTTP server listening on port ${this.config.port}`);
                resolve();
            });
            this.server.on('error', (error) => {
                this.logger.error('Server error', { error });
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
                    this.logger.info('HTTP server stopped');
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
                process.exit(0);
            }
            catch (error) {
                this.logger.error('Error during graceful shutdown', { error });
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception', { error });
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection', { reason, promise });
            process.exit(1);
        });
    }
}
