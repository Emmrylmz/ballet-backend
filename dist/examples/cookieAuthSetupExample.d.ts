import express from 'express';
export declare class SecureCookieAuthApp {
    private app;
    private logger;
    private db;
    private corsConfig;
    private authService;
    private authController;
    private cookieService;
    private authMiddleware;
    constructor();
    private initializeServices;
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    private handleAdminUsers;
    private handleInstructorDashboard;
    private handleEstablishmentData;
    private handleHealthCheck;
    private handleCookieDebug;
    start(port?: number): Promise<void>;
    getApp(): express.Application;
}
export declare function startSecureAuthServer(): Promise<void>;
export default SecureCookieAuthApp;
