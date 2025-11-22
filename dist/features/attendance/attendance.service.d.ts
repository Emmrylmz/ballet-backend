import { LoggerService } from "../../services/LoggerService.js";
import { AttendanceRepository } from "./attendance.repository.js";
import { AttendanceRecord, SessionRoster, AttendanceFilters, StudentAttendanceHistory, SessionAttendanceStats, MarkAttendanceRequest, UpdateAttendanceRequest, BulkAttendanceRequest, AttendanceStatus } from "./attendance.types.js";
export declare class AttendanceService {
    private attendanceRepository;
    private logger;
    constructor(attendanceRepository: AttendanceRepository, logger: LoggerService);
    getSessionRoster(sessionId: string, establishmentId: string, instructorId?: string): Promise<SessionRoster>;
    markAttendance(sessionId: string, studentId: string, establishmentId: string, request: MarkAttendanceRequest, markedBy: string, instructorId?: string): Promise<AttendanceRecord>;
    bulkMarkAttendance(sessionId: string, establishmentId: string, request: BulkAttendanceRequest, markedBy: string, instructorId?: string): Promise<AttendanceRecord[]>;
    updateAttendance(attendanceId: string, establishmentId: string, request: UpdateAttendanceRequest, markedBy: string, instructorId?: string): Promise<AttendanceRecord>;
    getAttendanceRecords(establishmentId: string, filters: AttendanceFilters): Promise<{
        records: AttendanceRecord[];
        total: number;
    }>;
    getStudentAttendanceHistory(studentId: string, establishmentId: string): Promise<StudentAttendanceHistory>;
    getSessionAttendanceStats(sessionId: string, establishmentId: string): Promise<SessionAttendanceStats>;
    private validateAttendanceMarking;
    private getStatusBreakdown;
    calculateAttendanceRate(present: number, late: number, total: number): number;
    categorizeAttendanceRate(rate: number): "excellent" | "good" | "needs_improvement" | "concerning";
    getAttendanceTrends(establishmentId: string, filters: {
        startDate?: string;
        endDate?: string;
        cohortId?: string;
        instructorId?: string;
    }): Promise<{
        overallRate: number;
        monthlyTrends: Array<{
            month: string;
            attendanceRate: number;
            totalSessions: number;
        }>;
        statusDistribution: Record<AttendanceStatus, number>;
    }>;
}
