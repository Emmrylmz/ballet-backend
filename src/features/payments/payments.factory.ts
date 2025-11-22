import { Router } from "express";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuditLogService } from "../../services/AuditLogService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { TokenService } from "../auth/services/TokenService.js";
import { PasswordService } from "../auth/services/PasswordService.js";
import { CookieService } from "../auth/services/CookieService.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { AuditMiddleware } from "../../middleware/AuditMiddleware.js";
import { PaymentsRepository } from "./payments.repository.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";
import { createPaymentsRoutes } from "./payments.routes.js";

export interface PaymentsModule {
  paymentsRepository: PaymentsRepository;
  paymentsService: PaymentsService;
  paymentsController: PaymentsController;
  paymentsRouter: Router;
}

export class PaymentsFactory {
  private static instance: PaymentsFactory;
  private paymentsModule: PaymentsModule | null = null;

  private constructor() {}

  static getInstance(): PaymentsFactory {
    if (!PaymentsFactory.instance) {
      PaymentsFactory.instance = new PaymentsFactory();
    }
    return PaymentsFactory.instance;
  }

  createPaymentsModule(
    database: DatabaseService,
    logger: LoggerService,
    auditLogService: AuditLogService,
    tokenService: TokenService,
    authRepository: AuthRepository,
    passwordService: PasswordService,
    cookieService: CookieService
  ): PaymentsModule {
    if (this.paymentsModule) {
      return this.paymentsModule;
    }

    try {
      logger.info("Creating payments module...");

      // Create repository layer
      const paymentsRepository = new PaymentsRepository(database);
      logger.debug("Payments repository created");

      // Create service layer
      const paymentsService = new PaymentsService(paymentsRepository, logger);
      logger.debug("Payments service created");

      // Create controller layer
      const paymentsController = new PaymentsController(paymentsService);
      logger.debug("Payments controller created");

      // Create auth middleware
      const authMiddleware = new AuthMiddleware(
        tokenService,
        cookieService,
        authRepository,
        logger
      );
      logger.debug("Auth middleware created for payments");

      // Create audit middleware
      const auditMiddleware = new AuditMiddleware(auditLogService, logger);
      logger.debug("Audit middleware created for payments");

      // Create routes with audit middleware
      const paymentsRouter = createPaymentsRoutes(
        paymentsController,
        authMiddleware,
        auditMiddleware
      );
      logger.debug("Payments routes created");

      this.paymentsModule = {
        paymentsRepository,
        paymentsService,
        paymentsController,
        paymentsRouter
      };

      logger.info("Payments module created successfully");
      return this.paymentsModule;

    } catch (error) {
      logger.error("Failed to create payments module", { error });
      throw error;
    }
  }

  getPaymentsModule(): PaymentsModule | null {
    return this.paymentsModule;
  }

  getPaymentsRepository(): PaymentsRepository | null {
    return this.paymentsModule?.paymentsRepository || null;
  }

  getPaymentsService(): PaymentsService | null {
    return this.paymentsModule?.paymentsService || null;
  }

  getPaymentsController(): PaymentsController | null {
    return this.paymentsModule?.paymentsController || null;
  }

  getPaymentsRouter(): Router | null {
    return this.paymentsModule?.paymentsRouter || null;
  }

  // Reset method for testing purposes
  reset(): void {
    this.paymentsModule = null;
  }
}