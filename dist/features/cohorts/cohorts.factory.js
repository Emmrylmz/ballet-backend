import { CohortsRepository } from './cohorts.repository.js';
import { CohortsService } from './cohorts.service.js';
import { CohortsController } from './cohorts.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { createCohortsRoutes } from './cohorts.routes.js';
export class CohortsFactory {
    static instance;
    cohortsService;
    cohortsController;
    cohortsRepository;
    cohortsRouter;
    constructor() { }
    static getInstance() {
        if (!CohortsFactory.instance) {
            CohortsFactory.instance = new CohortsFactory();
        }
        return CohortsFactory.instance;
    }
    createCohortsModule(db, logger, tokenService, authRepository, passwordService, cookieService) {
        this.cohortsRepository = new CohortsRepository(db);
        this.cohortsService = new CohortsService(this.cohortsRepository, db, logger);
        this.cohortsController = new CohortsController(this.cohortsService, logger, db);
        const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
        const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
        this.cohortsRouter = createCohortsRoutes(db, logger, authMiddleware, establishmentMiddleware);
        return {
            cohortsService: this.cohortsService,
            cohortsController: this.cohortsController,
            cohortsRouter: this.cohortsRouter
        };
    }
    getCohortsService() {
        return this.cohortsService;
    }
    getCohortsController() {
        return this.cohortsController;
    }
    getCohortsRepository() {
        return this.cohortsRepository;
    }
    getCohortsRouter() {
        return this.cohortsRouter;
    }
}
