import { Request, Response } from 'express';
import { LoggerService } from '../../services/LoggerService.js';
import { AttendanceService } from './attendance.service.js';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishments?: Array<{
            id: string;
            role: string;
        }>;
    };
    establishment?: {
        id: string;
        role: string;
    };
}
export declare class AttendanceController {
    private attendanceService;
    private logger;
    constructor(attendanceService: AttendanceService, logger: LoggerService);
    getSessionRoster(req: AuthenticatedRequest, res: Response): Promise<void>;
    markAttendance(req: AuthenticatedRequest, res: Response): Promise<void>;
    bulkMarkAttendance(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateAttendance(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAttendanceRecords(req: AuthenticatedRequest, res: Response): Promise<void>;
    getStudentAttendanceHistory(req: AuthenticatedRequest, res: Response): Promise<void>;
    getSessionAttendanceStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAttendanceTrends(req: AuthenticatedRequest, res: Response): Promise<void>;
    private getErrorStatusCode;
    private getErrorMessage;
}
export {};
