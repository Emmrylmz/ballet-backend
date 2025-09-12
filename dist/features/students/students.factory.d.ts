import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { StudentsRepository } from './students.repository.js';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { Router } from 'express';
export declare class StudentsFactory {
    private static instance;
    private studentsService?;
    private studentsController?;
    private studentsRepository?;
    private studentsRouter?;
    private constructor();
    static getInstance(): StudentsFactory;
    createStudentsModule(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService, cookieService: CookieService): {
        studentsService: StudentsService;
        studentsController: StudentsController;
        studentsRouter: Router;
    };
    getStudentsService(): StudentsService | undefined;
    getStudentsController(): StudentsController | undefined;
    getStudentsRepository(): StudentsRepository | undefined;
    getStudentsRouter(): Router | undefined;
}
