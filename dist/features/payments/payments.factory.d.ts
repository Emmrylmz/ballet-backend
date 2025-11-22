import { Router } from "express";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { TokenService } from "../auth/services/TokenService.js";
import { PasswordService } from "../auth/services/PasswordService.js";
import { CookieService } from "../auth/services/CookieService.js";
import { PaymentsRepository } from "./payments.repository.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";
export interface PaymentsModule {
    paymentsRepository: PaymentsRepository;
    paymentsService: PaymentsService;
    paymentsController: PaymentsController;
    paymentsRouter: Router;
}
export declare class PaymentsFactory {
    private static instance;
    private paymentsModule;
    private constructor();
    static getInstance(): PaymentsFactory;
    createPaymentsModule(database: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService, cookieService: CookieService): PaymentsModule;
    getPaymentsModule(): PaymentsModule | null;
    getPaymentsRepository(): PaymentsRepository | null;
    getPaymentsService(): PaymentsService | null;
    getPaymentsController(): PaymentsController | null;
    getPaymentsRouter(): Router | null;
    reset(): void;
}
