import { Router } from 'express';
import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { AttendanceController } from './attendance.controller.js';
export default function createAttendanceRoutes(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService, cookieService: CookieService): (attendanceController: AttendanceController) => Router;
