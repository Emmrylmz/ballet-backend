import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { PaymentsRepository } from "./payments.repository.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";
import { createPaymentsRoutes } from "./payments.routes.js";
export class PaymentsFactory {
    static instance;
    paymentsModule = null;
    constructor() { }
    static getInstance() {
        if (!PaymentsFactory.instance) {
            PaymentsFactory.instance = new PaymentsFactory();
        }
        return PaymentsFactory.instance;
    }
    createPaymentsModule(database, logger, tokenService, authRepository, passwordService, cookieService) {
        if (this.paymentsModule) {
            return this.paymentsModule;
        }
        try {
            logger.info("Creating payments module...");
            const paymentsRepository = new PaymentsRepository(database);
            logger.debug("Payments repository created");
            const paymentsService = new PaymentsService(paymentsRepository, logger);
            logger.debug("Payments service created");
            const paymentsController = new PaymentsController(paymentsService);
            logger.debug("Payments controller created");
            const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
            logger.debug("Auth middleware created for payments");
            const paymentsRouter = createPaymentsRoutes(paymentsController, authMiddleware);
            logger.debug("Payments routes created");
            this.paymentsModule = {
                paymentsRepository,
                paymentsService,
                paymentsController,
                paymentsRouter
            };
            logger.info("Payments module created successfully");
            return this.paymentsModule;
        }
        catch (error) {
            logger.error("Failed to create payments module", { error });
            throw error;
        }
    }
    getPaymentsModule() {
        return this.paymentsModule;
    }
    getPaymentsRepository() {
        return this.paymentsModule?.paymentsRepository || null;
    }
    getPaymentsService() {
        return this.paymentsModule?.paymentsService || null;
    }
    getPaymentsController() {
        return this.paymentsModule?.paymentsController || null;
    }
    getPaymentsRouter() {
        return this.paymentsModule?.paymentsRouter || null;
    }
    reset() {
        this.paymentsModule = null;
    }
}
