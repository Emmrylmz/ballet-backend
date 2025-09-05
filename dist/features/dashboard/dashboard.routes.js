import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardRepository } from './dashboard.repository.js';
import { ValidationMiddleware } from '../../middleware/ValidationMiddleware.js';
import Joi from 'joi';
const activitiesQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    type: Joi.string().valid('payment', 'registration', 'attendance', 'class', 'enrollment').optional(),
    priority: Joi.string().valid('high', 'medium', 'low').optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
});
const createDashboardRoutes = (db, logger) => {
    const router = Router();
    const repository = new DashboardRepository(db);
    const service = new DashboardService(repository, logger);
    const controller = new DashboardController(service, logger);
    router.get('/stats', controller.getStats.bind(controller));
    router.get('/activities', ValidationMiddleware.validateQuery(activitiesQuerySchema), controller.getRecentActivities.bind(controller));
    router.get('/weekly-summary', controller.getWeeklySummary.bind(controller));
    router.get('/todays-classes', controller.getTodaysClasses.bind(controller));
    router.get('/overview', controller.getDashboardOverview.bind(controller));
    router.get('/health', controller.getHealth.bind(controller));
    return router;
};
export default createDashboardRoutes;
