import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import createAttendanceRoutes from './attendance.routes.js';
export class AttendanceFactory {
    static instance;
    attendanceRepository;
    attendanceService;
    attendanceController;
    attendanceRouter;
    constructor() { }
    static getInstance() {
        if (!AttendanceFactory.instance) {
            AttendanceFactory.instance = new AttendanceFactory();
        }
        return AttendanceFactory.instance;
    }
    createAttendanceModule(db, logger, tokenService, authRepository, passwordService, cookieService) {
        this.attendanceRepository = new AttendanceRepository(db);
        this.attendanceService = new AttendanceService(this.attendanceRepository, logger);
        this.attendanceController = new AttendanceController(this.attendanceService, logger);
        const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
        const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
        const routeFactory = createAttendanceRoutes(db, logger, tokenService, authRepository, passwordService, cookieService);
        this.attendanceRouter = routeFactory(this.attendanceController);
        return {
            attendanceRepository: this.attendanceRepository,
            attendanceService: this.attendanceService,
            attendanceController: this.attendanceController,
            attendanceRouter: this.attendanceRouter
        };
    }
    getAttendanceRepository() {
        return this.attendanceRepository;
    }
    getAttendanceService() {
        return this.attendanceService;
    }
    getAttendanceController() {
        return this.attendanceController;
    }
    getAttendanceRouter() {
        return this.attendanceRouter;
    }
    reset() {
        this.attendanceRepository = undefined;
        this.attendanceService = undefined;
        this.attendanceController = undefined;
        this.attendanceRouter = undefined;
    }
    isInitialized() {
        return !!(this.attendanceRepository &&
            this.attendanceService &&
            this.attendanceController &&
            this.attendanceRouter);
    }
}
