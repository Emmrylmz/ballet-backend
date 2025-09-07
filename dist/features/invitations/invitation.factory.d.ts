import { Router } from 'express';
import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { InvitationService } from './invitation.service.js';
import { InvitationController } from './invitation.controller.js';
export declare class InvitationFactory {
    private static instance;
    private invitationService?;
    private invitationController?;
    private invitationRoutes?;
    private constructor();
    static getInstance(): InvitationFactory;
    createInvitationModule(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService): {
        invitationService: InvitationService;
        invitationController: InvitationController;
        invitationRoutes: Router;
    };
    getInvitationService(): InvitationService | undefined;
    getInvitationController(): InvitationController | undefined;
    getInvitationRoutes(): Router | undefined;
}
export declare const createInvitationModule: (db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService) => Router;
