import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { ClassesRepository } from './classes.repository.js';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { Router } from 'express';
import createClassesRoutes from './classes.routes.js';

export class ClassesFactory {
  private static instance: ClassesFactory;
  private classesService?: ClassesService;
  private classesController?: ClassesController;
  private classesRepository?: ClassesRepository;
  private classesRouter?: Router;

  private constructor() {}

  static getInstance(): ClassesFactory {
    if (!ClassesFactory.instance) {
      ClassesFactory.instance = new ClassesFactory();
    }
    return ClassesFactory.instance;
  }

  createClassesModule(
    db: DatabaseService,
    logger: LoggerService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    passwordService: PasswordService,
    cookieService: CookieService
  ): {
    classesService: ClassesService;
    classesController: ClassesController;
    classesRouter: Router;
  } {
    // Create repository
    this.classesRepository = new ClassesRepository(db);

    // Create service
    this.classesService = new ClassesService(this.classesRepository, logger);

    // Create controller
    this.classesController = new ClassesController(this.classesService, logger);

    // Create auth and establishment middleware instances
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

    // Create routes using the existing factory function
    this.classesRouter = createClassesRoutes(
      db,
      logger,
      tokenService,
      authRepository,
      passwordService,
      cookieService
    );

    return {
      classesService: this.classesService,
      classesController: this.classesController,
      classesRouter: this.classesRouter
    };
  }

  getClassesService(): ClassesService | undefined {
    return this.classesService;
  }

  getClassesController(): ClassesController | undefined {
    return this.classesController;
  }

  getClassesRepository(): ClassesRepository | undefined {
    return this.classesRepository;
  }

  getClassesRouter(): Router | undefined {
    return this.classesRouter;
  }
}