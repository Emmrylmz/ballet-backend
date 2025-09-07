import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { InstructorDashboardRepository } from './instructorDashboard.repository.js';
import { InstructorDashboardService } from './instructorDashboard.service.js';
import { InstructorDashboardController } from './instructorDashboard.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { CookieService } from '../auth/services/CookieService.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { Router } from 'express';
import createInstructorDashboardRoutes from './instructorDashboard.routes.js';

export class DashboardFactory {
  private static instance: DashboardFactory;
  private instructorDashboardService?: InstructorDashboardService;
  private instructorDashboardController?: InstructorDashboardController;
  private instructorDashboardRepository?: InstructorDashboardRepository;
  private dashboardRouter?: Router;

  private constructor() {}

  static getInstance(): DashboardFactory {
    if (!DashboardFactory.instance) {
      DashboardFactory.instance = new DashboardFactory();
    }
    return DashboardFactory.instance;
  }

  createDashboardModule(
    db: DatabaseService,
    logger: LoggerService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    cookieService: CookieService
  ): {
    instructorDashboardService: InstructorDashboardService;
    instructorDashboardController: InstructorDashboardController;
    dashboardRouter: Router;
  } {
    // Create repository
    this.instructorDashboardRepository = new InstructorDashboardRepository(db);

    // Create service
    this.instructorDashboardService = new InstructorDashboardService(
      this.instructorDashboardRepository,
      logger
    );

    // Create controller
    this.instructorDashboardController = new InstructorDashboardController(
      this.instructorDashboardService,
      logger
    );

    // Create routes using the existing factory function
    this.dashboardRouter = createInstructorDashboardRoutes(
      db,
      logger,
      tokenService,
      authRepository,
      cookieService
    );

    return {
      instructorDashboardService: this.instructorDashboardService,
      instructorDashboardController: this.instructorDashboardController,
      dashboardRouter: this.dashboardRouter
    };
  }

  getInstructorDashboardService(): InstructorDashboardService | undefined {
    return this.instructorDashboardService;
  }

  getInstructorDashboardController(): InstructorDashboardController | undefined {
    return this.instructorDashboardController;
  }

  getInstructorDashboardRepository(): InstructorDashboardRepository | undefined {
    return this.instructorDashboardRepository;
  }

  getDashboardRouter(): Router | undefined {
    return this.dashboardRouter;
  }
}