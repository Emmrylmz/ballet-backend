import { AUTH_ERRORS } from "../../constants/errorMessages.js";
export class InstructorDashboardController {
    service;
    logger;
    constructor(service, logger) {
        this.service = service;
        this.logger = logger;
    }
    validateInstructorAccess(req, res) {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
                code: "AUTH_REQUIRED"
            });
            return false;
        }
        if (!req.establishment) {
            res.status(400).json({
                success: false,
                message: AUTH_ERRORS.ESTABLISHMENT_ACCESS_REQUIRED,
                code: "ESTABLISHMENT_REQUIRED"
            });
            return false;
        }
        if (req.user.role !== 'instructor') {
            res.status(403).json({
                success: false,
                message: "Eğitmen rolü gerekli",
                code: "INSTRUCTOR_ROLE_REQUIRED"
            });
            return false;
        }
        return true;
    }
    async getStats(req, res, next) {
        try {
            if (!this.validateInstructorAccess(req, res))
                return;
            const stats = await this.service.getStatsForEstablishment(req.establishment.id, req.user.id);
            res.status(200).json({
                success: true,
                data: stats,
                meta: {
                    establishmentId: req.establishment.id,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error("Dashboard stats controller error", { error });
            next(error);
        }
    }
    async getRecentActivities(req, res, next) {
        try {
            if (!this.validateInstructorAccess(req, res))
                return;
            const filters = {};
            if (req.query.limit) {
                filters.limit = parseInt(req.query.limit, 10);
            }
            if (req.query.type && typeof req.query.type === "string") {
                const validTypes = [
                    "payment",
                    "registration",
                    "attendance",
                    "class",
                    "enrollment",
                ];
                if (validTypes.includes(req.query.type)) {
                    filters.type = req.query.type;
                }
            }
            if (req.query.priority && typeof req.query.priority === "string") {
                const validPriorities = ["high", "medium", "low"];
                if (validPriorities.includes(req.query.priority)) {
                    filters.priority = req.query.priority;
                }
            }
            if (req.query.dateFrom) {
                filters.dateFrom = req.query.dateFrom;
            }
            if (req.query.dateTo) {
                filters.dateTo = req.query.dateTo;
            }
            const activities = await this.service.getRecentActivitiesForEstablishment(req.establishment.id, filters, req.user.id);
            res.status(200).json({
                success: true,
                data: activities,
                meta: {
                    establishmentId: req.establishment.id,
                    count: activities.length,
                    filters: filters,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error("Dashboard activities controller error", { error });
            next(error);
        }
    }
    async getWeeklySummary(req, res, next) {
        try {
            if (!this.validateInstructorAccess(req, res))
                return;
            const summary = await this.service.getWeeklySummaryForEstablishment(req.establishment.id, req.user.id);
            res.status(200).json({
                success: true,
                data: summary,
                meta: {
                    establishmentId: req.establishment.id,
                    weekStart: new Date().toISOString().split("T")[0],
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error("Dashboard weekly summary controller error", { error });
            next(error);
        }
    }
    async getTodaysClasses(req, res, next) {
        try {
            if (!this.validateInstructorAccess(req, res))
                return;
            const classes = await this.service.getTodaysClassesForEstablishment(req.establishment.id, req.user.id);
            res.status(200).json({
                success: true,
                data: classes,
                meta: {
                    establishmentId: req.establishment.id,
                    date: new Date().toISOString().split("T")[0],
                    count: classes.length,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error("Dashboard today's classes controller error", {
                error,
            });
            next(error);
        }
    }
    async getDashboardOverview(req, res, next) {
        try {
            if (!this.validateInstructorAccess(req, res))
                return;
            const dashboardData = await this.service.getDashboardDataForEstablishment(req.establishment.id, req.user.id);
            res.status(200).json({
                success: true,
                data: dashboardData,
                meta: {
                    establishmentId: req.establishment.id,
                    fetchedAt: new Date().toISOString(),
                    hasErrors: dashboardData.errors.length > 0,
                    errorCount: dashboardData.errors.length,
                },
            });
        }
        catch (error) {
            this.logger.error("Dashboard overview controller error", { error });
            next(error);
        }
    }
    async getHealth(req, res, next) {
        try {
            const startTime = Date.now();
            const responseTime = Date.now() - startTime;
            res.status(200).json({
                success: true,
                data: {
                    status: "sağlıklı",
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString(),
                    service: "gösterge paneli",
                },
            });
        }
        catch (error) {
            this.logger.error("Dashboard health check failed", { error });
            res.status(503).json({
                success: false,
                data: {
                    status: "sağlıksız",
                    error: "Gösterge paneli servisleri kullanılamıyor",
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
}
