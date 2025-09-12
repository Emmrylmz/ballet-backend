import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { StudentsRepository } from './students.repository.js';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { Router } from 'express';
import createStudentsRoutes from './students.routes.js';

export class StudentsFactory {
  private static instance: StudentsFactory;
  private studentsService?: StudentsService;
  private studentsController?: StudentsController;
  private studentsRepository?: StudentsRepository;
  private studentsRouter?: Router;

  private constructor() {}

  static getInstance(): StudentsFactory {
    if (!StudentsFactory.instance) {
      StudentsFactory.instance = new StudentsFactory();
    }
    return StudentsFactory.instance;
  }

  createStudentsModule(
    db: DatabaseService,
    logger: LoggerService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    passwordService: PasswordService,
    cookieService: CookieService
  ): {
    studentsService: StudentsService;
    studentsController: StudentsController;
    studentsRouter: Router;
  } {
    // Create repository
    this.studentsRepository = new StudentsRepository(db);

    // Create service
    this.studentsService = new StudentsService(this.studentsRepository, logger);

    // Create controller
    this.studentsController = new StudentsController(this.studentsService, logger);

    // Create auth and establishment middleware instances
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

    // Create routes using the existing factory function
    this.studentsRouter = createStudentsRoutes(
      db,
      logger,
      tokenService,
      authRepository,
      passwordService,
      cookieService
    );

    return {
      studentsService: this.studentsService,
      studentsController: this.studentsController,
      studentsRouter: this.studentsRouter
    };
  }

  getStudentsService(): StudentsService | undefined {
    return this.studentsService;
  }

  getStudentsController(): StudentsController | undefined {
    return this.studentsController;
  }

  getStudentsRepository(): StudentsRepository | undefined {
    return this.studentsRepository;
  }

  getStudentsRouter(): Router | undefined {
    return this.studentsRouter;
  }
}