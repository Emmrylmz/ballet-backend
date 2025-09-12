import { InstructorDashboardRepository } from './instructorDashboard.repository.js';
import { InstructorDashboardService } from './instructorDashboard.service.js';
import { InstructorDashboardController } from './instructorDashboard.controller.js';
import createInstructorDashboardRoutes from './instructorDashboard.routes.js';
export class DashboardFactory {
    static instance;
    instructorDashboardService;
    instructorDashboardController;
    instructorDashboardRepository;
    dashboardRouter;
    constructor() { }
    static getInstance() {
        if (!DashboardFactory.instance) {
            DashboardFactory.instance = new DashboardFactory();
        }
        return DashboardFactory.instance;
    }
    createDashboardModule(db, logger, tokenService, authRepository, cookieService) {
        this.instructorDashboardRepository = new InstructorDashboardRepository(db);
        this.instructorDashboardService = new InstructorDashboardService(this.instructorDashboardRepository, logger);
        this.instructorDashboardController = new InstructorDashboardController(this.instructorDashboardService, logger);
        this.dashboardRouter = createInstructorDashboardRoutes(db, logger, tokenService, authRepository, cookieService);
        return {
            instructorDashboardService: this.instructorDashboardService,
            instructorDashboardController: this.instructorDashboardController,
            dashboardRouter: this.dashboardRouter
        };
    }
    getInstructorDashboardService() {
        return this.instructorDashboardService;
    }
    getInstructorDashboardController() {
        return this.instructorDashboardController;
    }
    getInstructorDashboardRepository() {
        return this.instructorDashboardRepository;
    }
    getDashboardRouter() {
        return this.dashboardRouter;
    }
}
