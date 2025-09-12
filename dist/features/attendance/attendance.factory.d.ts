import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { TokenService } from '../auth/services/TokenService.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordService } from '../auth/services/PasswordService.js';
import { CookieService } from '../auth/services/CookieService.js';
import { Router } from 'express';
export declare class AttendanceFactory {
    private static instance;
    private attendanceRepository?;
    private attendanceService?;
    private attendanceController?;
    private attendanceRouter?;
    private constructor();
    static getInstance(): AttendanceFactory;
    createAttendanceModule(db: DatabaseService, logger: LoggerService, tokenService: TokenService, authRepository: AuthRepository, passwordService: PasswordService, cookieService: CookieService): {
        attendanceRepository: AttendanceRepository;
        attendanceService: AttendanceService;
        attendanceController: AttendanceController;
        attendanceRouter: Router;
    };
    getAttendanceRepository(): AttendanceRepository | undefined;
    getAttendanceService(): AttendanceService | undefined;
    getAttendanceController(): AttendanceController | undefined;
    getAttendanceRouter(): Router | undefined;
    reset(): void;
    isInitialized(): boolean;
}
