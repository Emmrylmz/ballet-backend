export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'online';
export type PaymentType = 'class_package' | 'monthly_fee' | 'registration' | 'late_fee' | 'refund' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type PlanType = 'individual' | 'cohort' | 'establishment';
export type RecurrenceType = 'one_time' | 'weekly' | 'monthly' | 'yearly';
export type AssignmentTargetType = 'student' | 'cohort' | 'establishment';
export interface Payment {
    id: string;
    establishmentId: string;
    studentId?: string;
    studentPackageId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    paymentDate: Date;
    dueDate?: Date;
    description?: string;
    recordedBy?: string;
    transactionId?: string;
    isRefunded: boolean;
    refundAmount?: number;
    refundDate?: Date;
    createdAt: Date;
    studentName?: string;
    recordedByName?: string;
}
export interface PaymentPlan {
    id: string;
    establishmentId: string;
    name: string;
    description?: string;
    amount: number;
    planType: PlanType;
    recurrenceType: RecurrenceType;
    createdBy: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
    createdByName?: string;
    totalAssignments?: number;
    activeAssignments?: number;
}
export interface PaymentPlanAssignment {
    id: string;
    paymentPlanId: string;
    targetType: AssignmentTargetType;
    targetId?: string;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    createdAt: Date;
    planName?: string;
    targetName?: string;
    nextPaymentDate?: Date;
    lastPaymentDate?: Date;
}
export interface StudentPackage {
    id: string;
    establishmentId: string;
    studentId: string;
    packageType: string;
    remainingClasses?: number;
    startDate: Date;
    endDate?: Date;
    paymentStatus: string;
    lastPaymentDate?: Date;
    nextDueDate?: Date;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    studentName?: string;
    totalPaid?: number;
    outstandingAmount?: number;
}
export interface CreatePaymentRequest {
    studentId?: string;
    studentPackageId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    paymentDate: Date;
    dueDate?: Date;
    description?: string;
    transactionId?: string;
}
export interface CreatePaymentPlanRequest {
    name: string;
    description?: string;
    amount: number;
    planType: PlanType;
    recurrenceType: RecurrenceType;
}
export interface CreateAssignmentRequest {
    paymentPlanId: string;
    targetType: AssignmentTargetType;
    targetId?: string;
    startDate: Date;
    endDate?: Date;
}
export interface BulkPaymentRequest {
    paymentPlanId: string;
    targetIds: string[];
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    notes?: string;
}
export interface UpdatePaymentRequest {
    amount?: number;
    paymentMethod?: PaymentMethod;
    paymentType?: PaymentType;
    paymentDate?: Date;
    dueDate?: Date;
    description?: string;
    transactionId?: string;
}
export interface RefundPaymentRequest {
    refundAmount: number;
    refundDate: Date;
    reason?: string;
}
export interface PaymentFilters {
    studentId?: string;
    paymentMethod?: PaymentMethod;
    paymentType?: PaymentType;
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    recordedBy?: string;
    limit?: number;
    offset?: number;
}
export interface PaymentPlanFilters {
    planType?: PlanType;
    recurrenceType?: RecurrenceType;
    isActive?: boolean;
    createdBy?: string;
    limit?: number;
    offset?: number;
}
export interface PaymentSummary {
    establishmentId: string;
    totalRevenue: number;
    totalPayments: number;
    pendingAmount: number;
    refundedAmount: number;
    paymentMethods: Array<{
        method: PaymentMethod;
        total: number;
        count: number;
    }>;
    paymentTypes: Array<{
        type: PaymentType;
        total: number;
        count: number;
    }>;
    recentPayments: Payment[];
}
export interface StudentPaymentHistory {
    studentId: string;
    studentName: string;
    totalPaid: number;
    outstandingAmount: number;
    lastPaymentDate?: Date;
    nextDueDate?: Date;
    payments: Payment[];
    packages: StudentPackage[];
    monthlyPayments: Array<{
        month: string;
        totalAmount: number;
        paymentCount: number;
    }>;
}
export interface StudentPaymentSummary {
    studentId: string;
    studentName: string;
    studentEmail?: string;
    phone: string;
    packageType: string;
    remainingClasses?: number;
    lastPaymentDate?: Date;
    lastPaymentAmount?: number;
    nextDueDate?: Date;
    paymentStatus: 'current' | 'due' | 'overdue';
    totalPaid: number;
    totalOwed: number;
    overdueAmount: number;
    packagePrice?: number;
    isActive: boolean;
}
export interface CohortPaymentReport {
    cohortId: string;
    cohortName: string;
    totalStudents: number;
    totalRevenue: number;
    averagePaymentPerStudent: number;
    paymentDistribution: Array<{
        studentId: string;
        studentName: string;
        totalPaid: number;
        outstandingAmount: number;
        lastPaymentDate?: Date;
        paymentStatus: 'up_to_date' | 'overdue' | 'partial';
    }>;
}
export interface RecurringPaymentSchedule {
    paymentPlanId: string;
    planName: string;
    nextRunDate: Date;
    affectedStudents: number;
    totalAmount: number;
    assignments: Array<{
        assignmentId: string;
        targetType: AssignmentTargetType;
        targetId?: string;
        targetName?: string;
        nextPaymentDate: Date;
        amount: number;
    }>;
}
export interface PaymentResponse<T = any> {
    success: boolean;
    data?: T;
    message: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface PaginatedPaymentResponse<T = any> {
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
export interface PaymentValidation {
    canCreatePayment: boolean;
    canAssignPlan: boolean;
    reason?: string;
    warnings?: string[];
}
export declare const PAYMENT_ERRORS: {
    readonly STUDENT_NOT_FOUND: "STUDENT_NOT_FOUND";
    readonly PAYMENT_PLAN_NOT_FOUND: "PAYMENT_PLAN_NOT_FOUND";
    readonly ASSIGNMENT_NOT_FOUND: "ASSIGNMENT_NOT_FOUND";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly INVALID_PAYMENT_AMOUNT: "INVALID_PAYMENT_AMOUNT";
    readonly PAYMENT_ALREADY_PROCESSED: "PAYMENT_ALREADY_PROCESSED";
    readonly REFUND_EXCEEDS_ORIGINAL: "REFUND_EXCEEDS_ORIGINAL";
    readonly PLAN_ALREADY_ASSIGNED: "PLAN_ALREADY_ASSIGNED";
    readonly INVALID_RECURRENCE_DATE: "INVALID_RECURRENCE_DATE";
    readonly TARGET_NOT_FOUND: "TARGET_NOT_FOUND";
};
export interface PaymentActivity {
    id: string;
    establishmentId: string;
    userId: string;
    action: 'payment_created' | 'payment_updated' | 'payment_refunded' | 'plan_created' | 'plan_assigned' | 'bulk_payment';
    entityType: 'payment' | 'payment_plan' | 'assignment';
    entityId: string;
    details?: any;
    timestamp: Date;
}
export interface RecurringPaymentJob {
    id: string;
    paymentPlanId: string;
    scheduledDate: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processedCount: number;
    failedCount: number;
    totalAmount: number;
    errors?: string[];
    createdAt: Date;
    completedAt?: Date;
}
