export type PaymentType = "package" | "term_fee" | "drop_in";
export type SessionType = "regular" | "makeup" | "trial" | "private" | "workshop";
export interface HolidayBreak {
    start: string;
    end: string;
    name: string;
}
export interface Cohort {
    id: string;
    establishmentId: string;
    templateId: string;
    instructorId: string;
    name: string;
    description?: string;
    ageMin?: number;
    ageMax?: number;
    maxStudents: number;
    scheduleDays: number[];
    scheduleStartTime: string;
    scheduleDurationMinutes: number;
    termStartDate: string;
    termEndDate: string;
    holidayBreaks: HolidayBreak[];
    makeupPolicy?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    templateTitle?: string;
    instructorName?: string;
    classType?: string;
    skillLevel?: string;
}
export interface CohortMembership {
    id: string;
    cohortId: string;
    studentId: string;
    paymentType: PaymentType;
    joinedDate: string;
    leftDate?: string;
    isActive: boolean;
    notes?: string;
    createdAt: Date;
    studentName?: string;
    studentEmail?: string;
    cohortName?: string;
}
export interface CohortStats {
    id: string;
    establishmentId: string;
    name: string;
    maxStudents: number;
    currentEnrollment: number;
    availableSpots: number;
    enrollmentPercentage: number;
    termStartDate: string;
    termEndDate: string;
    isActive: boolean;
}
export interface CreateCohortRequest {
    templateId: string;
    instructorId: string;
    name: string;
    description?: string;
    ageMin?: number;
    ageMax?: number;
    maxStudents: number;
    scheduleDays: number[];
    scheduleStartTime: string;
    scheduleDurationMinutes: number;
    termStartDate: string;
    termEndDate: string;
    holidayBreaks?: HolidayBreak[];
    makeupPolicy?: string;
}
export interface UpdateCohortRequest {
    name?: string;
    description?: string;
    instructorId?: string;
    ageMin?: number;
    ageMax?: number;
    maxStudents?: number;
    scheduleDays?: number[];
    scheduleStartTime?: string;
    scheduleDurationMinutes?: number;
    termStartDate?: string;
    termEndDate?: string;
    holidayBreaks?: HolidayBreak[];
    makeupPolicy?: string;
    isActive?: boolean;
}
export interface AddStudentToCohortRequest {
    studentId: string;
    paymentType: PaymentType;
    joinedDate?: string;
    notes?: string;
}
export interface RemoveStudentFromCohortRequest {
    leftDate?: string;
    notes?: string;
}
export interface CohortFilters {
    instructorId?: string;
    templateId?: string;
    isActive?: boolean;
    ageMin?: number;
    ageMax?: number;
    scheduleDays?: number[];
    termActive?: boolean;
    hasAvailableSpots?: boolean;
    limit?: number;
    offset?: number;
}
export interface CohortMembershipFilters {
    cohortId?: string;
    studentId?: string;
    paymentType?: PaymentType;
    isActive?: boolean;
    joinedAfter?: string;
    joinedBefore?: string;
    limit?: number;
    offset?: number;
}
export interface CohortResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    message: string;
}
export interface PaginatedCohortResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface GenerateSessionsForCohortRequest {
    generateFromDate?: string;
    generateToDate?: string;
    includeHolidays?: boolean;
    skipEnrollment?: boolean;
}
export interface CohortSessionGeneration {
    cohortId: string;
    sessionsGenerated: number;
    enrollmentsCreated: number;
    startDate: string;
    endDate: string;
    skippedDates: string[];
}
export interface CohortEnrollmentSummary {
    cohortId: string;
    cohortName: string;
    totalStudents: number;
    activeStudents: number;
    paymentBreakdown: {
        package: number;
        termFee: number;
        dropIn: number;
    };
    joinedThisMonth: number;
    leftThisMonth: number;
}
export declare const COHORT_ERRORS: {
    readonly COHORT_NOT_FOUND: "COHORT_NOT_FOUND";
    readonly COHORT_FULL: "COHORT_FULL";
    readonly STUDENT_ALREADY_ENROLLED: "STUDENT_ALREADY_ENROLLED";
    readonly STUDENT_NOT_ENROLLED: "STUDENT_NOT_ENROLLED";
    readonly INVALID_TERM_DATES: "INVALID_TERM_DATES";
    readonly INVALID_SCHEDULE: "INVALID_SCHEDULE";
    readonly INVALID_AGE_RANGE: "INVALID_AGE_RANGE";
    readonly INSTRUCTOR_NOT_AVAILABLE: "INSTRUCTOR_NOT_AVAILABLE";
    readonly TEMPLATE_NOT_COMPATIBLE: "TEMPLATE_NOT_COMPATIBLE";
    readonly TERM_ALREADY_STARTED: "TERM_ALREADY_STARTED";
    readonly SESSIONS_ALREADY_GENERATED: "SESSIONS_ALREADY_GENERATED";
    readonly MEMBERSHIP_OVERLAP: "MEMBERSHIP_OVERLAP";
    readonly INVALID_PAYMENT_TYPE: "INVALID_PAYMENT_TYPE";
    readonly COHORT_CREATION_FAILED: "COHORT_CREATION_FAILED";
    readonly MEMBERSHIP_CREATION_FAILED: "MEMBERSHIP_CREATION_FAILED";
};
