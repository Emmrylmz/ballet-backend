import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import Joi from "joi";
const markAttendanceSchema = Joi.object({
    status: Joi.string()
        .valid("present", "late", "absent", "excused")
        .required(),
    notes: Joi.string().max(1000).optional(),
});
const updateAttendanceSchema = Joi.object({
    status: Joi.string()
        .valid("present", "late", "absent", "excused")
        .optional(),
    notes: Joi.string().max(1000).optional(),
});
const bulkAttendanceSchema = Joi.object({
    attendanceRecords: Joi.array()
        .items(Joi.object({
        studentId: Joi.string().uuid().required(),
        status: Joi.string()
            .valid("present", "late", "absent", "excused")
            .required(),
        notes: Joi.string().max(500).optional(),
    }))
        .min(1)
        .max(50)
        .required(),
});
const attendanceFiltersSchema = Joi.object({
    sessionId: Joi.string().uuid().optional(),
    studentId: Joi.string().uuid().optional(),
    instructorId: Joi.string().uuid().optional(),
    cohortId: Joi.string().uuid().optional(),
    status: Joi.string()
        .valid("present", "late", "absent", "excused")
        .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
    offset: Joi.number().integer().min(0).default(0).optional(),
});
const attendanceRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        success: false,
        message: "Too many attendance operations, please try again later",
        code: "ATTENDANCE_RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const bulkOperationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        message: "Too many bulk operations, please try again later",
        code: "BULK_RATE_LIMIT_EXCEEDED",
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
const createAttendanceRoutes = (db, logger, tokenService, authRepository, passwordService, cookieService) => {
    return (controller) => {
        const router = Router();
        const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
        const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
        router.use(generalRateLimit);
        router.use(authMiddleware.authenticate());
        router.use(establishmentMiddleware.extractEstablishment());
        router.get("/sessions/:sessionId/roster", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getSessionRoster.bind(controller));
        router.post("/sessions/:sessionId/student/:studentId", attendanceRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(markAttendanceSchema), controller.markAttendance.bind(controller));
        router.put("/sessions/:sessionId/bulk", bulkOperationRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(bulkAttendanceSchema), controller.bulkMarkAttendance.bind(controller));
        router.put("/:attendanceId", attendanceRateLimit, authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(updateAttendanceSchema), controller.updateAttendance.bind(controller));
        router.get("/sessions/:sessionId", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getAttendanceRecords.bind(controller));
        router.get("/records", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validateQuery(attendanceFiltersSchema), controller.getAttendanceRecords.bind(controller));
        router.get("/students/:studentId/history", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getStudentAttendanceHistory.bind(controller));
        router.get("/sessions/:sessionId/stats", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getSessionAttendanceStats.bind(controller));
        router.get("/trends", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getAttendanceTrends.bind(controller));
        router.use((error, req, res, next) => {
            logger.error("Attendance route error", {
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
        return router;
    };
};
export default createAttendanceRoutes;
