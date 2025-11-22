import { LoggerService } from "../../services/LoggerService.js";
import { PaymentsRepository } from "./payments.repository.js";
import {
  Payment,
  PaymentPlan,
  PaymentPlanAssignment,
  StudentPackage,
  PaymentFilters,
  PaymentPlanFilters,
  CreatePaymentRequest,
  CreatePaymentPlanRequest,
  CreateAssignmentRequest,
  UpdatePaymentRequest,
  RefundPaymentRequest,
  BulkPaymentRequest,
  PaymentSummary,
  StudentPaymentHistory,
  CohortPaymentReport,
  RecurringPaymentSchedule,
  PaymentValidation,
  PAYMENT_ERRORS
} from "./payments.types.js";

export class PaymentsService {
  constructor(
    private paymentsRepository: PaymentsRepository,
    private logger: LoggerService
  ) {}

  // Payment operations
  async createPayment(
    establishmentId: string,
    paymentData: CreatePaymentRequest,
    recordedBy: string
  ): Promise<Payment> {
    try {
      // Validate payment data
      await this.validatePaymentCreation(establishmentId, paymentData);

      const payment = await this.paymentsRepository.createPayment(
        establishmentId,
        paymentData,
        recordedBy
      );

      // Update student package if applicable
      if (payment.studentPackageId) {
        await this.updatePackagePaymentStatus(payment.studentPackageId, payment.amount);
      }

      this.logger.info('Payment created successfully', {
        establishmentId,
        paymentId: payment.id,
        amount: payment.amount,
        studentId: payment.studentId
      });

      return payment;
    } catch (error) {
      this.logger.error('Failed to create payment', {
        establishmentId,
        error,
        paymentData
      });
      throw error;
    }
  }

  async getPaymentById(establishmentId: string, paymentId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.getPaymentById(establishmentId, paymentId);
    if (!payment) {
      throw new Error(PAYMENT_ERRORS.PAYMENT_PLAN_NOT_FOUND);
    }
    return payment;
  }

  async getPayments(
    establishmentId: string,
    filters: PaymentFilters = {}
  ): Promise<{ payments: Payment[], total: number }> {
    return await this.paymentsRepository.getPayments(establishmentId, filters);
  }

  async updatePayment(
    establishmentId: string,
    paymentId: string,
    updateData: UpdatePaymentRequest,
    updatedBy: string
  ): Promise<Payment> {
    try {
      // Verify payment exists
      await this.getPaymentById(establishmentId, paymentId);

      const updatedPayment = await this.paymentsRepository.updatePayment(
        establishmentId,
        paymentId,
        updateData
      );

      this.logger.info('Payment updated successfully', {
        establishmentId,
        paymentId,
        updatedBy,
        changes: updateData
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error('Failed to update payment', {
        establishmentId,
        paymentId,
        error
      });
      throw error;
    }
  }

  async refundPayment(
    establishmentId: string,
    paymentId: string,
    refundData: RefundPaymentRequest,
    processedBy: string
  ): Promise<Payment> {
    try {
      // Verify payment exists and can be refunded
      const payment = await this.getPaymentById(establishmentId, paymentId);

      if (payment.isRefunded) {
        throw new Error('Payment is already refunded');
      }

      if (refundData.refundAmount > payment.amount) {
        throw new Error(PAYMENT_ERRORS.REFUND_EXCEEDS_ORIGINAL);
      }

      const refundedPayment = await this.paymentsRepository.refundPayment(
        establishmentId,
        paymentId,
        refundData
      );

      this.logger.info('Payment refunded successfully', {
        establishmentId,
        paymentId,
        refundAmount: refundData.refundAmount,
        processedBy
      });

      return refundedPayment;
    } catch (error) {
      this.logger.error('Failed to refund payment', {
        establishmentId,
        paymentId,
        error
      });
      throw error;
    }
  }

  async deletePayment(
    establishmentId: string,
    paymentId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      // Verify payment exists
      await this.getPaymentById(establishmentId, paymentId);

      const deleted = await this.paymentsRepository.deletePayment(establishmentId, paymentId);
      if (!deleted) {
        throw new Error('Failed to delete payment');
      }

      this.logger.info('Payment deleted successfully', {
        establishmentId,
        paymentId,
        deletedBy
      });
    } catch (error) {
      this.logger.error('Failed to delete payment', {
        establishmentId,
        paymentId,
        error
      });
      throw error;
    }
  }

  // Payment Plan operations
  async createPaymentPlan(
    establishmentId: string,
    planData: CreatePaymentPlanRequest,
    createdBy: string
  ): Promise<PaymentPlan> {
    try {
      const plan = await this.paymentsRepository.createPaymentPlan(
        establishmentId,
        planData,
        createdBy
      );

      this.logger.info('Payment plan created successfully', {
        establishmentId,
        planId: plan.id,
        planName: plan.name,
        createdBy
      });

      return plan;
    } catch (error) {
      this.logger.error('Failed to create payment plan', {
        establishmentId,
        error,
        planData
      });
      throw error;
    }
  }

  async getPaymentPlanById(establishmentId: string, planId: string): Promise<PaymentPlan> {
    const plan = await this.paymentsRepository.getPaymentPlanById(establishmentId, planId);
    if (!plan) {
      throw new Error(PAYMENT_ERRORS.PAYMENT_PLAN_NOT_FOUND);
    }
    return plan;
  }

  async getPaymentPlans(
    establishmentId: string,
    filters: PaymentPlanFilters = {}
  ): Promise<{ plans: PaymentPlan[], total: number }> {
    return await this.paymentsRepository.getPaymentPlans(establishmentId, filters);
  }

  async updatePaymentPlan(
    establishmentId: string,
    planId: string,
    updateData: Partial<CreatePaymentPlanRequest>,
    updatedBy: string
  ): Promise<PaymentPlan> {
    try {
      // Verify plan exists
      await this.getPaymentPlanById(establishmentId, planId);

      // Update the plan using repository
      const updatedPlan = await this.paymentsRepository.updatePaymentPlan(
        establishmentId,
        planId,
        updateData
      );

      this.logger.info('Payment plan updated successfully', {
        establishmentId,
        planId,
        updatedBy
      });

      return updatedPlan;
    } catch (error) {
      this.logger.error('Failed to update payment plan', {
        establishmentId,
        planId,
        error
      });
      throw error;
    }
  }

  async deactivatePaymentPlan(
    establishmentId: string,
    planId: string,
    deactivatedBy: string
  ): Promise<void> {
    try {
      // Verify plan exists
      await this.getPaymentPlanById(establishmentId, planId);

      // Deactivate plan and all its assignments
      // This would need to be implemented in the repository

      this.logger.info('Payment plan deactivated', {
        establishmentId,
        planId,
        deactivatedBy
      });
    } catch (error) {
      this.logger.error('Failed to deactivate payment plan', {
        establishmentId,
        planId,
        error
      });
      throw error;
    }
  }

  async deletePaymentPlan(
    establishmentId: string,
    planId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      // Verify plan exists
      const plan = await this.getPaymentPlanById(establishmentId, planId);

      if (!plan) {
        throw new Error('Payment plan not found');
      }

      // Check if plan has active assignments
      const assignments = await this.paymentsRepository.getAssignmentsByPlan(
        establishmentId,
        planId
      );

      const activeAssignments = assignments.filter(a => a.isActive);

      if (activeAssignments.length > 0) {
        throw new Error(`Cannot delete plan with ${activeAssignments.length} active assignments. Please deactivate or remove assignments first.`);
      }

      // Delete the plan
      const deleted = await this.paymentsRepository.deletePaymentPlan(
        establishmentId,
        planId
      );

      if (!deleted) {
        throw new Error('Failed to delete payment plan');
      }

      this.logger.info('Payment plan deleted successfully', {
        establishmentId,
        planId,
        deletedBy
      });
    } catch (error) {
      this.logger.error('Failed to delete payment plan', {
        establishmentId,
        planId,
        error
      });
      throw error;
    }
  }

  // Assignment operations
  async assignPaymentPlan(
    establishmentId: string,
    assignmentData: CreateAssignmentRequest,
    assignedBy: string
  ): Promise<PaymentPlanAssignment> {
    try {
      // Validate assignment
      await this.validatePlanAssignment(establishmentId, assignmentData);

      const assignment = await this.paymentsRepository.createAssignment(
        establishmentId,
        assignmentData
      );

      this.logger.info('Payment plan assigned successfully', {
        establishmentId,
        assignmentId: assignment.id,
        planId: assignmentData.paymentPlanId,
        targetType: assignmentData.targetType,
        targetId: assignmentData.targetId,
        assignedBy
      });

      return assignment;
    } catch (error) {
      this.logger.error('Failed to assign payment plan', {
        establishmentId,
        error,
        assignmentData
      });
      throw error;
    }
  }

  async getAssignmentsByPlan(
    establishmentId: string,
    paymentPlanId: string
  ): Promise<PaymentPlanAssignment[]> {
    // Verify plan exists
    await this.getPaymentPlanById(establishmentId, paymentPlanId);

    return await this.paymentsRepository.getAssignmentsByPlan(establishmentId, paymentPlanId);
  }

  // Bulk operations
  async processBulkPayments(
    establishmentId: string,
    bulkRequest: BulkPaymentRequest,
    processedBy: string
  ): Promise<{ successful: Payment[], failed: Array<{ targetId: string, error: string }> }> {
    const successful: Payment[] = [];
    const failed: Array<{ targetId: string, error: string }> = [];

    // Get payment plan details
    const plan = await this.getPaymentPlanById(establishmentId, bulkRequest.paymentPlanId);

    for (const targetId of bulkRequest.targetIds) {
      try {
        const paymentData: CreatePaymentRequest = {
          studentId: targetId,
          amount: plan.amount,
          paymentMethod: bulkRequest.paymentMethod,
          paymentType: 'monthly_fee', // or derive from plan type
          paymentDate: bulkRequest.paymentDate,
          description: `Bulk payment from plan: ${plan.name}${bulkRequest.notes ? ` - ${bulkRequest.notes}` : ''}`
        };

        const payment = await this.createPayment(establishmentId, paymentData, processedBy);
        successful.push(payment);
      } catch (error) {
        failed.push({
          targetId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.info('Bulk payment processing completed', {
      establishmentId,
      planId: bulkRequest.paymentPlanId,
      successful: successful.length,
      failed: failed.length,
      processedBy
    });

    return { successful, failed };
  }

  // Reporting and analytics
  async getPaymentSummary(
    establishmentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaymentSummary> {
    return await this.paymentsRepository.getPaymentSummary(establishmentId, startDate, endDate);
  }

  async getStudentPaymentHistory(
    establishmentId: string,
    studentId: string
  ): Promise<StudentPaymentHistory> {
    const history = await this.paymentsRepository.getStudentPaymentHistory(establishmentId, studentId);
    if (!history) {
      throw new Error(PAYMENT_ERRORS.STUDENT_NOT_FOUND);
    }
    return history;
  }

  async getStudentPaymentSummaries(
    establishmentId: string,
    filters?: { status?: 'current' | 'due' | 'overdue' }
  ): Promise<any[]> {
    return await this.paymentsRepository.getStudentPaymentSummaries(establishmentId, filters);
  }

  // Validation helpers
  private async validatePaymentCreation(
    establishmentId: string,
    paymentData: CreatePaymentRequest
  ): Promise<void> {
    if (paymentData.amount <= 0) {
      throw new Error(PAYMENT_ERRORS.INVALID_PAYMENT_AMOUNT);
    }

    // Additional validations can be added here
    // - Verify student exists if studentId provided
    // - Verify student package exists if studentPackageId provided
    // - Check for duplicate transactions if transactionId provided
  }

  private async validatePlanAssignment(
    establishmentId: string,
    assignmentData: CreateAssignmentRequest
  ): Promise<void> {
    // Verify payment plan exists
    await this.getPaymentPlanById(establishmentId, assignmentData.paymentPlanId);

    // Verify target exists based on target type
    if (assignmentData.targetType === 'student' && assignmentData.targetId) {
      // Would need to verify student exists
    } else if (assignmentData.targetType === 'cohort' && assignmentData.targetId) {
      // Would need to verify cohort exists
    }

    // Check for existing active assignments (prevent duplicates)
    const existingAssignments = await this.getAssignmentsByPlan(
      establishmentId,
      assignmentData.paymentPlanId
    );

    const duplicateAssignment = existingAssignments.find(assignment =>
      assignment.targetType === assignmentData.targetType &&
      assignment.targetId === assignmentData.targetId &&
      assignment.isActive
    );

    if (duplicateAssignment) {
      throw new Error(PAYMENT_ERRORS.PLAN_ALREADY_ASSIGNED);
    }
  }

  private async updatePackagePaymentStatus(packageId: string, paymentAmount: number): Promise<void> {
    // This would update the student package payment status
    // Implementation would depend on your business logic
    // For example, update last_payment_date, calculate next_due_date, etc.

    this.logger.debug('Package payment status updated', {
      packageId,
      paymentAmount
    });
  }
}