import { Router } from "express";
import rateLimit from "express-rate-limit";
import { InvitationController } from "./invitation.controller.js";
import { InvitationService } from "./invitation.service.js";
import { InvitationRepository } from "./invitation.repository.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import Joi from "joi";
const createStudentInvitationSchema = Joi.object({
    sessionId: Joi.string().uuid().optional(),
    message: Joi.string().max(500).optional(),
    expiryHours: Joi.number().min(0.1).max(24).optional(),
    usageLimit: Joi.number().integer().min(1).max(50).optional(),
});
const inviteInstructorSchema = Joi.object({
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    message: Joi.string().max(500).optional(),
    expiryHours: Joi.number().min(0.1).max(24).optional().default(24),
});
const updateSettingsSchema = Joi.object({
    studentInvitationMaxHours: Joi.number().integer().min(1).max(24).optional(),
    instructorInvitationEnabled: Joi.boolean().optional(),
    studentInvitationEnabled: Joi.boolean().optional(),
    requireApprovalForInstructors: Joi.boolean().optional(),
    defaultExpiryHours: Joi.number().integer().min(1).max(24).optional(),
    studentInvitationDefaultUsageLimit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .optional(),
});
const publicRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const invitationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: "Too many invitations sent, please try again later",
        code: "INVITATION_RATE_LIMIT_EXCEEDED",
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});
const acceptInvitationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: "Too many invitation acceptance attempts, please try again later",
        code: "ACCEPTANCE_RATE_LIMIT_EXCEEDED",
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});
const createInvitationRoutes = (db, logger, tokenService, authRepository) => {
    const router = Router();
    const invitationRepository = new InvitationRepository(db);
    const invitationService = new InvitationService(invitationRepository, authRepository, logger);
    const controller = new InvitationController(invitationService, logger);
    const authMiddleware = new AuthMiddleware(tokenService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
    router.get("/validate/:token", publicRateLimit, authMiddleware.optional(), controller.validateInvitation.bind(controller));
    router.post("/accept/:token", authMiddleware.authenticate(), acceptInvitationRateLimit, controller.acceptInvitation.bind(controller));
    router.use(authMiddleware.authenticate());
    router.use(establishmentMiddleware.extractEstablishment());
    router.use(establishmentMiddleware.validateEstablishmentAccess());
    router.post("/create-student-invitation", invitationRateLimit, ValidationMiddleware.validateBody(createStudentInvitationSchema), controller.createStudentInvitation.bind(controller));
    router.post("/invite-instructor", invitationRateLimit, authMiddleware.requireEstablishmentAccess(["manager"]), ValidationMiddleware.validateBody(inviteInstructorSchema), controller.inviteInstructor.bind(controller));
    router.get("/", authMiddleware.requireEstablishmentAccess(["instructor", "manager"]), controller.getInvitations.bind(controller));
    router.get("/:invitationId/usage", controller.getInvitationUsage.bind(controller));
    router.post("/:invitationId/revoke", authMiddleware.requireEstablishmentAccess(["instructor", "manager"]), controller.revokeInvitation.bind(controller));
    router.get("/settings", controller.getInvitationSettings.bind(controller));
    router.put("/settings", ValidationMiddleware.validateBody(updateSettingsSchema), controller.updateInvitationSettings.bind(controller));
    router.get("/stats", controller.getInvitationStats.bind(controller));
    return router;
};
export default createInvitationRoutes;
