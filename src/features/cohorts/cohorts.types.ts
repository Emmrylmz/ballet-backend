// Cohort-related types and interfaces

export type PaymentType = "package" | "term_fee" | "drop_in";
export type SessionType =
  | "regular"
  | "makeup"
  | "trial"
  | "private"
  | "workshop";

// Holiday break structure
export interface HolidayBreak {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  name: string;
}

// Main cohort interface
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
  scheduleDays: number[]; // [0,1,2,3,4,5,6] where 0=Sunday
  scheduleStartTime: string; // HH:MM format
  scheduleDurationMinutes: number;
  termStartDate: string; // YYYY-MM-DD
  termEndDate: string; // YYYY-MM-DD
  holidayBreaks: HolidayBreak[];
  makeupPolicy?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Populated from joins
  templateTitle?: string;
  instructorName?: string;
  classType?: string;
  skillLevel?: string;
}

// Cohort membership interface
export interface CohortMembership {
  id: string;
  cohortId: string;
  studentId: string;
  paymentType: PaymentType;
  joinedDate: string; // YYYY-MM-DD
  leftDate?: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
  createdAt: Date;

  // Populated from joins
  studentName?: string;
  studentEmail?: string;
  cohortName?: string;
}

// Cohort statistics interface (from view)
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

// Request interfaces
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
  joinedDate?: string; // Defaults to current date
  notes?: string;
}

export interface RemoveStudentFromCohortRequest {
  leftDate?: string; // Defaults to current date
  notes?: string;
}

// Filter interfaces
export interface CohortFilters {
  instructorId?: string;
  templateId?: string;
  isActive?: boolean;
  ageMin?: number;
  ageMax?: number;
  scheduleDays?: number[];
  termActive?: boolean; // Filter by current term dates
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

// Response interfaces
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

// Session generation interface
export interface GenerateSessionsForCohortRequest {
  generateFromDate?: string; // For mid-term joins, defaults to term_start_date
  generateToDate?: string; // Defaults to term_end_date
  includeHolidays?: boolean; // Defaults to false
  skipEnrollment?: boolean;
}

export interface CohortSessionGeneration {
  cohortId: string;
  sessionsGenerated: number;
  enrollmentsCreated: number;
  startDate: string;
  endDate: string;
  skippedDates: string[]; // Holiday dates that were skipped
}

// Enrollment summary for cohort
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

// Error codes specific to cohorts
export const COHORT_ERRORS = {
  COHORT_NOT_FOUND: "COHORT_NOT_FOUND",
  COHORT_FULL: "COHORT_FULL",
  STUDENT_ALREADY_ENROLLED: "STUDENT_ALREADY_ENROLLED",
  STUDENT_NOT_ENROLLED: "STUDENT_NOT_ENROLLED",
  INVALID_TERM_DATES: "INVALID_TERM_DATES",
  INVALID_SCHEDULE: "INVALID_SCHEDULE",
  INVALID_AGE_RANGE: "INVALID_AGE_RANGE",
  INSTRUCTOR_NOT_AVAILABLE: "INSTRUCTOR_NOT_AVAILABLE",
  TEMPLATE_NOT_COMPATIBLE: "TEMPLATE_NOT_COMPATIBLE",
  TERM_ALREADY_STARTED: "TERM_ALREADY_STARTED",
  SESSIONS_ALREADY_GENERATED: "SESSIONS_ALREADY_GENERATED",
  MEMBERSHIP_OVERLAP: "MEMBERSHIP_OVERLAP",
  INVALID_PAYMENT_TYPE: "INVALID_PAYMENT_TYPE",
  COHORT_CREATION_FAILED: "COHORT_CREATION_FAILED",
  MEMBERSHIP_CREATION_FAILED: "MEMBERSHIP_CREATION_FAILED",
} as const;
