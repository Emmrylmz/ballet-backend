export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export interface AttendanceRecord {
    id: string;
    establishmentId: string;
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
    markedAt: Date;
    markedBy?: string;
    studentName?: string;
    studentPhone?: string;
    studentEmail?: string;
    sessionDate?: string;
    sessionTime?: string;
    markedByName?: string;
}
export interface SessionRoster {
    sessionId: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    sessionTitle?: string;
    cohortName?: string;
    instructorName?: string;
    capacity: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    enrollments: SessionEnrollmentWithAttendance[];
    attendanceStats: {
        totalEnrolled: number;
        totalPresent: number;
        totalLate: number;
        totalAbsent: number;
        totalExcused: number;
        attendanceRate: number;
    };
}
export interface SessionEnrollmentWithAttendance {
    enrollmentId: string;
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentEmail?: string;
    isWaitlist: boolean;
    enrollmentDate: Date;
    attendanceRecord?: AttendanceRecord;
    hasAttendance: boolean;
    attendanceStatus?: AttendanceStatus;
    attendanceNotes?: string;
    medicalNotes?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
}
export interface MarkAttendanceRequest {
    status: AttendanceStatus;
    notes?: string;
}
export interface BulkAttendanceRequest {
    attendanceRecords: Array<{
        studentId: string;
        status: AttendanceStatus;
        notes?: string;
    }>;
}
export interface UpdateAttendanceRequest {
    status?: AttendanceStatus;
    notes?: string;
}
export interface AttendanceFilters {
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    studentId?: string;
    instructorId?: string;
    cohortId?: string;
    status?: AttendanceStatus;
    limit?: number;
    offset?: number;
}
export interface StudentAttendanceHistory {
    studentId: string;
    studentName: string;
    totalSessions: number;
    attendedSessions: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number;
    recentRecords: AttendanceRecord[];
    monthlyStats: Array<{
        month: string;
        totalSessions: number;
        attendanceRate: number;
    }>;
}
export interface SessionAttendanceStats {
    sessionId: string;
    sessionDate: string;
    sessionTitle?: string;
    totalCapacity: number;
    totalEnrolled: number;
    totalAttended: number;
    statusBreakdown: {
        present: number;
        late: number;
        absent: number;
        excused: number;
        notMarked: number;
    };
    attendanceRate: number;
    averageAttendanceForCohort?: number;
    averageAttendanceForInstructor?: number;
}
export interface CohortAttendanceReport {
    cohortId: string;
    cohortName: string;
    termStartDate: string;
    termEndDate: string;
    totalSessions: number;
    overallStats: {
        averageAttendanceRate: number;
        totalStudents: number;
        mostAttendedSession: {
            sessionId: string;
            sessionDate: string;
            attendanceRate: number;
        };
        leastAttendedSession: {
            sessionId: string;
            sessionDate: string;
            attendanceRate: number;
        };
    };
    studentSummaries: Array<{
        studentId: string;
        studentName: string;
        totalSessions: number;
        attendanceRate: number;
        status: 'excellent' | 'good' | 'needs_improvement' | 'concerning';
    }>;
}
export interface AttendanceResponse<T = any> {
    success: boolean;
    data?: T;
    message: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface PaginatedAttendanceResponse<T = any> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    message: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface AttendanceValidation {
    canMarkAttendance: boolean;
    reason?: string;
    warnings?: string[];
}
export declare const ATTENDANCE_ERRORS: {
    readonly SESSION_NOT_FOUND: "SESSION_NOT_FOUND";
    readonly STUDENT_NOT_ENROLLED: "STUDENT_NOT_ENROLLED";
    readonly ATTENDANCE_ALREADY_MARKED: "ATTENDANCE_ALREADY_MARKED";
    readonly SESSION_NOT_ACTIVE: "SESSION_NOT_ACTIVE";
    readonly UNAUTHORIZED_INSTRUCTOR: "UNAUTHORIZED_INSTRUCTOR";
    readonly INVALID_ATTENDANCE_STATUS: "INVALID_ATTENDANCE_STATUS";
    readonly BULK_ATTENDANCE_FAILED: "BULK_ATTENDANCE_FAILED";
    readonly ATTENDANCE_RECORD_NOT_FOUND: "ATTENDANCE_RECORD_NOT_FOUND";
};
export interface AttendanceActivity {
    id: string;
    establishmentId: string;
    sessionId: string;
    studentId: string;
    instructorId: string;
    action: 'marked' | 'updated' | 'bulk_marked';
    previousStatus?: AttendanceStatus;
    newStatus: AttendanceStatus;
    notes?: string;
    timestamp: Date;
}
