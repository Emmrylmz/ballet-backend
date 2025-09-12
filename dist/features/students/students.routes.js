import { Router } from "express";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import { StudentsController } from "./students.controller.js";
import { StudentsService } from "./students.service.js";
import { StudentsRepository } from "./students.repository.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
const createStudentSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().min(10).max(20).required(),
    emergencyContact: Joi.string().min(10).max(20).required(),
    emergencyContactName: Joi.string().max(255).optional(),
    parentName: Joi.string().max(255).optional(),
    parentPhone: Joi.string().min(10).max(20).optional(),
    parentEmail: Joi.string().email().max(255).optional(),
    birthDate: Joi.date().iso().optional(),
    medicalNotes: Joi.string().max(1000).optional(),
});
const updateStudentSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().max(255).allow(null).optional(),
    phone: Joi.string().min(10).max(20).optional(),
    emergencyContact: Joi.string().min(10).max(20).optional(),
    emergencyContactName: Joi.string().max(255).allow(null).optional(),
    parentName: Joi.string().max(255).allow(null).optional(),
    parentPhone: Joi.string().min(10).max(20).allow(null).optional(),
    parentEmail: Joi.string().email().max(255).allow(null).optional(),
    birthDate: Joi.date().iso().allow(null).optional(),
    medicalNotes: Joi.string().max(1000).allow(null).optional(),
    isActive: Joi.boolean().optional(),
});
const searchStudentsSchema = Joi.object({
    q: Joi.string().max(100).optional(),
    status: Joi.string().valid("active", "inactive", "all").default("active"),
    cohortId: Joi.string().uuid().optional(),
    available: Joi.boolean().optional(),
    ageMin: Joi.number().integer().min(0).max(150).optional(),
    ageMax: Joi.number().integer().min(0).max(150).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
});
const studentsRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
    },
});
const createStudentsRoutes = (db, logger, tokenService, authRepository, passwordService, cookieService) => {
    const router = Router();
    const repository = new StudentsRepository(db);
    const service = new StudentsService(repository, logger);
    const controller = new StudentsController(service, logger);
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
    router.use(studentsRateLimit);
    router.get("/search", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validateQuery(searchStudentsSchema), controller.searchStudents);
    router.get("/stats", authMiddleware.requireEstablishmentAccess(["manager"]), controller.getStudentsStats);
    router.get("/:id", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getStudentProfile);
    router.post("/", authMiddleware.requireEstablishmentAccess(["manager"]), ValidationMiddleware.validate(createStudentSchema), controller.createStudent);
    router.put("/:id", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), ValidationMiddleware.validate(updateStudentSchema), controller.updateStudent);
    router.delete("/:id", authMiddleware.requireEstablishmentAccess(["manager"]), controller.deactivateStudent);
    router.get("/sessions/:sessionId/roster", authMiddleware.requireEstablishmentAccess(["manager", "instructor"]), controller.getSessionRoster);
    return router;
};
export default createStudentsRoutes;
