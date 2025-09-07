import { Router } from "express";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { TokenService } from "../auth/services/TokenService.js";
import { CookieService } from "../auth/services/CookieService.js";
import { AuthRepository } from "../auth/auth.repository.js";
declare const createClassesRoutes: (db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: any, cookieService: CookieService) => Router;
export default createClassesRoutes;
