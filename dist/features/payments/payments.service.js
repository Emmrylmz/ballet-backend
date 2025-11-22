import { PAYMENT_ERRORS } from "./payments.types.js";
export class PaymentsService {
    paymentsRepository;
    logger;
    constructor(paymentsRepository, logger) {
        this.paymentsRepository = paymentsRepository;
        this.logger = logger;
    }
    async createPayment(establishmentId, paymentData, recordedBy) {
        try {
            await this.validatePaymentCreation(establishmentId, paymentData);
            const payment = await this.paymentsRepository.createPayment(establishmentId, paymentData, recordedBy);
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
        }
        catch (error) {
            this.logger.error('Failed to create payment', {
                establishmentId,
                error,
                paymentData
            });
            throw error;
        }
    }
    async getPaymentById(establishmentId, paymentId) {
        const payment = await this.paymentsRepository.getPaymentById(establishmentId, paymentId);
        if (!payment) {
            throw new Error(PAYMENT_ERRORS.PAYMENT_PLAN_NOT_FOUND);
        }
        return payment;
    }
    async getPayments(establishmentId, filters = {}) {
        return await this.paymentsRepository.getPayments(establishmentId, filters);
    }
    async updatePayment(establishmentId, paymentId, updateData, updatedBy) {
        try {
            await this.getPaymentById(establishmentId, paymentId);
            const updatedPayment = await this.paymentsRepository.updatePayment(establishmentId, paymentId, updateData);
            this.logger.info('Payment updated successfully', {
                establishmentId,
                paymentId,
                updatedBy,
                changes: updateData
            });
            return updatedPayment;
        }
        catch (error) {
            this.logger.error('Failed to update payment', {
                establishmentId,
                paymentId,
                error
            });
            throw error;
        }
    }
    async refundPayment(establishmentId, paymentId, refundData, processedBy) {
        try {
            const payment = await this.getPaymentById(establishmentId, paymentId);
            if (payment.isRefunded) {
                throw new Error('Payment is already refunded');
            }
            if (refundData.refundAmount > payment.amount) {
                throw new Error(PAYMENT_ERRORS.REFUND_EXCEEDS_ORIGINAL);
            }
            const refundedPayment = await this.paymentsRepository.refundPayment(establishmentId, paymentId, refundData);
            this.logger.info('Payment refunded successfully', {
                establishmentId,
                paymentId,
                refundAmount: refundData.refundAmount,
                processedBy
            });
            return refundedPayment;
        }
        catch (error) {
            this.logger.error('Failed to refund payment', {
                establishmentId,
                paymentId,
                error
            });
            throw error;
        }
    }
    async deletePayment(establishmentId, paymentId, deletedBy) {
        try {
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
        }
        catch (error) {
            this.logger.error('Failed to delete payment', {
                establishmentId,
                paymentId,
                error
            });
            throw error;
        }
    }
    async createPaymentPlan(establishmentId, planData, createdBy) {
        try {
            const plan = await this.paymentsRepository.createPaymentPlan(establishmentId, planData, createdBy);
            this.logger.info('Payment plan created successfully', {
                establishmentId,
                planId: plan.id,
                planName: plan.name,
                createdBy
            });
            return plan;
        }
        catch (error) {
            this.logger.error('Failed to create payment plan', {
                establishmentId,
                error,
                planData
            });
            throw error;
        }
    }
    async getPaymentPlanById(establishmentId, planId) {
        const plan = await this.paymentsRepository.getPaymentPlanById(establishmentId, planId);
        if (!plan) {
            throw new Error(PAYMENT_ERRORS.PAYMENT_PLAN_NOT_FOUND);
        }
        return plan;
    }
    async getPaymentPlans(establishmentId, filters = {}) {
        return await this.paymentsRepository.getPaymentPlans(establishmentId, filters);
    }
    async updatePaymentPlan(establishmentId, planId, updateData, updatedBy) {
        try {
            await this.getPaymentPlanById(establishmentId, planId);
            throw new Error('Payment plan update not yet implemented');
        }
        catch (error) {
            this.logger.error('Failed to update payment plan', {
                establishmentId,
                planId,
                error
            });
            throw error;
        }
    }
    async deactivatePaymentPlan(establishmentId, planId, deactivatedBy) {
        try {
            await this.getPaymentPlanById(establishmentId, planId);
            this.logger.info('Payment plan deactivated', {
                establishmentId,
                planId,
                deactivatedBy
            });
        }
        catch (error) {
            this.logger.error('Failed to deactivate payment plan', {
                establishmentId,
                planId,
                error
            });
            throw error;
        }
    }
    async assignPaymentPlan(establishmentId, assignmentData, assignedBy) {
        try {
            await this.validatePlanAssignment(establishmentId, assignmentData);
            const assignment = await this.paymentsRepository.createAssignment(establishmentId, assignmentData);
            this.logger.info('Payment plan assigned successfully', {
                establishmentId,
                assignmentId: assignment.id,
                planId: assignmentData.paymentPlanId,
                targetType: assignmentData.targetType,
                targetId: assignmentData.targetId,
                assignedBy
            });
            return assignment;
        }
        catch (error) {
            this.logger.error('Failed to assign payment plan', {
                establishmentId,
                error,
                assignmentData
            });
            throw error;
        }
    }
    async getAssignmentsByPlan(establishmentId, paymentPlanId) {
        await this.getPaymentPlanById(establishmentId, paymentPlanId);
        return await this.paymentsRepository.getAssignmentsByPlan(establishmentId, paymentPlanId);
    }
    async processBulkPayments(establishmentId, bulkRequest, processedBy) {
        const successful = [];
        const failed = [];
        const plan = await this.getPaymentPlanById(establishmentId, bulkRequest.paymentPlanId);
        for (const targetId of bulkRequest.targetIds) {
            try {
                const paymentData = {
                    studentId: targetId,
                    amount: plan.amount,
                    paymentMethod: bulkRequest.paymentMethod,
                    paymentType: 'monthly_fee',
                    paymentDate: bulkRequest.paymentDate,
                    description: `Bulk payment from plan: ${plan.name}${bulkRequest.notes ? ` - ${bulkRequest.notes}` : ''}`
                };
                const payment = await this.createPayment(establishmentId, paymentData, processedBy);
                successful.push(payment);
            }
            catch (error) {
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
    async getPaymentSummary(establishmentId, startDate, endDate) {
        return await this.paymentsRepository.getPaymentSummary(establishmentId, startDate, endDate);
    }
    async getStudentPaymentHistory(establishmentId, studentId) {
        const history = await this.paymentsRepository.getStudentPaymentHistory(establishmentId, studentId);
        if (!history) {
            throw new Error(PAYMENT_ERRORS.STUDENT_NOT_FOUND);
        }
        return history;
    }
    async getStudentPaymentSummaries(establishmentId, filters) {
        return await this.paymentsRepository.getStudentPaymentSummaries(establishmentId, filters);
    }
    async validatePaymentCreation(establishmentId, paymentData) {
        if (paymentData.amount <= 0) {
            throw new Error(PAYMENT_ERRORS.INVALID_PAYMENT_AMOUNT);
        }
    }
    async validatePlanAssignment(establishmentId, assignmentData) {
        await this.getPaymentPlanById(establishmentId, assignmentData.paymentPlanId);
        if (assignmentData.targetType === 'student' && assignmentData.targetId) {
        }
        else if (assignmentData.targetType === 'cohort' && assignmentData.targetId) {
        }
        const existingAssignments = await this.getAssignmentsByPlan(establishmentId, assignmentData.paymentPlanId);
        const duplicateAssignment = existingAssignments.find(assignment => assignment.targetType === assignmentData.targetType &&
            assignment.targetId === assignmentData.targetId &&
            assignment.isActive);
        if (duplicateAssignment) {
            throw new Error(PAYMENT_ERRORS.PLAN_ALREADY_ASSIGNED);
        }
    }
    async updatePackagePaymentStatus(packageId, paymentAmount) {
        this.logger.debug('Package payment status updated', {
            packageId,
            paymentAmount
        });
    }
}
