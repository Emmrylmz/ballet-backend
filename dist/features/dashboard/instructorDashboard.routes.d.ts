import { Router } from "express";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { TokenService } from "../auth/services/TokenService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { CookieService } from "../auth/services/CookieService.js";
declare const createInstructorDashboardRoutes: (db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, cookieService: CookieService) => Router;
export default createInstructorDashboardRoutes;
