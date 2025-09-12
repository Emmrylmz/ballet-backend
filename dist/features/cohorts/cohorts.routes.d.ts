import { Router } from "express";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
export declare function createCohortsRoutes(db: DatabaseService, logger: LoggerService, authMiddleware: AuthMiddleware, establishmentMiddleware: EstablishmentMiddleware): Router;
export { createCohortsRoutes as cohortsRoutes };
