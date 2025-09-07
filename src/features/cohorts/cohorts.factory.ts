import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { CohortsRepository } from './cohorts.repository.js';
import { CohortsService } from './cohorts.service.js';
import { CohortsController } from './cohorts.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { Router } from 'express';
import { createCohortsRoutes } from './cohorts.routes.js';

export class CohortsFactory {
  private static instance: CohortsFactory;
  private cohortsService?: CohortsService;
  private cohortsController?: CohortsController;
  private cohortsRepository?: CohortsRepository;
  private cohortsRouter?: Router;

  private constructor() {}

  static getInstance(): CohortsFactory {
    if (!CohortsFactory.instance) {
      CohortsFactory.instance = new CohortsFactory();
    }
    return CohortsFactory.instance;
  }

  createCohortsModule(
    db: DatabaseService,
    logger: LoggerService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    passwordService: PasswordService,
    cookieService: CookieService
  ): {
    cohortsService: CohortsService;
    cohortsController: CohortsController;
    cohortsRouter: Router;
  } {
    // Create repository
    this.cohortsRepository = new CohortsRepository(db);

    // Create service
    this.cohortsService = new CohortsService(this.cohortsRepository, db, logger);

    // Create controller
    this.cohortsController = new CohortsController(this.cohortsService, logger, db);

    // Create auth and establishment middleware instances
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

    // Create routes using the existing factory function
    this.cohortsRouter = createCohortsRoutes(
      db,
      logger,
      authMiddleware,
      establishmentMiddleware
    );

    return {
      cohortsService: this.cohortsService,
      cohortsController: this.cohortsController,
      cohortsRouter: this.cohortsRouter
    };
  }

  getCohortsService(): CohortsService | undefined {
    return this.cohortsService;
  }

  getCohortsController(): CohortsController | undefined {
    return this.cohortsController;
  }

  getCohortsRepository(): CohortsRepository | undefined {
    return this.cohortsRepository;
  }

  getCohortsRouter(): Router | undefined {
    return this.cohortsRouter;
  }
}