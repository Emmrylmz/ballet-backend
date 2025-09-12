import { LoggerService } from "../../services/LoggerService.js";
import { ClassesRepository } from "./classes.repository.js";
import { ClassTemplate, CreateClassTemplateRequest, UpdateClassTemplateRequest, ClassTemplateFilters, ClassSession, CreateClassSessionRequest, UpdateClassSessionRequest, ClassSessionFilters, GenerateSessionsRequest, EnrollStudentRequest, EnrollStudentResponse, SessionEnrollment, StudentEnrolledSession, ClassStats, CalendarEvent, ClassResponse, PaginatedClassResponse, SessionType } from "./classes.types.js";
export declare class ClassesService {
    private classesRepository;
    private logger;
    constructor(classesRepository: ClassesRepository, logger: LoggerService);
    createClassTemplate(establishmentId: string, template: CreateClassTemplateRequest, userId: string): Promise<ClassResponse<ClassTemplate>>;
    getClassTemplate(establishmentId: string, templateId: string): Promise<ClassResponse<ClassTemplate>>;
    getClassTemplates(establishmentId: string, filters?: ClassTemplateFilters): Promise<PaginatedClassResponse<ClassTemplate>>;
    updateClassTemplate(establishmentId: string, templateId: string, updates: UpdateClassTemplateRequest, userId: string): Promise<ClassResponse<ClassTemplate>>;
    deleteClassTemplate(establishmentId: string, templateId: string, userId: string): Promise<ClassResponse<void>>;
    createBulkClassSessions(establishmentId: string, sessions: (CreateClassSessionRequest & {
        cohortId?: string;
        overrideInstructorId?: string;
        sessionType?: SessionType;
    })[], userId: string): Promise<ClassResponse<ClassSession[]>>;
    bulkEnrollUsersInSession(establishmentId: string, sessionId: string, userIds: string[], userId: string, isWaitlist?: boolean): Promise<ClassResponse<SessionEnrollment[]>>;
    createClassSession(establishmentId: string, session: CreateClassSessionRequest & {
        cohortId: string;
        override_instructor_id?: string;
        sessionType?: SessionType;
    }, userId: string): Promise<ClassResponse<ClassSession>>;
    generateSessionsFromTemplate(establishmentId: string, templateId: string, request: GenerateSessionsRequest, userId: string): Promise<ClassResponse<ClassSession[]>>;
    getClassSession(establishmentId: string, sessionId: string): Promise<ClassResponse<ClassSession>>;
    getClassSessions(establishmentId: string, filters?: ClassSessionFilters & {
        cohortId?: string;
    }): Promise<PaginatedClassResponse<ClassSession>>;
    getUpcomingSessions(establishmentId: string, daysAhead?: number): Promise<ClassResponse<ClassSession[]>>;
    updateClassSession(establishmentId: string, sessionId: string, updates: UpdateClassSessionRequest, userId: string): Promise<ClassResponse<ClassSession>>;
    cancelClassSession(establishmentId: string, sessionId: string, userId: string): Promise<ClassResponse<void>>;
    enrollStudents(establishmentId: string, sessionId: string, request: EnrollStudentRequest, userId: string): Promise<EnrollStudentResponse>;
    removeStudentFromSession(establishmentId: string, sessionId: string, studentId: string, userId: string): Promise<ClassResponse<void>>;
    getSessionEnrollments(establishmentId: string, sessionId: string): Promise<ClassResponse<SessionEnrollment[]>>;
    getStudentEnrolledSessions(establishmentId: string, studentId: string, includeCompleted?: boolean): Promise<ClassResponse<StudentEnrolledSession[]>>;
    getClassStats(establishmentId: string): Promise<ClassResponse<ClassStats>>;
    getCalendarEvents(establishmentId: string, startDate: string, endDate: string): Promise<ClassResponse<CalendarEvent[]>>;
    private validateTemplateData;
    private validateTemplateUpdates;
    private validateSessionData;
    private validateStudentEnrollment;
    getDropdownData(establishmentId: string): Promise<ClassResponse<{
        instructors: Array<{
            id: string;
            name: string;
            email: string;
            phone?: string;
            role: string;
            isActive: boolean;
        }>;
        classTypes: Array<{
            id: number;
            nameTr: string;
            nameEn: string;
            isActive: boolean;
        }>;
        classLevels: Array<{
            id: number;
            nameTr: string;
            nameEn: string;
            isActive: boolean;
        }>;
    }>>;
    private autoEnrollCohortMembers;
}
