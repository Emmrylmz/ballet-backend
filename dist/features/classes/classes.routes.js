import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ClassesController } from "./classes.controller.js";
import { ClassesService } from "./classes.service.js";
import { ClassesRepository } from "./classes.repository.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import Joi from "joi";
const createClassTemplateSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    classType: Joi.string()
        .valid("ballet", "pilates", "barre", "yoga", "contemporary", "jazz", "modern")
        .required(),
    skillLevel: Joi.string()
        .valid("beginner", "intermediate", "advanced", "all_levels")
        .required(),
    instructorId: Joi.string().uuid().optional(),
    capacity: Joi.number().integer().min(1).max(50).required(),
    durationMinutes: Joi.number().integer().min(15).max(180).required(),
    price: Joi.number().min(0).required(),
    description: Joi.string().max(1000).optional(),
});
const updateClassTemplateSchema = Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    classType: Joi.string()
        .valid("ballet", "pilates", "barre", "yoga", "contemporary", "jazz", "modern")
        .optional(),
    skillLevel: Joi.string()
        .valid("beginner", "intermediate", "advanced", "all_levels")
        .optional(),
    instructorId: Joi.string().uuid().allow(null).optional(),
    capacity: Joi.number().integer().min(1).max(50).optional(),
    durationMinutes: Joi.number().integer().min(15).max(180).optional(),
    price: Joi.number().min(0).optional(),
    description: Joi.string().max(1000).allow(null).optional(),
    isActive: Joi.boolean().optional(),
});
const createClassSessionSchema = Joi.object({
    sessionDate: Joi.date().iso().min("now").required(),
    cohortId: Joi.string().uuid().required(),
    startTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required(),
    endTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
    override_instructor_id: Joi.string().uuid().allow(null).optional(),
    notes: Joi.string().max(500).optional(),
});
const updateClassSessionSchema = Joi.object({
    instructorId: Joi.string().uuid().allow(null).optional(),
    sessionDate: Joi.date().iso().optional(),
    startTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
    endTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
    capacity: Joi.number().integer().min(1).max(50).optional(),
    status: Joi.string()
        .valid("scheduled", "in_progress", "completed", "cancelled")
        .optional(),
    notes: Joi.string().max(500).allow(null).optional(),
});
const generateSessionsSchema = Joi.object({
    startDate: Joi.date().iso().min("now").required(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).required(),
    daysOfWeek: Joi.array()
        .items(Joi.number().integer().min(0).max(6))
        .min(1)
        .required(),
    startTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required(),
    endTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
    instructorId: Joi.string().uuid().optional(),
    capacity: Joi.number().integer().min(1).max(50).optional(),
});
const enrollStudentsSchema = Joi.object({
    studentIds: Joi.array().items(Joi.string().uuid()).min(1).max(10).required(),
    usePackageCredits: Joi.boolean().optional(),
    notifyStudent: Joi.boolean().optional(),
});
const classCreationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        message: "Too many class operations, please try again later",
        code: "CLASS_RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const enrollmentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Too many enrollment operations, please try again later",
        code: "ENROLLMENT_RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const createClassesRoutes = (db, logger, tokenService, authRepository, passwordService, cookieService) => {
    const router = Router();
    const classesRepository = new ClassesRepository(db);
    const classesService = new ClassesService(classesRepository, logger);
    const controller = new ClassesController(classesService, logger);
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
    router.use(generalRateLimit);
    router.use(authMiddleware.authenticate());
    router.use(establishmentMiddleware.extractEstablishment());
    router.get("/templates", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getTemplates);
    router.get("/templates/:id", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getTemplate);
    router.post("/templates", classCreationRateLimit, authMiddleware.requireEstablishmentAccess(["manager"]), ValidationMiddleware.validate(createClassTemplateSchema), controller.createTemplate);
    router.put("/templates/:id", classCreationRateLimit, authMiddleware.requireEstablishmentAccess(["manager"]), ValidationMiddleware.validate(updateClassTemplateSchema), controller.updateTemplate);
    router.delete("/templates/:id", authMiddleware.requireEstablishmentAccess(["manager"]), controller.deleteTemplate);
    router.post("/templates/:id/generate-sessions", classCreationRateLimit, authMiddleware.requireEstablishmentAccess(["manager"]), ValidationMiddleware.validate(generateSessionsSchema), controller.generateSessions);
    router.get("/sessions", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getSessions);
    router.get("/sessions/upcoming", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getUpcomingSessions);
    router.get("/sessions/:id", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getSession);
    router.post("/sessions", classCreationRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(createClassSessionSchema), controller.createSession);
    router.put("/sessions/:id", classCreationRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(updateClassSessionSchema), controller.updateSession);
    router.post("/sessions/:id/cancel", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.cancelSession);
    router.get("/sessions/:id/enrollments", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getSessionEnrollments);
    router.post("/sessions/:id/enroll", enrollmentRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(enrollStudentsSchema), controller.enrollStudents);
    router.delete("/sessions/:id/enroll/:studentId", enrollmentRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.removeStudent);
    router.get("/students/:studentId/enrolled-sessions", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getStudentEnrolledSessions);
    router.get("/stats", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getStats);
    router.get("/calendar", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getCalendarEvents);
    router.use((error, req, res, next) => {
        logger.error("Classes route error", {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            body: req.body,
            params: req.params,
            query: req.query,
        });
        res.status(500).json({
            success: false,
            message: "Internal server error",
            code: "INTERNAL_ERROR",
        });
    });
    router.get("/dropdown-data", controller.getDropdownData.bind(controller));
    return router;
};
export default createClassesRoutes;
