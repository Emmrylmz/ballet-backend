import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { CohortsRepository } from './cohorts.repository.js';
import { CohortsService } from './cohorts.service.js';
import { CohortsController } from './cohorts.controller.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { Router } from 'express';
export declare class CohortsFactory {
    private static instance;
    private cohortsService?;
    private cohortsController?;
    private cohortsRepository?;
    private cohortsRouter?;
    private constructor();
    static getInstance(): CohortsFactory;
    createCohortsModule(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService, cookieService: CookieService): {
        cohortsService: CohortsService;
        cohortsController: CohortsController;
        cohortsRouter: Router;
    };
    getCohortsService(): CohortsService | undefined;
    getCohortsController(): CohortsController | undefined;
    getCohortsRepository(): CohortsRepository | undefined;
    getCohortsRouter(): Router | undefined;
}
