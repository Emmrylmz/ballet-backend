// Database enum types
export type ClassType =
  | "ballet"
  | "pilates"
  | "barre"
  | "yoga"
  | "contemporary"
  | "jazz"
  | "modern";
export type SkillLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all_levels";
export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "daily";
export type ActivityType =
  | "payment"
  | "registration"
  | "attendance"
  | "class"
  | "enrollment"
  | "invitation";
export type PackageType =
  | "monthly_unlimited"
  | "class_pack_5"
  | "class_pack_10"
  | "class_pack_20"
  | "drop_in"
  | "trial";
export type PaymentStatus = "current" | "overdue" | "cancelled";

// Class Template interfaces
export interface ClassTemplate {
  id: string;
  establishmentId: string;
  title: string;
  classType: ClassType;
  skillLevel: SkillLevel;
  instructorId?: string;
  instructorName?: string;
  capacity: number;
  durationMinutes: number;
  price: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClassTemplateRequest {
  title: string;
  classType: ClassType;
  skillLevel: SkillLevel;
  instructorId?: string;
  capacity: number;
  durationMinutes: number;
  price: number;
  description?: string;
}

export interface UpdateClassTemplateRequest {
  title?: string;
  classType?: ClassType;
  skillLevel?: SkillLevel;
  instructorId?: string;
  capacity?: number;
  durationMinutes?: number;
  price?: number;
  description?: string;
  isActive?: boolean;
}

export interface ClassTemplateFilters {
  classType?: ClassType;
  skillLevel?: SkillLevel;
  instructorId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// Class Session interfaces
export interface ClassSession {
  id: string;
  establishmentId: string;
  classTemplateId?: string;
  templateTitle?: string;
  instructorId?: string;
  instructorName?: string;
  sessionDate: string; // ISO date string
  startTime: string;
  endTime: string;
  capacity: number;
  status: SessionStatus;
  notes?: string;
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceDaysOfWeek?: number[];
  recurrenceEndDate?: string;
  parentSessionId?: string;
  enrollmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClassSessionRequest {
  classTemplateId?: string;
  instructorId?: string;
  sessionDate: string;
  startTime: string;
  endTime?: string; // Optional if using template duration
  capacity?: number; // Optional if using template capacity
  notes?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceDaysOfWeek?: number[];
  recurrenceEndDate?: string;
}

export interface UpdateClassSessionRequest {
  instructorId?: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  status?: SessionStatus;
  notes?: string;
}

export interface ClassSessionFilters {
  startDate?: string;
  endDate?: string;
  instructorId?: string;
  status?: SessionStatus;
  classTemplateId?: string;
  limit?: number;
  offset?: number;
}

export interface GenerateSessionsRequest {
  startDate: string;
  endDate: string;
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime?: string;
  instructorId?: string;
  capacity?: number;
}

// Session Enrollment interfaces
export interface SessionEnrollment {
  id: string;
  establishmentId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrollmentDate: Date;
  isWaitlist: boolean;
  isNotifiedAbsence?: boolean;
}

export interface EnrollStudentRequest {
  studentIds: string[];
  usePackageCredits?: boolean;
  notifyStudent?: boolean;
}

export interface EnrollStudentResponse {
  success: boolean;
  enrollments: {
    studentId: string;
    studentName: string;
    enrolled: boolean;
    waitlisted: boolean;
    error?: string;
    packageDeducted?: boolean;
  }[];
  message: string;
}

export interface StudentEnrolledSession {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  templateTitle: string;
  instructorName?: string;
  status: SessionStatus;
  isWaitlist: boolean;
  enrollmentDate: Date;
}

// Student Package interface
export interface StudentPackage {
  id: string;
  establishmentId: string;
  studentId: string;
  packageType: PackageType;
  remainingClasses?: number;
  startDate: string;
  endDate?: string;
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string;
  nextDueDate?: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Statistics and reporting interfaces
export interface ClassStats {
  totalTemplates: number;
  activeTemplates: number;
  totalSessions: number;
  upcomingSessions: number;
  totalEnrollments: number;
  averageEnrollmentRate: number;
  popularClassTypes: {
    classType: ClassType;
    count: number;
  }[];
  monthlyRevenue: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorName?: string;
  enrollmentCount: number;
  capacity: number;
  status: SessionStatus;
  classType: ClassType;
  skillLevel: SkillLevel;
}

// Error types
export interface ClassError {
  code: string;
  message: string;
  details?: any;
}

// Common response interfaces
export interface ClassResponse<T> {
  success: boolean;
  data?: T;
  error?: ClassError;
  message: string;
}

export interface PaginatedClassResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: ClassError;
}

// Activity logging interface
export interface ClassActivity {
  id: string;
  establishmentId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  studentId?: string;
  sessionId?: string;
  userId?: string;
  priority: "low" | "medium" | "high";
  createdAt: Date;
}

// Validation interfaces
export interface SessionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EnrollmentValidation {
  canEnroll: boolean;
  reason?: string;
  requiresPackage: boolean;
  hasValidPackage: boolean;
  packageCreditsRemaining?: number;
}
