export class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    createPayment = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const userId = req.user?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                    error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
                });
                return;
            }
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'User authentication required',
                    error: { code: 'MISSING_USER_ID', message: 'User ID is required' }
                });
                return;
            }
            const paymentData = req.body;
            const payment = await this.paymentsService.createPayment(establishmentId, paymentData, userId);
            res.status(201).json({
                success: true,
                data: payment,
                message: 'Payment created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPayment = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { paymentId } = req.params;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                    error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
                });
                return;
            }
            const payment = await this.paymentsService.getPaymentById(establishmentId, paymentId);
            res.json({
                success: true,
                data: payment,
                message: 'Payment retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPayments = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                    error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
                });
                return;
            }
            const filters = {
                studentId: req.query.studentId,
                paymentMethod: req.query.paymentMethod,
                paymentType: req.query.paymentType,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
                maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined,
                recordedBy: req.query.recordedBy,
                limit: req.query.limit ? parseInt(req.query.limit) : 50,
                offset: req.query.offset ? parseInt(req.query.offset) : 0
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
            });
        }
        catch (error) {
            next(error);
        }
    };
    updatePayment = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { paymentId } = req.params;
            const userId = req.user?.id;
            if (!establishmentId || !userId) {
                res.status(400).json({ success: false, message: 'Missing required parameters' });
                return;
            }
            const updateData = req.body;
            const payment = await this.paymentsService.updatePayment(establishmentId, paymentId, updateData, userId);
            res.json({
                success: true,
                data: payment,
                message: 'Payment updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    refundPayment = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { paymentId } = req.params;
            const userId = req.user?.id;
            if (!establishmentId || !userId) {
                res.status(400).json({ success: false, message: 'Missing required parameters' });
                return;
            }
            const refundData = req.body;
            const payment = await this.paymentsService.refundPayment(establishmentId, paymentId, refundData, userId);
            res.json({
                success: true,
                data: payment,
                message: 'Payment refunded successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    deletePayment = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { paymentId } = req.params;
            const userId = req.user?.id;
            if (!establishmentId || !userId) {
                res.status(400).json({ success: false, message: 'Missing required parameters' });
                return;
            }
            await this.paymentsService.deletePayment(establishmentId, paymentId, userId);
            res.json({
                success: true,
                message: 'Payment deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    createPaymentPlan = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const userId = req.user?.id;
            if (!establishmentId || !userId) {
                res.status(400).json({ success: false, message: 'Missing required parameters' });
                return;
            }
            const planData = req.body;
            const plan = await this.paymentsService.createPaymentPlan(establishmentId, planData, userId);
            res.status(201).json({
                success: true,
                data: plan,
                message: 'Payment plan created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentPlan = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { planId } = req.params;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                    error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
                });
                return;
            }
            const plan = await this.paymentsService.getPaymentPlanById(establishmentId, planId);
            res.json({
                success: true,
                data: plan,
                message: 'Payment plan retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentPlans = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                    error: { code: 'MISSING_ESTABLISHMENT_ID', message: 'Establishment ID header is required' }
                });
                return;
            }
            const filters = {
                planType: req.query.planType,
                recurrenceType: req.query.recurrenceType,
                isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                createdBy: req.query.createdBy,
                limit: req.query.limit ? parseInt(req.query.limit) : 50,
                offset: req.query.offset ? parseInt(req.query.offset) : 0
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
            });
        }
        catch (error) {
            next(error);
        }
    };
    assignPaymentPlan = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const userId = req.user?.id;
            if (!establishmentId || !userId) {
                res.status(400).json({ success: false, message: 'Missing required parameters' });
                return;
            }
            const assignmentData = req.body;
            const assignment = await this.paymentsService.assignPaymentPlan(establishmentId, assignmentData, userId);
            res.status(201).json({
                success: true,
                data: assignment,
                message: 'Payment plan assigned successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPlanAssignments = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
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
            });
        }
        catch (error) {
            next(error);
        }
    };
    processBulkPayments = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const userId = req.user?.id;
            if (!establishmentId || !userId) {
                res.status(400).json({ success: false, message: 'Missing required parameters' });
                return;
            }
            const bulkRequest = req.body;
            const result = await this.paymentsService.processBulkPayments(establishmentId, bulkRequest, userId);
            res.json({
                success: true,
                data: result,
                message: `Bulk payment processed: ${result.successful.length} successful, ${result.failed.length} failed`
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentSummary = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            if (!establishmentId) {
                res.status(400).json({ success: false, message: 'Establishment ID is required' });
                return;
            }
            const summary = await this.paymentsService.getPaymentSummary(establishmentId, startDate, endDate);
            res.json({
                success: true,
                data: summary,
                message: 'Payment summary retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getStudentPaymentHistory = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { studentId } = req.params;
            if (!establishmentId) {
                res.status(400).json({ success: false, message: 'Establishment ID is required' });
                return;
            }
            const history = await this.paymentsService.getStudentPaymentHistory(establishmentId, studentId);
            res.json({
                success: true,
                data: history,
                message: 'Student payment history retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
    getStudentPaymentSummaries = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const status = req.query.status;
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
        }
        catch (error) {
            next(error);
        }
    };
    getCohortPaymentReport = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const { cohortId } = req.params;
            res.status(501).json({
                success: false,
                message: 'Cohort payment report not yet implemented',
                error: { code: 'NOT_IMPLEMENTED', message: 'Feature not yet implemented' }
            });
        }
        catch (error) {
            next(error);
        }
    };
    getDashboardStats = async (req, res, next) => {
        try {
            const establishmentId = req.headers['x-establishment-id'];
            const period = req.query.period || 'month';
            if (!establishmentId) {
                res.status(400).json({ success: false, message: 'Establishment ID is required' });
                return;
            }
            let startDate;
            let endDate;
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
            const summary = await this.paymentsService.getPaymentSummary(establishmentId, startDate, endDate);
            res.json({
                success: true,
                data: {
                    period,
                    startDate,
                    endDate,
                    ...summary
                },
                message: 'Dashboard stats retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    };
}
