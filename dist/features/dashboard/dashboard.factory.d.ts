import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { InstructorDashboardRepository } from './instructorDashboard.repository.js';
import { InstructorDashboardService } from './instructorDashboard.service.js';
import { InstructorDashboardController } from './instructorDashboard.controller.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { CookieService } from '../auth/services/CookieService.js';
import { Router } from 'express';
export declare class DashboardFactory {
    private static instance;
    private instructorDashboardService?;
    private instructorDashboardController?;
    private instructorDashboardRepository?;
    private dashboardRouter?;
    private constructor();
    static getInstance(): DashboardFactory;
    createDashboardModule(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, cookieService: CookieService): {
        instructorDashboardService: InstructorDashboardService;
        instructorDashboardController: InstructorDashboardController;
        dashboardRouter: Router;
    };
    getInstructorDashboardService(): InstructorDashboardService | undefined;
    getInstructorDashboardController(): InstructorDashboardController | undefined;
    getInstructorDashboardRepository(): InstructorDashboardRepository | undefined;
    getDashboardRouter(): Router | undefined;
}
