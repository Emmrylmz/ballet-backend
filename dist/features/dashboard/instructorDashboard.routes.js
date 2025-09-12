import { Router } from "express";
import { InstructorDashboardController } from "./instructorDashboard.controller.js";
import { InstructorDashboardService } from "./instructorDashboard.service.js";
import { InstructorDashboardRepository } from "./instructorDashboard.repository.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import Joi from "joi";
const activitiesQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    type: Joi.string()
        .valid("payment", "registration", "attendance", "class", "enrollment")
        .optional(),
    priority: Joi.string().valid("high", "medium", "low").optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
});
const createInstructorDashboardRoutes = (db, logger, tokenService, authRepository, cookieService) => {
    const router = Router();
    const repository = new InstructorDashboardRepository(db);
    const service = new InstructorDashboardService(repository, logger);
    const controller = new InstructorDashboardController(service, logger);
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
    router.use(authMiddleware.authenticate());
    router.use(establishmentMiddleware.extractEstablishment());
    router.use(establishmentMiddleware.validateEstablishmentAccess());
    router.get("/stats", controller.getStats.bind(controller));
    router.get("/activities", ValidationMiddleware.validateQuery(activitiesQuerySchema), authMiddleware.requireEstablishmentAccess(["instructor", "manager"]), controller.getRecentActivities.bind(controller));
    router.get("/weekly-summary", controller.getWeeklySummary.bind(controller));
    router.get("/todays-classes", controller.getTodaysClasses.bind(controller));
    router.get("/overview", controller.getDashboardOverview.bind(controller));
    router.get("/health", controller.getHealth.bind(controller));
    return router;
};
export default createInstructorDashboardRoutes;
