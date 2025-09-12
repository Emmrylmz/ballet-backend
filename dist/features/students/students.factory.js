import { StudentsRepository } from './students.repository.js';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import createStudentsRoutes from './students.routes.js';
export class StudentsFactory {
    static instance;
    studentsService;
    studentsController;
    studentsRepository;
    studentsRouter;
    constructor() { }
    static getInstance() {
        if (!StudentsFactory.instance) {
            StudentsFactory.instance = new StudentsFactory();
        }
        return StudentsFactory.instance;
    }
    createStudentsModule(db, logger, tokenService, authRepository, passwordService, cookieService) {
        this.studentsRepository = new StudentsRepository(db);
        this.studentsService = new StudentsService(this.studentsRepository, logger);
        this.studentsController = new StudentsController(this.studentsService, logger);
        const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
        const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
        this.studentsRouter = createStudentsRoutes(db, logger, tokenService, authRepository, passwordService, cookieService);
        return {
            studentsService: this.studentsService,
            studentsController: this.studentsController,
            studentsRouter: this.studentsRouter
        };
    }
    getStudentsService() {
        return this.studentsService;
    }
    getStudentsController() {
        return this.studentsController;
    }
    getStudentsRepository() {
        return this.studentsRepository;
    }
    getStudentsRouter() {
        return this.studentsRouter;
    }
}
