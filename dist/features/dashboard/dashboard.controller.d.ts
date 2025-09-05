import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { LoggerService } from '../../services/LoggerService.js';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        establishmentId: string;
        role: string;
        email: string;
    };
}
export declare class DashboardController {
    private service;
    private logger;
    constructor(service: DashboardService, logger: LoggerService);
    getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getRecentActivities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getWeeklySummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getTodaysClasses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getDashboardOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getHealth(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
