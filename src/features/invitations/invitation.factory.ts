import { Router } from 'express';
import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { InvitationRepository } from './invitation.repository.js';
import { InvitationService } from './invitation.service.js';
import { InvitationController } from './invitation.controller.js';
import createInvitationRoutes from './invitation.routes.js';

export class InvitationFactory {
  private static instance: InvitationFactory;
  private invitationService?: InvitationService;
  private invitationController?: InvitationController;
  private invitationRoutes?: Router;

  private constructor() {}

  static getInstance(): InvitationFactory {
    if (!InvitationFactory.instance) {
      InvitationFactory.instance = new InvitationFactory();
    }
    return InvitationFactory.instance;
  }

  createInvitationModule(
    db: DatabaseService,
    logger: LoggerService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    passwordService: PasswordService
  ): {
    invitationService: InvitationService;
    invitationController: InvitationController;
    invitationRoutes: Router;
  } {
    // Create repository
    const invitationRepository = new InvitationRepository(db);

    // Create service
    this.invitationService = new InvitationService(
      invitationRepository,
      authRepository,
      passwordService,
      logger
    );

    // Create controller
    this.invitationController = new InvitationController(this.invitationService, logger);

    // Create routes
    this.invitationRoutes = createInvitationRoutes(
      db,
      logger,
      tokenService,
      authRepository,
      passwordService
    );

    return {
      invitationService: this.invitationService,
      invitationController: this.invitationController,
      invitationRoutes: this.invitationRoutes
    };
  }

  getInvitationService(): InvitationService | undefined {
    return this.invitationService;
  }

  getInvitationController(): InvitationController | undefined {
    return this.invitationController;
  }

  getInvitationRoutes(): Router | undefined {
    return this.invitationRoutes;
  }
}

// Keep the old function for backward compatibility but use the factory
export const createInvitationModule = (
  db: DatabaseService,
  logger: LoggerService,
  tokenService: TokenService,
  authRepository: AuthRepository,
  passwordService: PasswordService
): Router => {
  return createInvitationRoutes(
    db,
    logger,
    tokenService,
    authRepository,
    passwordService
  );
};