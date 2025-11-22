import { LoggerService } from "../../services/LoggerService.js";
import { PaymentsRepository } from "./payments.repository.js";
import { Payment, PaymentPlan, PaymentPlanAssignment, PaymentFilters, PaymentPlanFilters, CreatePaymentRequest, CreatePaymentPlanRequest, CreateAssignmentRequest, UpdatePaymentRequest, RefundPaymentRequest, BulkPaymentRequest, PaymentSummary, StudentPaymentHistory } from "./payments.types.js";
export declare class PaymentsService {
    private paymentsRepository;
    private logger;
    constructor(paymentsRepository: PaymentsRepository, logger: LoggerService);
    createPayment(establishmentId: string, paymentData: CreatePaymentRequest, recordedBy: string): Promise<Payment>;
    getPaymentById(establishmentId: string, paymentId: string): Promise<Payment>;
    getPayments(establishmentId: string, filters?: PaymentFilters): Promise<{
        payments: Payment[];
        total: number;
    }>;
    updatePayment(establishmentId: string, paymentId: string, updateData: UpdatePaymentRequest, updatedBy: string): Promise<Payment>;
    refundPayment(establishmentId: string, paymentId: string, refundData: RefundPaymentRequest, processedBy: string): Promise<Payment>;
    deletePayment(establishmentId: string, paymentId: string, deletedBy: string): Promise<void>;
    createPaymentPlan(establishmentId: string, planData: CreatePaymentPlanRequest, createdBy: string): Promise<PaymentPlan>;
    getPaymentPlanById(establishmentId: string, planId: string): Promise<PaymentPlan>;
    getPaymentPlans(establishmentId: string, filters?: PaymentPlanFilters): Promise<{
        plans: PaymentPlan[];
        total: number;
    }>;
    updatePaymentPlan(establishmentId: string, planId: string, updateData: Partial<CreatePaymentPlanRequest>, updatedBy: string): Promise<PaymentPlan>;
    deactivatePaymentPlan(establishmentId: string, planId: string, deactivatedBy: string): Promise<void>;
    assignPaymentPlan(establishmentId: string, assignmentData: CreateAssignmentRequest, assignedBy: string): Promise<PaymentPlanAssignment>;
    getAssignmentsByPlan(establishmentId: string, paymentPlanId: string): Promise<PaymentPlanAssignment[]>;
    processBulkPayments(establishmentId: string, bulkRequest: BulkPaymentRequest, processedBy: string): Promise<{
        successful: Payment[];
        failed: Array<{
            targetId: string;
            error: string;
        }>;
    }>;
    getPaymentSummary(establishmentId: string, startDate?: string, endDate?: string): Promise<PaymentSummary>;
    getStudentPaymentHistory(establishmentId: string, studentId: string): Promise<StudentPaymentHistory>;
    getStudentPaymentSummaries(establishmentId: string, filters?: {
        status?: 'current' | 'due' | 'overdue';
    }): Promise<any[]>;
    private validatePaymentCreation;
    private validatePlanAssignment;
    private updatePackagePaymentStatus;
}
