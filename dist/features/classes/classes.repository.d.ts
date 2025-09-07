import { DatabaseService } from "../../services/DatabaseService.js";
import { ClassTemplate, CreateClassTemplateRequest, UpdateClassTemplateRequest, ClassTemplateFilters, ClassSession, CreateClassSessionRequest, UpdateClassSessionRequest, ClassSessionFilters, SessionEnrollment, StudentPackage, ClassStats, CalendarEvent, StudentEnrolledSession, ActivityType } from "./classes.types.js";
export declare class ClassesRepository {
    db: DatabaseService;
    private tableExistsCache;
    constructor(db: DatabaseService);
    private tableExists;
    createClassTemplate(establishmentId: string, template: CreateClassTemplateRequest): Promise<ClassTemplate>;
    getClassTemplate(establishmentId: string, templateId: string): Promise<ClassTemplate | null>;
    getClassTemplates(establishmentId: string, filters?: ClassTemplateFilters): Promise<{
        templates: ClassTemplate[];
        total: number;
    }>;
    updateClassTemplate(establishmentId: string, templateId: string, updates: UpdateClassTemplateRequest): Promise<ClassTemplate | null>;
    deleteClassTemplate(establishmentId: string, templateId: string): Promise<boolean>;
    createClassSession(establishmentId: string, session: CreateClassSessionRequest): Promise<ClassSession>;
    getClassSession(establishmentId: string, sessionId: string): Promise<ClassSession | null>;
    getClassSessions(establishmentId: string, filters?: ClassSessionFilters): Promise<{
        sessions: ClassSession[];
        total: number;
    }>;
    getUpcomingSessions(establishmentId: string, daysAhead?: number): Promise<ClassSession[]>;
    updateClassSession(establishmentId: string, sessionId: string, updates: UpdateClassSessionRequest): Promise<ClassSession | null>;
    enrollStudent(establishmentId: string, sessionId: string, studentId: string, isWaitlist?: boolean): Promise<SessionEnrollment>;
    removeStudentFromSession(establishmentId: string, sessionId: string, studentId: string): Promise<boolean>;
    getSessionEnrollments(establishmentId: string, sessionId: string): Promise<SessionEnrollment[]>;
    getStudentEnrolledSessions(establishmentId: string, studentId: string, includeCompleted?: boolean): Promise<StudentEnrolledSession[]>;
    isStudentEnrolled(establishmentId: string, sessionId: string, studentId: string): Promise<boolean>;
    getActiveStudentPackage(establishmentId: string, studentId: string): Promise<StudentPackage | null>;
    deductPackageCredit(establishmentId: string, packageId: string): Promise<boolean>;
    getClassStats(establishmentId: string): Promise<ClassStats>;
    getCalendarEvents(establishmentId: string, startDate: string, endDate: string): Promise<CalendarEvent[]>;
    logActivity(establishmentId: string, activityType: ActivityType, title: string, description?: string, studentId?: string, sessionId?: string, userId?: string, priority?: "low" | "medium" | "high"): Promise<void>;
    private mapClassTemplateRow;
    private mapClassSessionRow;
    private mapStudentPackageRow;
}
