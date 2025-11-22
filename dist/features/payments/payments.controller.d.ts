import { Request, Response, NextFunction } from "express";
import { PaymentsService } from "./payments.service.js";
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    createPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updatePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    refundPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deletePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createPaymentPlan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentPlan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentPlans: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    assignPaymentPlan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPlanAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    processBulkPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStudentPaymentHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStudentPaymentSummaries: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCohortPaymentReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDashboardStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
