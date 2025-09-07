import { DASHBOARD_ERRORS, VALIDATION_ERRORS } from '../../constants/errorMessages.js';
export class InstructorDashboardService {
    repository;
    logger;
    constructor(repository, logger) {
        this.repository = repository;
        this.logger = logger;
    }
    async getStatsForEstablishment(establishmentId, userId) {
        try {
            this.logger.info('Fetching dashboard statistics for establishment', {
                establishmentId,
                userId
            });
            if (!userId) {
                throw new Error(VALIDATION_ERRORS.MISSING_PARAMETER.replace('{parameter}', 'Kullanıcı ID'));
            }
            const stats = await this.repository.getStatsForEstablishment(establishmentId, userId);
            this.logger.debug('Dashboard stats retrieved', {
                establishmentId,
                totalStudents: stats.totalStudents,
                monthlyRevenue: stats.monthlyRevenue,
                todaysClasses: stats.todaysClasses,
            });
            return stats;
        }
        catch (error) {
            this.logger.error('Failed to fetch dashboard statistics', { error, establishmentId });
            throw new Error(DASHBOARD_ERRORS.STATS_NOT_FOUND);
        }
    }
    async getRecentActivitiesForEstablishment(establishmentId, filters = {}, userId) {
        try {
            this.logger.info('Fetching recent activities for establishment', {
                establishmentId,
                filters,
                userId
            });
            if (!userId) {
                throw new Error(VALIDATION_ERRORS.MISSING_PARAMETER.replace('{parameter}', 'Kullanıcı ID'));
            }
            const validatedFilters = this.validateActivityFilters(filters);
            const activities = await this.repository.getRecentActivitiesForEstablishment(establishmentId, userId, validatedFilters);
            this.logger.debug(`Retrieved ${activities.length} recent activities for establishment ${establishmentId}`);
            return activities;
        }
        catch (error) {
            this.logger.error('Failed to fetch recent activities', { error, establishmentId });
            throw new Error(DASHBOARD_ERRORS.DATA_FETCH_FAILED);
        }
    }
    async getWeeklySummaryForEstablishment(establishmentId, userId) {
        try {
            this.logger.info('Fetching weekly summary for establishment', {
                establishmentId,
                userId
            });
            if (!userId) {
                throw new Error(VALIDATION_ERRORS.MISSING_PARAMETER.replace('{parameter}', 'Kullanıcı ID'));
            }
            const summary = await this.repository.getWeeklySummaryForEstablishment(establishmentId, userId);
            const completionRate = summary.totalClasses > 0
                ? Math.round((summary.completedClasses / summary.totalClasses) * 100)
                : 0;
            const targetProgress = summary.incomeTarget > 0
                ? Math.round((summary.income / summary.incomeTarget) * 100)
                : 0;
            this.logger.debug('Weekly summary retrieved', {
                establishmentId,
                totalClasses: summary.totalClasses,
                completionRate,
                targetProgress,
            });
            return {
                ...summary,
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch weekly summary', { error, establishmentId });
            throw new Error(DASHBOARD_ERRORS.DATA_FETCH_FAILED);
        }
    }
    async getTodaysClassesForEstablishment(establishmentId, userId) {
        try {
            this.logger.info('Fetching today\'s classes for establishment', {
                establishmentId,
                userId
            });
            if (!userId) {
                throw new Error(VALIDATION_ERRORS.MISSING_PARAMETER.replace('{parameter}', 'Kullanıcı ID'));
            }
            const classes = await this.repository.getTodaysClassesForEstablishment(establishmentId, userId);
            const sortedClasses = classes.sort((a, b) => a.time.localeCompare(b.time));
            const classesWithUtilization = sortedClasses.map(classItem => ({
                ...classItem,
                utilizationRate: classItem.capacity > 0
                    ? Math.round((classItem.students / classItem.capacity) * 100)
                    : 0,
            }));
            this.logger.debug(`Retrieved ${classes.length} classes for today for establishment ${establishmentId}`);
            return classesWithUtilization;
        }
        catch (error) {
            this.logger.error('Failed to fetch today\'s classes', { error, establishmentId });
            throw new Error(DASHBOARD_ERRORS.DATA_FETCH_FAILED);
        }
    }
    async getDashboardDataForEstablishment(establishmentId, userId) {
        try {
            this.logger.info('Fetching complete dashboard data for establishment', {
                establishmentId,
                userId
            });
            const [stats, activities, weeklySummary, todaysClasses] = await Promise.allSettled([
                this.getStatsForEstablishment(establishmentId, userId),
                this.getRecentActivitiesForEstablishment(establishmentId, { limit: 10 }, userId),
                this.getWeeklySummaryForEstablishment(establishmentId, userId),
                this.getTodaysClassesForEstablishment(establishmentId, userId),
            ]);
            return {
                stats: stats.status === 'fulfilled' ? stats.value : null,
                activities: activities.status === 'fulfilled' ? activities.value : [],
                weeklySummary: weeklySummary.status === 'fulfilled' ? weeklySummary.value : null,
                todaysClasses: todaysClasses.status === 'fulfilled' ? todaysClasses.value : [],
                errors: [
                    ...(stats.status === 'rejected' ? [stats.reason] : []),
                    ...(activities.status === 'rejected' ? [activities.reason] : []),
                    ...(weeklySummary.status === 'rejected' ? [weeklySummary.reason] : []),
                    ...(todaysClasses.status === 'rejected' ? [todaysClasses.reason] : []),
                ],
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch complete dashboard data', { error, establishmentId });
            throw new Error(DASHBOARD_ERRORS.DATA_FETCH_FAILED);
        }
    }
    validateActivityFilters(filters) {
        const validatedFilters = {};
        if (filters.limit !== undefined) {
            validatedFilters.limit = Math.min(Math.max(1, filters.limit), 100);
        }
        const validTypes = ['payment', 'registration', 'attendance', 'class', 'enrollment'];
        if (filters.type && validTypes.includes(filters.type)) {
            validatedFilters.type = filters.type;
        }
        const validPriorities = ['high', 'medium', 'low'];
        if (filters.priority && validPriorities.includes(filters.priority)) {
            validatedFilters.priority = filters.priority;
        }
        if (filters.dateFrom && this.isValidDate(filters.dateFrom)) {
            validatedFilters.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo && this.isValidDate(filters.dateTo)) {
            validatedFilters.dateTo = filters.dateTo;
        }
        if (validatedFilters.dateFrom && validatedFilters.dateTo) {
            const fromDate = new Date(validatedFilters.dateFrom);
            const toDate = new Date(validatedFilters.dateTo);
            if (fromDate > toDate) {
                this.logger.warn('dateFrom is after dateTo, swapping dates', {
                    dateFrom: validatedFilters.dateFrom,
                    dateTo: validatedFilters.dateTo,
                });
                validatedFilters.dateFrom = filters.dateTo;
                validatedFilters.dateTo = filters.dateFrom;
            }
        }
        return validatedFilters;
    }
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }
}
