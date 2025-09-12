import { DatabaseService } from '../../services/DatabaseService.js';
import { AttendanceRecord, SessionRoster, AttendanceFilters, StudentAttendanceHistory, SessionAttendanceStats, AttendanceStatus, MarkAttendanceRequest, UpdateAttendanceRequest } from './attendance.types.js';
export declare class AttendanceRepository {
    private db;
    constructor(db: DatabaseService);
    getSessionRoster(sessionId: string, establishmentId: string): Promise<SessionRoster | null>;
    markAttendance(sessionId: string, studentId: string, establishmentId: string, request: MarkAttendanceRequest, markedBy: string): Promise<AttendanceRecord>;
    bulkMarkAttendance(sessionId: string, establishmentId: string, attendanceRecords: Array<{
        studentId: string;
        status: AttendanceStatus;
        notes?: string;
    }>, markedBy: string): Promise<AttendanceRecord[]>;
    updateAttendance(attendanceId: string, establishmentId: string, request: UpdateAttendanceRequest, markedBy: string): Promise<AttendanceRecord | null>;
    getAttendanceRecords(establishmentId: string, filters: AttendanceFilters): Promise<{
        records: AttendanceRecord[];
        total: number;
    }>;
    getStudentAttendanceHistory(studentId: string, establishmentId: string): Promise<StudentAttendanceHistory | null>;
    getSessionAttendanceStats(sessionId: string, establishmentId: string): Promise<SessionAttendanceStats | null>;
    canMarkAttendance(sessionId: string, studentId: string, establishmentId: string): Promise<boolean>;
    isInstructorAuthorized(sessionId: string, instructorId: string, establishmentId: string): Promise<boolean>;
}
