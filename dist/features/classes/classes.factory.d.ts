import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { ClassesRepository } from './classes.repository.js';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { Router } from 'express';
export declare class ClassesFactory {
    private static instance;
    private classesService?;
    private classesController?;
    private classesRepository?;
    private classesRouter?;
    private constructor();
    static getInstance(): ClassesFactory;
    createClassesModule(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService, cookieService: CookieService): {
        classesService: ClassesService;
        classesController: ClassesController;
        classesRouter: Router;
    };
    getClassesService(): ClassesService | undefined;
    getClassesController(): ClassesController | undefined;
    getClassesRepository(): ClassesRepository | undefined;
    getClassesRouter(): Router | undefined;
}
