import { Router } from "express";
import { AttendanceController } from "./attendance.controller.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { TokenService } from "../auth/services/TokenService.js";
import { CookieService } from "../auth/services/CookieService.js";
import { AuthRepository } from "../auth/auth.repository.js";
declare const createAttendanceRoutes: (db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: any, cookieService: CookieService) => (attendanceController: AttendanceController) => Router;
export default createAttendanceRoutes;
