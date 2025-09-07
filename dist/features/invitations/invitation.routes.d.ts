import { Router } from "express";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { TokenService } from "../auth/services/TokenService.js";
import { AuthRepository } from "../auth/auth.repository.js";
declare const createInvitationRoutes: (db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository) => Router;
export default createInvitationRoutes;
