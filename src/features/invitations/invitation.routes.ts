import { Router } from "express";
import rateLimit from "express-rate-limit";
import { InvitationController } from "./invitation.controller.js";
import { InvitationService } from "./invitation.service.js";
import { InvitationRepository } from "./invitation.repository.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { TokenService } from "../auth/services/TokenService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import Joi from "joi";

// Validation schemas
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

// Rate limiting for public endpoints
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per window for validation
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for invitation creation
const invitationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 invitations per hour per user
  message: {
    success: false,
    message: "Too many invitations sent, please try again later",
    code: "INVITATION_RATE_LIMIT_EXCEEDED",
  },
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for accepting invitations
const acceptInvitationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per user/ip
  message: {
    success: false,
    message: "Too many invitation acceptance attempts, please try again later",
    code: "ACCEPTANCE_RATE_LIMIT_EXCEEDED",
  },
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

const createInvitationRoutes = (
  db: DatabaseService,
  logger: LoggerService,
  tokenService: TokenService,
  authRepository: AuthRepository
): Router => {
  const router = Router();

  // Initialize components
  const invitationRepository = new InvitationRepository(db);
  const invitationService = new InvitationService(
    invitationRepository,
    authRepository,
    logger
  );
  const controller = new InvitationController(invitationService, logger);

  // Initialize middleware
  const authMiddleware = new AuthMiddleware(
    tokenService,
    authRepository,
    logger
  );
  const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

  // Public routes (no authentication required)

  /**
   * @swagger
   * /invitations/validate/{token}:
   *   get:
   *     tags: [Invitations]
   *     summary: Validate invitation token
   *     description: Check if an invitation token is valid and get invitation details (public endpoint)
   *     parameters:
   *       - in: path
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *         description: Invitation token
   *     responses:
   *       200:
   *         description: Valid invitation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     establishmentName:
   *                       type: string
   *                     sessionName:
   *                       type: string
   *                     type:
   *                       type: string
   *                       enum: [instructor, student]
   *                     message:
   *                       type: string
   *                     expiresAt:
   *                       type: string
   *                       format: date-time
   *                     usageLimit:
   *                       type: integer
   *                     usageCount:
   *                       type: integer
   *                     warningMessage:
   *                       type: string
   *                       description: Warning if user is already in establishment
   *       400:
   *         description: Invalid or expired invitation
   */
  router.get(
    "/validate/:token",
    publicRateLimit,
    authMiddleware.optional(), // Optional auth to check if user is already member
    controller.validateInvitation.bind(controller)
  );

  /**
   * @swagger
   * /invitations/accept/{token}:
   *   post:
   *     tags: [Invitations]
   *     summary: Accept invitation and join establishment
   *     description: Accept an invitation and add current user to the establishment (requires authentication but no establishment context)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *         description: Invitation token
   *     responses:
   *       200:
   *         description: Successfully joined establishment
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Successfully joined the establishment as student!"
   *                 warning:
   *                   type: string
   *                   example: "You were already a member of this establishment."
   *       400:
   *         description: Invalid invitation
   *       401:
   *         description: Authentication required
   */
  router.post(
    "/accept/:token",
    authMiddleware.authenticate(), // Only require auth, not establishment context
    acceptInvitationRateLimit,
    controller.acceptInvitation.bind(controller)
  );

  // Protected routes (require authentication and establishment context)
  router.use(authMiddleware.authenticate());
  router.use(establishmentMiddleware.extractEstablishment());
  router.use(establishmentMiddleware.validateEstablishmentAccess());

  /**
   * @swagger
   * /invitations/create-student-invitation:
   *   post:
   *     tags: [Invitations]
   *     summary: Create generic student invitation
   *     description: Create a generic invitation link for students (no email required)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment ID (optional if user has default)
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sessionId:
   *                 type: string
   *                 format: uuid
   *                 description: Specific class session to enroll student in
   *               message:
   *                 type: string
   *                 maxLength: 500
   *                 description: Welcome message for students
   *               expiryHours:
   *                 type: number
   *                 minimum: 0.1
   *                 maximum: 24
   *                 description: Hours until invitation expires (max 24)
   *               usageLimit:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *                 description: Maximum number of students who can use this link
   *     responses:
   *       201:
   *         description: Student invitation created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     invitationUrl:
   *                       type: string
   *                     usageLimit:
   *                       type: integer
   *                     expiresAt:
   *                       type: string
   *                       format: date-time
   *       403:
   *         description: Only instructors and managers can create student invitations
   */
  router.post(
    "/create-student-invitation",
    invitationRateLimit,
    ValidationMiddleware.validateBody(createStudentInvitationSchema),
    controller.createStudentInvitation.bind(controller)
  );

  /**
   * @swagger
   * /invitations/invite-instructor:
   *   post:
   *     tags: [Invitations]
   *     summary: Invite instructor (manager only)
   *     description: Create instructor invitation with email and phone number - only managers can use this endpoint
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment ID (optional if user has default)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - phoneNumber
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Email address of instructor to invite
   *               phoneNumber:
   *                 type: string
   *                 description: Phone number of instructor to invite
   *               message:
   *                 type: string
   *                 maxLength: 500
   *                 description: Welcome message for instructor
   *               expiryHours:
   *                 type: number
   *                 minimum: 0.1
   *                 maximum: 24
   *                 default: 24
   *                 description: Hours until invitation expires (max 24)
   *     responses:
   *       201:
   *         description: Instructor invitation created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     invitationUrl:
   *                       type: string
   *                     expiresAt:
   *                       type: string
   *                       format: date-time
   *                     type:
   *                       type: string
   *                       example: instructor
   *                     usageLimit:
   *                       type: integer
   *                       example: 1
   *                 message:
   *                   type: string
   *                   example: "Instructor invitation created successfully"
   *       400:
   *         description: Invalid input data or invitations disabled
   *       403:
   *         description: Only managers can invite instructors
   *       409:
   *         description: User already exists in establishment or active invitation already exists
   */
  router.post(
    "/invite-instructor",
    invitationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validateBody(inviteInstructorSchema),
    controller.inviteInstructor.bind(controller)
  );

  /**
   * @swagger
   * /invitations:
   *   get:
   *     tags: [Invitations]
   *     summary: Get invitations
   *     description: Get list of invitations for the establishment (managers only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [instructor, student]
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, expired, revoked, used_up]
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *     responses:
   *       200:
   *         description: List of invitations
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/",
    authMiddleware.requireEstablishmentAccess(["instructor", "manager"]),
    controller.getInvitations.bind(controller)
  );

  /**
   * @swagger
   * /invitations/{invitationId}/usage:
   *   get:
   *     tags: [Invitations]
   *     summary: Get invitation usage
   *     description: Get usage history for a specific invitation (managers only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invitationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Invitation usage history
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/:invitationId/usage",
    controller.getInvitationUsage.bind(controller)
  );

  /**
   * @swagger
   * /invitations/{invitationId}/revoke:
   *   post:
   *     tags: [Invitations]
   *     summary: Revoke invitation
   *     description: Revoke an active invitation (instructors can revoke student invitations, only managers can revoke instructor invitations)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invitationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Invitation revoked successfully
   *       403:
   *         description: Insufficient permissions (only managers can revoke instructor invitations)
   *       404:
   *         description: Invitation not found
   */
  router.post(
    "/:invitationId/revoke",
    authMiddleware.requireEstablishmentAccess(["instructor", "manager"]),
    controller.revokeInvitation.bind(controller)
  );

  /**
   * @swagger
   * /invitations/settings:
   *   get:
   *     tags: [Invitations]
   *     summary: Get invitation settings
   *     description: Get invitation settings for the establishment (managers only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Invitation settings
   *       403:
   *         description: Insufficient permissions
   *   put:
   *     tags: [Invitations]
   *     summary: Update invitation settings
   *     description: Update invitation settings for the establishment (managers only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               studentInvitationMaxHours:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 24
   *               instructorInvitationEnabled:
   *                 type: boolean
   *               studentInvitationEnabled:
   *                 type: boolean
   *               requireApprovalForInstructors:
   *                 type: boolean
   *               defaultExpiryHours:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 24
   *               studentInvitationDefaultUsageLimit:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *     responses:
   *       200:
   *         description: Settings updated successfully
   *       403:
   *         description: Insufficient permissions
   */
  router.get("/settings", controller.getInvitationSettings.bind(controller));
  router.put(
    "/settings",
    ValidationMiddleware.validateBody(updateSettingsSchema),
    controller.updateInvitationSettings.bind(controller)
  );

  /**
   * @swagger
   * /invitations/stats:
   *   get:
   *     tags: [Invitations]
   *     summary: Get invitation statistics
   *     description: Get invitation statistics for dashboard (managers only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Invitation statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     student:
   *                       type: object
   *                       properties:
   *                         active:
   *                           type: integer
   *                         expired:
   *                           type: integer
   *                         revoked:
   *                           type: integer
   *                         used_up:
   *                           type: integer
   *                     instructor:
   *                       type: object
   *                       properties:
   *                         active:
   *                           type: integer
   *                         expired:
   *                           type: integer
   *                         revoked:
   *                           type: integer
   *                         used_up:
   *                           type: integer
   *       403:
   *         description: Insufficient permissions
   */
  router.get("/stats", controller.getInvitationStats.bind(controller));

  return router;
};

export default createInvitationRoutes;
