import { Router } from "express";
import { PaymentsController } from "./payments.controller.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { AuditMiddleware } from "../../middleware/AuditMiddleware.js";

export function createPaymentsRoutes(
  paymentsController: PaymentsController,
  authMiddleware: AuthMiddleware,
  auditMiddleware: AuditMiddleware
): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware.authenticate());

  // IMPORTANT: Specific routes must come BEFORE parameterized routes (/:id)
  // Otherwise Express will match "plans" or "student-summaries" as an ID

  // Reporting and analytics routes (must be before /:paymentId)
  router.get(
    "/summary",
    authMiddleware.requireRoles(['manager']), // Only managers can view revenue summaries
    paymentsController.getPaymentSummary
  );

  router.get(
    "/student-summaries",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getStudentPaymentSummaries
  );

  router.get(
    "/dashboard/stats",
    authMiddleware.requireRoles(['manager']), // Only managers can view financial dashboard
    paymentsController.getDashboardStats
  );

  // Bulk operations (must be before /:paymentId)
  router.post(
    "/bulk-payments",
    authMiddleware.requireRoles(['manager', 'instructor']),
    auditMiddleware.logBatch('payments', 'process_bulk_payments'),
    paymentsController.processBulkPayments
  );

  // Payment Plan routes (must be before /:paymentId)
  /**
   * @swagger
   * /payments/plans:
   *   post:
   *     summary: Create a new payment plan
   *     description: Creates a template for recurring payments that can be assigned to students, cohorts, or establishment-wide
   *     tags: [Payment Plans]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePaymentPlan'
   *     responses:
   *       201:
   *         description: Payment plan created successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaymentResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/PaymentPlan'
   *       400:
   *         description: Invalid plan data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    "/plans",
    authMiddleware.requireRoles(['manager']), // Only managers can create plans
    auditMiddleware.log('payments', 'create_payment_plan'),
    paymentsController.createPaymentPlan
  );

  router.get(
    "/plans/:planId",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getPaymentPlan
  );

  router.get(
    "/plans",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getPaymentPlans
  );

  // Assignment routes
  /**
   * @swagger
   * /payments/plans/assign:
   *   post:
   *     summary: Assign a payment plan to targets
   *     description: Assigns a payment plan to specific students, cohorts, or establishment-wide
   *     tags: [Payment Plans]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAssignment'
   *     responses:
   *       201:
   *         description: Payment plan assigned successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaymentResponse'
   *       400:
   *         description: Invalid assignment data
   *       404:
   *         description: Payment plan or target not found
   *       409:
   *         description: Plan already assigned to this target
   */
  router.post(
    "/plans/assign",
    authMiddleware.requireRoles(['manager', 'instructor']),
    auditMiddleware.log('payments', 'assign_payment_plan'),
    paymentsController.assignPaymentPlan
  );

  router.get(
    "/plans/:planId/assignments",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getPlanAssignments
  );

  router.put(
    "/plans/:planId",
    authMiddleware.requireRoles(['manager']),
    auditMiddleware.log('payments', 'update_payment_plan'),
    paymentsController.updatePaymentPlan
  );

  router.delete(
    "/plans/:planId",
    authMiddleware.requireRoles(['manager']),
    auditMiddleware.log('payments', 'delete_payment_plan'),
    paymentsController.deletePaymentPlan
  );

  // // Discount routes (must be before /:paymentId)
  // router.get(
  //   "/discounts",
  //   authMiddleware.requireRoles(['manager', 'instructor']),
  //   paymentsController.getPaymentDiscounts
  // );

  // router.post(
  //   "/discounts",
  //   authMiddleware.requireRoles(['manager']),
  //   auditMiddleware.log('payments', 'create_discount'),
  //   paymentsController.createDiscount
  // );

  // Student-specific routes (must be before /:paymentId)
  router.get(
    "/students/:studentId/history",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getStudentPaymentHistory
  );

  // TODO: Add when controller method is implemented
  // router.get(
  //   "/students/:studentId/assignments",
  //   authMiddleware.requireRoles(['manager', 'instructor']),
  //   paymentsController.getStudentPlanAssignments
  // );

  // Cohort-specific routes (must be before /:paymentId)
  router.get(
    "/cohorts/:cohortId/report",
    authMiddleware.requireRoles(['manager']), // Only managers can view financial reports
    paymentsController.getCohortPaymentReport
  );

  // TODO: Add when controller method is implemented
  // router.get(
  //   "/cohorts/:cohortId/assignments",
  //   authMiddleware.requireRoles(['manager', 'instructor']),
  //   paymentsController.getCohortPlanAssignments
  // );

  // TODO: Add when controller method is implemented
  // Cohort assignment route
  // router.post(
  //   "/plans/assign-cohort",
  //   authMiddleware.requireRoles(['manager', 'instructor']),
  //   auditMiddleware.log('payments', 'assign_plan_to_cohort'),
  //   paymentsController.assignPlanToCohort
  // );

  // Payment CRUD routes (generic routes with :id parameters MUST be last)
  /**
   * @swagger
   * /payments/payments:
   *   post:
   *     summary: Create a new payment record
   *     description: Records a new payment made by a student. Only managers and instructors can create payment records.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePayment'
   *     responses:
   *       201:
   *         description: Payment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaymentResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/Payment'
   *       400:
   *         description: Invalid payment data
   *       401:
   *         description: Unauthorized - Invalid or missing authentication
   *       403:
   *         description: Forbidden - Insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/",
    authMiddleware.requireRoles(['manager', 'instructor']),
    auditMiddleware.log('payments', 'record_payment'),
    paymentsController.createPayment
  );

  router.get(
    "/",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getPayments
  );

  // Generic :paymentId routes MUST be last
  router.get(
    "/:paymentId",
    authMiddleware.requireRoles(['manager', 'instructor']),
    paymentsController.getPayment
  );

  router.put(
    "/:paymentId",
    authMiddleware.requireRoles(['manager', 'instructor']),
    auditMiddleware.log('payments', 'update_payment'),
    paymentsController.updatePayment
  );

  router.post(
    "/:paymentId/refund",
    authMiddleware.requireRoles(['manager']), // Only managers can refund
    auditMiddleware.log('payments', 'refund_payment'),
    paymentsController.refundPayment
  );

  router.delete(
    "/:paymentId",
    authMiddleware.requireRoles(['manager']), // Only managers can delete
    auditMiddleware.log('payments', 'delete_payment'),
    paymentsController.deletePayment
  );

  return router;
}