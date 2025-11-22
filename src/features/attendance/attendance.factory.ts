import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { AuditLogService } from '../../services/AuditLogService.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { Router } from 'express';
import createAttendanceRoutes from './attendance.routes.js';

export class AttendanceFactory {
  private static instance: AttendanceFactory;
  private attendanceRepository?: AttendanceRepository;
  private attendanceService?: AttendanceService;
  private attendanceController?: AttendanceController;
  private attendanceRouter?: Router;

  private constructor() {}

  static getInstance(): AttendanceFactory {
    if (!AttendanceFactory.instance) {
      AttendanceFactory.instance = new AttendanceFactory();
    }
    return AttendanceFactory.instance;
  }

  createAttendanceModule(
    db: DatabaseService,
    logger: LoggerService,
    auditLogService: AuditLogService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    passwordService: PasswordService,
    cookieService: CookieService
  ): {
    attendanceRepository: AttendanceRepository;
    attendanceService: AttendanceService;
    attendanceController: AttendanceController;
    attendanceRouter: Router;
  } {
    // Create repository
    this.attendanceRepository = new AttendanceRepository(db);

    // Create service with repository and logger
    this.attendanceService = new AttendanceService(
      this.attendanceRepository,
      logger
    );

    // Create controller with service and logger
    this.attendanceController = new AttendanceController(
      this.attendanceService,
      logger
    );

    // Create auth and establishment middleware instances
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

    // Create routes using the factory function
    const routeFactory = createAttendanceRoutes(
      db,
      logger,
      auditLogService,
      tokenService,
      authRepository,
      passwordService,
      cookieService
    );

    // Apply the controller to get the configured router
    this.attendanceRouter = routeFactory(this.attendanceController);

    return {
      attendanceRepository: this.attendanceRepository,
      attendanceService: this.attendanceService,
      attendanceController: this.attendanceController,
      attendanceRouter: this.attendanceRouter
    };
  }

  // Getter methods for accessing individual components
  getAttendanceRepository(): AttendanceRepository | undefined {
    return this.attendanceRepository;
  }

  getAttendanceService(): AttendanceService | undefined {
    return this.attendanceService;
  }

  getAttendanceController(): AttendanceController | undefined {
    return this.attendanceController;
  }

  getAttendanceRouter(): Router | undefined {
    return this.attendanceRouter;
  }

  // Method to reset the factory (useful for testing)
  reset(): void {
    this.attendanceRepository = undefined;
    this.attendanceService = undefined;
    this.attendanceController = undefined;
    this.attendanceRouter = undefined;
  }

  // Method to check if module is initialized
  isInitialized(): boolean {
    return !!(
      this.attendanceRepository &&
      this.attendanceService &&
      this.attendanceController &&
      this.attendanceRouter
    );
  }
}