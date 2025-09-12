import { ClassesRepository } from './classes.repository.js';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import createClassesRoutes from './classes.routes.js';
export class ClassesFactory {
    static instance;
    classesService;
    classesController;
    classesRepository;
    classesRouter;
    constructor() { }
    static getInstance() {
        if (!ClassesFactory.instance) {
            ClassesFactory.instance = new ClassesFactory();
        }
        return ClassesFactory.instance;
    }
    createClassesModule(db, logger, tokenService, authRepository, passwordService, cookieService) {
        this.classesRepository = new ClassesRepository(db);
        this.classesService = new ClassesService(this.classesRepository, logger);
        this.classesController = new ClassesController(this.classesService, logger);
        const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
        const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
        this.classesRouter = createClassesRoutes(db, logger, tokenService, authRepository, passwordService, cookieService);
        return {
            classesService: this.classesService,
            classesController: this.classesController,
            classesRouter: this.classesRouter
        };
    }
    getClassesService() {
        return this.classesService;
    }
    getClassesController() {
        return this.classesController;
    }
    getClassesRepository() {
        return this.classesRepository;
    }
    getClassesRouter() {
        return this.classesRouter;
    }
}
