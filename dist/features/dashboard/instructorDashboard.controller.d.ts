import { Request, Response, NextFunction } from "express";
import { InstructorDashboardService } from "./instructorDashboard.service.js";
import { LoggerService } from "../../services/LoggerService.js";
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishmentId: string;
        role: string;
        permissions: string[];
    };
    establishment?: {
        id: string;
        name: string;
    };
}
export declare class InstructorDashboardController {
    private service;
    private logger;
    constructor(service: InstructorDashboardService, logger: LoggerService);
    private validateInstructorAccess;
    getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getRecentActivities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getWeeklySummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getTodaysClasses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getDashboardOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getHealth(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
