export class DashboardController {
    service;
    logger;
    constructor(service, logger) {
        this.service = service;
        this.logger = logger;
    }
    async getStats(req, res, next) {
        try {
            const establishmentId = req.query.establishmentId || req.user?.establishmentId;
            const userId = req.user?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                });
                return;
            }
            const stats = await this.service.getStatsForEstablishment(establishmentId, userId);
            res.status(200).json({
                success: true,
                data: stats,
                meta: {
                    establishmentId,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error('Dashboard stats controller error', { error });
            next(error);
        }
    }
    async getRecentActivities(req, res, next) {
        try {
            const establishmentId = req.query.establishmentId || req.user?.establishmentId;
            const userId = req.user?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                });
                return;
            }
            const filters = {};
            if (req.query.limit) {
                filters.limit = parseInt(req.query.limit, 10);
            }
            if (req.query.type && typeof req.query.type === 'string') {
                const validTypes = ['payment', 'registration', 'attendance', 'class', 'enrollment'];
                if (validTypes.includes(req.query.type)) {
                    filters.type = req.query.type;
                }
            }
            if (req.query.priority && typeof req.query.priority === 'string') {
                const validPriorities = ['high', 'medium', 'low'];
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
            const activities = await this.service.getRecentActivitiesForEstablishment(establishmentId, filters, userId);
            res.status(200).json({
                success: true,
                data: activities,
                meta: {
                    establishmentId,
                    count: activities.length,
                    filters: filters,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error('Dashboard activities controller error', { error });
            next(error);
        }
    }
    async getWeeklySummary(req, res, next) {
        try {
            const establishmentId = req.query.establishmentId || req.user?.establishmentId;
            const userId = req.user?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                });
                return;
            }
            const summary = await this.service.getWeeklySummaryForEstablishment(establishmentId, userId);
            res.status(200).json({
                success: true,
                data: summary,
                meta: {
                    establishmentId,
                    weekStart: new Date().toISOString().split('T')[0],
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error('Dashboard weekly summary controller error', { error });
            next(error);
        }
    }
    async getTodaysClasses(req, res, next) {
        try {
            const establishmentId = req.query.establishmentId || req.user?.establishmentId;
            const userId = req.user?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                });
                return;
            }
            const classes = await this.service.getTodaysClassesForEstablishment(establishmentId, userId);
            res.status(200).json({
                success: true,
                data: classes,
                meta: {
                    establishmentId,
                    date: new Date().toISOString().split('T')[0],
                    count: classes.length,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error('Dashboard today\'s classes controller error', { error });
            next(error);
        }
    }
    async getDashboardOverview(req, res, next) {
        try {
            const establishmentId = req.query.establishmentId || req.user?.establishmentId;
            const userId = req.user?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment ID is required',
                });
                return;
            }
            const dashboardData = await this.service.getDashboardDataForEstablishment(establishmentId, userId);
            res.status(200).json({
                success: true,
                data: dashboardData,
                meta: {
                    establishmentId,
                    fetchedAt: new Date().toISOString(),
                    hasErrors: dashboardData.errors.length > 0,
                    errorCount: dashboardData.errors.length,
                },
            });
        }
        catch (error) {
            this.logger.error('Dashboard overview controller error', { error });
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
                    status: 'healthy',
                    responseTime: `${responseTime}ms`,
                    timestamp: new Date().toISOString(),
                    service: 'dashboard',
                },
            });
        }
        catch (error) {
            this.logger.error('Dashboard health check failed', { error });
            res.status(503).json({
                success: false,
                data: {
                    status: 'unhealthy',
                    error: 'Dashboard services unavailable',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
}
