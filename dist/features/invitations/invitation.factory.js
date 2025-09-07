import { InvitationRepository } from './invitation.repository.js';
import { InvitationService } from './invitation.service.js';
import { InvitationController } from './invitation.controller.js';
import createInvitationRoutes from './invitation.routes.js';
export class InvitationFactory {
    static instance;
    invitationService;
    invitationController;
    invitationRoutes;
    constructor() { }
    static getInstance() {
        if (!InvitationFactory.instance) {
            InvitationFactory.instance = new InvitationFactory();
        }
        return InvitationFactory.instance;
    }
    createInvitationModule(db, logger, tokenService, authRepository, passwordService) {
        const invitationRepository = new InvitationRepository(db);
        this.invitationService = new InvitationService(invitationRepository, authRepository, passwordService, logger);
        this.invitationController = new InvitationController(this.invitationService, logger);
        this.invitationRoutes = createInvitationRoutes(db, logger, tokenService, authRepository, passwordService);
        return {
            invitationService: this.invitationService,
            invitationController: this.invitationController,
            invitationRoutes: this.invitationRoutes
        };
    }
    getInvitationService() {
        return this.invitationService;
    }
    getInvitationController() {
        return this.invitationController;
    }
    getInvitationRoutes() {
        return this.invitationRoutes;
    }
}
export const createInvitationModule = (db, logger, tokenService, authRepository, passwordService) => {
    return createInvitationRoutes(db, logger, tokenService, authRepository, passwordService);
};
