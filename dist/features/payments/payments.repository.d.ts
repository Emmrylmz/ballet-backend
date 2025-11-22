import { DatabaseService } from "../../services/DatabaseService.js";
import { Payment, PaymentPlan, PaymentPlanAssignment, PaymentFilters, PaymentPlanFilters, CreatePaymentRequest, CreatePaymentPlanRequest, CreateAssignmentRequest, UpdatePaymentRequest, RefundPaymentRequest, PaymentSummary, StudentPaymentHistory, StudentPaymentSummary } from "./payments.types.js";
export declare class PaymentsRepository {
    private db;
    constructor(db: DatabaseService);
    createPayment(establishmentId: string, paymentData: CreatePaymentRequest, recordedBy: string): Promise<Payment>;
    getPaymentById(establishmentId: string, paymentId: string): Promise<Payment | null>;
    getPayments(establishmentId: string, filters?: PaymentFilters): Promise<{
        payments: Payment[];
        total: number;
    }>;
    updatePayment(establishmentId: string, paymentId: string, updateData: UpdatePaymentRequest): Promise<Payment>;
    refundPayment(establishmentId: string, paymentId: string, refundData: RefundPaymentRequest): Promise<Payment>;
    deletePayment(establishmentId: string, paymentId: string): Promise<boolean>;
    createPaymentPlan(establishmentId: string, planData: CreatePaymentPlanRequest, createdBy: string): Promise<PaymentPlan>;
    getPaymentPlanById(establishmentId: string, planId: string): Promise<PaymentPlan | null>;
    getPaymentPlans(establishmentId: string, filters?: PaymentPlanFilters): Promise<{
        plans: PaymentPlan[];
        total: number;
    }>;
    createAssignment(establishmentId: string, assignmentData: CreateAssignmentRequest): Promise<PaymentPlanAssignment>;
    getAssignmentsByPlan(establishmentId: string, paymentPlanId: string): Promise<PaymentPlanAssignment[]>;
    getPaymentSummary(establishmentId: string, startDate?: string, endDate?: string): Promise<PaymentSummary>;
    getStudentPaymentHistory(establishmentId: string, studentId: string): Promise<StudentPaymentHistory | null>;
    getStudentPaymentSummaries(establishmentId: string, filters?: {
        status?: 'current' | 'due' | 'overdue';
    }): Promise<StudentPaymentSummary[]>;
}
