import { Router } from "express";
export function createPaymentsRoutes(paymentsController, authMiddleware) {
    const router = Router();
    router.use(authMiddleware.authenticate());
    router.post("/payments", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.createPayment);
    router.get("/payments/:paymentId", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getPayment);
    router.get("/payments", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getPayments);
    router.put("/payments/:paymentId", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.updatePayment);
    router.post("/payments/:paymentId/refund", authMiddleware.requireRoles(['manager']), paymentsController.refundPayment);
    router.delete("/payments/:paymentId", authMiddleware.requireRoles(['manager']), paymentsController.deletePayment);
    router.post("/plans", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.createPaymentPlan);
    router.get("/plans/:planId", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getPaymentPlan);
    router.get("/plans", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getPaymentPlans);
    router.post("/plans/assign", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.assignPaymentPlan);
    router.get("/plans/:planId/assignments", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getPlanAssignments);
    router.post("/bulk-payments", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.processBulkPayments);
    router.get("/summary", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getPaymentSummary);
    router.get("/students/:studentId/history", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getStudentPaymentHistory);
    router.get("/student-summaries", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getStudentPaymentSummaries);
    router.get("/cohorts/:cohortId/report", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getCohortPaymentReport);
    router.get("/dashboard/stats", authMiddleware.requireRoles(['manager', 'instructor']), paymentsController.getDashboardStats);
    return router;
}
