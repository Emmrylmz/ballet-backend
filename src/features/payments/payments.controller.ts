import { Request, Response, NextFunction } from "express";
import { PaymentsService } from "./payments.service.js";
import {
  CreatePaymentRequest,
  CreatePaymentPlanRequest,
  CreateAssignmentRequest,
  UpdatePaymentRequest,
  RefundPaymentRequest,
  BulkPaymentRequest,
  PaymentFilters,
  PaymentPlanFilters,
  PaymentResponse,
  PaginatedPaymentResponse
} from "./payments.types.js";

export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // Payment CRUD operations
  createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const userId = (req as any).user?.id;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
          error: { code: 'MISSING_USER_ID', message: 'User ID is required' }
        } as PaymentResponse);
        return;
      }

      const paymentData: CreatePaymentRequest = req.body;
      const payment = await this.paymentsService.createPayment(
        establishmentId,
        paymentData,
        userId
      );

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment created successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { paymentId } = req.params;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      const payment = await this.paymentsService.getPaymentById(establishmentId, paymentId);

      res.json({
        success: true,
        data: payment,
        message: 'Payment retrieved successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      const filters: PaymentFilters = {
        studentId: req.query.studentId as string,
        paymentMethod: req.query.paymentMethod as any,
        paymentType: req.query.paymentType as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        recordedBy: req.query.recordedBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await this.paymentsService.getPayments(establishmentId, filters);
      const page = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
      const totalPages = Math.ceil(result.total / (filters.limit || 50));

      res.json({
        success: true,
        data: result.payments,
        pagination: {
          total: result.total,
          page,
          limit: filters.limit || 50,
          totalPages
        },
        message: 'Payments retrieved successfully'
      } as PaginatedPaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  updatePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { paymentId } = req.params;
      const userId = (req as any).user?.id;

      if (!establishmentId || !userId) {
        res.status(400).json({ success: false, message: 'Missing required parameters' });
        return;
      }

      const updateData: UpdatePaymentRequest = req.body;
      const payment = await this.paymentsService.updatePayment(
        establishmentId,
        paymentId,
        updateData,
        userId
      );

      res.json({
        success: true,
        data: payment,
        message: 'Payment updated successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  refundPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { paymentId } = req.params;
      const userId = (req as any).user?.id;

      if (!establishmentId || !userId) {
        res.status(400).json({ success: false, message: 'Missing required parameters' });
        return;
      }

      const refundData: RefundPaymentRequest = req.body;
      const payment = await this.paymentsService.refundPayment(
        establishmentId,
        paymentId,
        refundData,
        userId
      );

      res.json({
        success: true,
        data: payment,
        message: 'Payment refunded successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  deletePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { paymentId } = req.params;
      const userId = (req as any).user?.id;

      if (!establishmentId || !userId) {
        res.status(400).json({ success: false, message: 'Missing required parameters' });
        return;
      }

      await this.paymentsService.deletePayment(establishmentId, paymentId, userId);

      res.json({
        success: true,
        message: 'Payment deleted successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  // Payment Plan operations
  createPaymentPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const userId = (req as any).user?.id;

      if (!establishmentId || !userId) {
        res.status(400).json({ success: false, message: 'Missing required parameters' });
        return;
      }

      const planData: CreatePaymentPlanRequest = req.body;
      const plan = await this.paymentsService.createPaymentPlan(
        establishmentId,
        planData,
        userId
      );

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Payment plan created successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getPaymentPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { planId } = req.params;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      const plan = await this.paymentsService.getPaymentPlanById(establishmentId, planId);

      res.json({
        success: true,
        data: plan,
        message: 'Payment plan retrieved successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getPaymentPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      const filters: PaymentPlanFilters = {
        planType: req.query.planType as any,
        recurrenceType: req.query.recurrenceType as any,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        createdBy: req.query.createdBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await this.paymentsService.getPaymentPlans(establishmentId, filters);
      const page = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
      const totalPages = Math.ceil(result.total / (filters.limit || 50));

      res.json({
        success: true,
        data: result.plans,
        pagination: {
          total: result.total,
          page,
          limit: filters.limit || 50,
          totalPages
        },
        message: 'Payment plans retrieved successfully'
      } as PaginatedPaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  updatePaymentPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const userId = (req as any).user?.id;
      const { planId } = req.params;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      const updateData = req.body;
      const updatedPlan = await this.paymentsService.updatePaymentPlan(
        establishmentId,
        planId,
        updateData,
        userId
      );

      res.json({
        success: true,
        data: updatedPlan,
        message: 'Payment plan updated successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  deletePaymentPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const userId = (req as any).user?.id;
      const { planId } = req.params;

      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: 'Establishment ID is required',
          error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
        } as PaymentResponse);
        return;
      }

      await this.paymentsService.deletePaymentPlan(establishmentId, planId, userId);

      res.json({
        success: true,
        data: null,
        message: 'Payment plan deleted successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  // Assignment operations
  assignPaymentPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const userId = (req as any).user?.id;

      if (!establishmentId || !userId) {
        res.status(400).json({ success: false, message: 'Missing required parameters' });
        return;
      }

      const assignmentData: CreateAssignmentRequest = req.body;
      const assignment = await this.paymentsService.assignPaymentPlan(
        establishmentId,
        assignmentData,
        userId
      );

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Payment plan assigned successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getPlanAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { planId } = req.params;

      if (!establishmentId) {
        res.status(400).json({ success: false, message: 'Establishment ID is required' });
        return;
      }

      const assignments = await this.paymentsService.getAssignmentsByPlan(establishmentId, planId);

      res.json({
        success: true,
        data: assignments,
        message: 'Plan assignments retrieved successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  // Bulk operations
  processBulkPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const userId = (req as any).user?.id;

      if (!establishmentId || !userId) {
        res.status(400).json({ success: false, message: 'Missing required parameters' });
        return;
      }

      const bulkRequest: BulkPaymentRequest = req.body;
      const result = await this.paymentsService.processBulkPayments(
        establishmentId,
        bulkRequest,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: `Bulk payment processed: ${result.successful.length} successful, ${result.failed.length} failed`
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  // Reporting and analytics
  getPaymentSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!establishmentId) {
        res.status(400).json({ success: false, message: 'Establishment ID is required' });
        return;
      }

      const summary = await this.paymentsService.getPaymentSummary(
        establishmentId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: summary,
        message: 'Payment summary retrieved successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getStudentPaymentHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { studentId } = req.params;

      if (!establishmentId) {
        res.status(400).json({ success: false, message: 'Establishment ID is required' });
        return;
      }

      const history = await this.paymentsService.getStudentPaymentHistory(
        establishmentId,
        studentId
      );

      res.json({
        success: true,
        data: history,
        message: 'Student payment history retrieved successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  getStudentPaymentSummaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const status = req.query.status as 'current' | 'due' | 'overdue' | undefined;

      if (!establishmentId) {
        res.status(400).json({ success: false, message: 'Establishment ID is required' });
        return;
      }

      const filters = status ? { status } : undefined;
      const summaries = await this.paymentsService.getStudentPaymentSummaries(establishmentId, filters);

      res.json({
        success: true,
        data: summaries,
        total: summaries.length,
        message: 'Student payment summaries retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Cohort payment report
  getCohortPaymentReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const { cohortId } = req.params;

      // This would need to be implemented in the service
      res.status(501).json({
        success: false,
        message: 'Cohort payment report not yet implemented',
        error: { code: 'NOT_IMPLEMENTED', message: 'Feature not yet implemented' }
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };

  // Dashboard endpoints for quick stats
  getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const establishmentId = req.headers['x-establishment-id'] as string;
      const period = req.query.period as string || 'month'; // today, week, month, year

      if (!establishmentId) {
        res.status(400).json({ success: false, message: 'Establishment ID is required' });
        return;
      }

      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      switch (period) {
        case 'today':
          startDate = now.toISOString().split('T')[0];
          endDate = startDate;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = weekAgo.toISOString().split('T')[0];
          endDate = now.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          startDate = monthAgo.toISOString().split('T')[0];
          endDate = now.toISOString().split('T')[0];
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          startDate = yearAgo.toISOString().split('T')[0];
          endDate = now.toISOString().split('T')[0];
          break;
      }

      const summary = await this.paymentsService.getPaymentSummary(
        establishmentId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate,
          ...summary
        },
        message: 'Dashboard stats retrieved successfully'
      } as PaymentResponse);
    } catch (error) {
      next(error);
    }
  };
}