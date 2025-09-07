import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ClassesController } from "./classes.controller.js";
import { ClassesService } from "./classes.service.js";
import { ClassesRepository } from "./classes.repository.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { TokenService } from "../auth/services/TokenService.js";
import { CookieService } from "../auth/services/CookieService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import Joi from "joi";

// Validation schemas
const createClassTemplateSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  classType: Joi.string().valid('ballet', 'pilates', 'barre', 'yoga', 'contemporary', 'jazz', 'modern').required(),
  skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'all_levels').required(),
  instructorId: Joi.string().uuid().optional(),
  capacity: Joi.number().integer().min(1).max(50).required(),
  durationMinutes: Joi.number().integer().min(15).max(180).required(),
  price: Joi.number().min(0).required(),
  description: Joi.string().max(1000).optional(),
});

const updateClassTemplateSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  classType: Joi.string().valid('ballet', 'pilates', 'barre', 'yoga', 'contemporary', 'jazz', 'modern').optional(),
  skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'all_levels').optional(),
  instructorId: Joi.string().uuid().allow(null).optional(),
  capacity: Joi.number().integer().min(1).max(50).optional(),
  durationMinutes: Joi.number().integer().min(15).max(180).optional(),
  price: Joi.number().min(0).optional(),
  description: Joi.string().max(1000).allow(null).optional(),
  isActive: Joi.boolean().optional(),
});

const createClassSessionSchema = Joi.object({
  classTemplateId: Joi.string().uuid().optional(),
  instructorId: Joi.string().uuid().optional(),
  sessionDate: Joi.date().iso().min('now').required(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  capacity: Joi.number().integer().min(1).max(50).optional(),
  notes: Joi.string().max(500).optional(),
  isRecurring: Joi.boolean().optional(),
  recurrenceFrequency: Joi.string().valid('weekly', 'biweekly', 'monthly', 'daily').optional(),
  recurrenceDaysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  recurrenceEndDate: Joi.date().iso().min(Joi.ref('sessionDate')).optional(),
});

const updateClassSessionSchema = Joi.object({
  instructorId: Joi.string().uuid().allow(null).optional(),
  sessionDate: Joi.date().iso().optional(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  capacity: Joi.number().integer().min(1).max(50).optional(),
  status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled').optional(),
  notes: Joi.string().max(500).allow(null).optional(),
});

const generateSessionsSchema = Joi.object({
  startDate: Joi.date().iso().min('now').required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).required(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  instructorId: Joi.string().uuid().optional(),
  capacity: Joi.number().integer().min(1).max(50).optional(),
});

const enrollStudentsSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string().uuid()).min(1).max(10).required(),
  usePackageCredits: Joi.boolean().optional(),
  notifyStudent: Joi.boolean().optional(),
});

// Rate limiting for class creation
const classCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 class operations per hour per user
  message: {
    success: false,
    message: "Too many class operations, please try again later",
    code: "CLASS_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for enrollment operations
const enrollmentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 enrollment operations per 15 minutes
  message: {
    success: false,
    message: "Too many enrollment operations, please try again later",
    code: "ENROLLMENT_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API operations
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createClassesRoutes = (
  db: DatabaseService,
  logger: LoggerService,
  tokenService: TokenService,
  authRepository: AuthRepository,
  passwordService: any,
  cookieService: CookieService
): Router => {
  const router = Router();

  // Initialize components
  const classesRepository = new ClassesRepository(db);
  const classesService = new ClassesService(classesRepository, logger);
  const controller = new ClassesController(classesService, logger);

  // Initialize middleware
  const authMiddleware = new AuthMiddleware(
    tokenService,
    cookieService,
    authRepository,
    logger
  );
  const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

  // Apply rate limiting to all routes
  router.use(generalRateLimit);

  // Apply authentication to all routes
  router.use(authMiddleware.authenticate());

  // Apply establishment context to all routes
  router.use(establishmentMiddleware.extractEstablishment());

  // CLASS TEMPLATE ROUTES

  /**
   * @swagger
   * /classes/templates:
   *   get:
   *     tags: [Classes - Templates]
   *     summary: Get all class templates
   *     description: Retrieve all class templates with optional filtering
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
   *         name: classType
   *         schema:
   *           type: string
   *           enum: [ballet, pilates, barre, yoga, contemporary, jazz, modern]
   *       - in: query
   *         name: skillLevel
   *         schema:
   *           type: string
   *           enum: [beginner, intermediate, advanced, all_levels]
   *       - in: query
   *         name: instructorId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *     responses:
   *       200:
   *         description: List of class templates
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ClassTemplate'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/templates",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getTemplates
  );

  /**
   * @swagger
   * /classes/templates/{id}:
   *   get:
   *     tags: [Classes - Templates]
   *     summary: Get class template by ID
   *     description: Retrieve a specific class template
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Template ID
   *     responses:
   *       200:
   *         description: Class template details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/ClassTemplate'
   *       404:
   *         description: Template not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/templates/:id",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getTemplate
  );

  /**
   * @swagger
   * /classes/templates:
   *   post:
   *     tags: [Classes - Templates]
   *     summary: Create class template
   *     description: Create a new class template (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - classType
   *               - skillLevel
   *               - capacity
   *               - durationMinutes
   *               - price
   *             properties:
   *               title:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 255
   *                 example: "Beginner Ballet"
   *               classType:
   *                 type: string
   *                 enum: [ballet, pilates, barre, yoga, contemporary, jazz, modern]
   *               skillLevel:
   *                 type: string
   *                 enum: [beginner, intermediate, advanced, all_levels]
   *               instructorId:
   *                 type: string
   *                 format: uuid
   *               capacity:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *                 example: 12
   *               durationMinutes:
   *                 type: integer
   *                 minimum: 15
   *                 maximum: 180
   *                 example: 60
   *               price:
   *                 type: number
   *                 minimum: 0
   *                 example: 25.00
   *               description:
   *                 type: string
   *                 maxLength: 1000
   *     responses:
   *       201:
   *         description: Template created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ClassTemplate'
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input data
   *       403:
   *         description: Only managers can create templates
   */
  router.post(
    "/templates",
    classCreationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validate(createClassTemplateSchema),
    controller.createTemplate
  );

  /**
   * @swagger
   * /classes/templates/{id}:
   *   put:
   *     tags: [Classes - Templates]
   *     summary: Update class template
   *     description: Update an existing class template (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 255
   *               classType:
   *                 type: string
   *                 enum: [ballet, pilates, barre, yoga, contemporary, jazz, modern]
   *               skillLevel:
   *                 type: string
   *                 enum: [beginner, intermediate, advanced, all_levels]
   *               instructorId:
   *                 type: string
   *                 format: uuid
   *                 nullable: true
   *               capacity:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *               durationMinutes:
   *                 type: integer
   *                 minimum: 15
   *                 maximum: 180
   *               price:
   *                 type: number
   *                 minimum: 0
   *               description:
   *                 type: string
   *                 maxLength: 1000
   *                 nullable: true
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Template updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ClassTemplate'
   *       404:
   *         description: Template not found
   *       403:
   *         description: Only managers can update templates
   */
  router.put(
    "/templates/:id",
    classCreationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validate(updateClassTemplateSchema),
    controller.updateTemplate
  );

  /**
   * @swagger
   * /classes/templates/{id}:
   *   delete:
   *     tags: [Classes - Templates]
   *     summary: Delete class template
   *     description: Soft delete (deactivate) a class template (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Template deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: Template not found
   *       403:
   *         description: Only managers can delete templates
   */
  router.delete(
    "/templates/:id",
    authMiddleware.requireEstablishmentAccess(["manager"]),
    controller.deleteTemplate
  );

  /**
   * @swagger
   * /classes/templates/{id}/generate-sessions:
   *   post:
   *     tags: [Classes - Templates]
   *     summary: Generate sessions from template
   *     description: Generate multiple class sessions from a template (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - startDate
   *               - endDate
   *               - daysOfWeek
   *               - startTime
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-01-15"
   *               endDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-02-15"
   *               daysOfWeek:
   *                 type: array
   *                 items:
   *                   type: integer
   *                   minimum: 0
   *                   maximum: 6
   *                 minItems: 1
   *                 example: [1, 3, 5]
   *                 description: "Days of week (0=Sunday, 1=Monday, etc.)"
   *               startTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *                 example: "10:00"
   *               endTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *                 example: "11:00"
   *               instructorId:
   *                 type: string
   *                 format: uuid
   *               capacity:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *     responses:
   *       201:
   *         description: Sessions generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ClassSession'
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Template not found
   *       403:
   *         description: Only managers can generate sessions
   */
  router.post(
    "/templates/:id/generate-sessions",
    classCreationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validate(generateSessionsSchema),
    controller.generateSessions
  );

  // CLASS SESSION ROUTES

  /**
   * @swagger
   * /classes/sessions:
   *   get:
   *     tags: [Classes - Sessions]
   *     summary: Get all class sessions
   *     description: Retrieve all class sessions with optional filtering
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: instructorId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [scheduled, in_progress, completed, cancelled]
   *       - in: query
   *         name: classTemplateId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *     responses:
   *       200:
   *         description: List of class sessions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ClassSession'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getSessions
  );

  /**
   * @swagger
   * /classes/sessions/upcoming:
   *   get:
   *     tags: [Classes - Sessions]
   *     summary: Get upcoming sessions
   *     description: Get upcoming sessions for the next N days
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 30
   *           default: 7
   *         description: Number of days ahead to fetch sessions
   *     responses:
   *       200:
   *         description: List of upcoming sessions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ClassSession'
   *                 message:
   *                   type: string
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/upcoming",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getUpcomingSessions
  );

  /**
   * @swagger
   * /classes/sessions/{id}:
   *   get:
   *     tags: [Classes - Sessions]
   *     summary: Get class session by ID
   *     description: Retrieve a specific class session with enrollment details
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Class session details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ClassSession'
   *       404:
   *         description: Session not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/:id",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getSession
  );

  /**
   * @swagger
   * /classes/sessions:
   *   post:
   *     tags: [Classes - Sessions]
   *     summary: Create class session
   *     description: Create a new class session (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sessionDate
   *               - startTime
   *             properties:
   *               classTemplateId:
   *                 type: string
   *                 format: uuid
   *                 description: Template to base session on (optional)
   *               instructorId:
   *                 type: string
   *                 format: uuid
   *               sessionDate:
   *                 type: string
   *                 format: date
   *                 example: "2024-01-15"
   *               startTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *                 example: "10:00"
   *               endTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *                 example: "11:00"
   *               capacity:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *               notes:
   *                 type: string
   *                 maxLength: 500
   *               isRecurring:
   *                 type: boolean
   *                 default: false
   *               recurrenceFrequency:
   *                 type: string
   *                 enum: [weekly, biweekly, monthly, daily]
   *               recurrenceDaysOfWeek:
   *                 type: array
   *                 items:
   *                   type: integer
   *                   minimum: 0
   *                   maximum: 6
   *               recurrenceEndDate:
   *                 type: string
   *                 format: date
   *     responses:
   *       201:
   *         description: Session created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ClassSession'
   *       400:
   *         description: Invalid input data
   *       403:
   *         description: Only managers can create sessions
   */
  router.post(
    "/sessions",
    classCreationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validate(createClassSessionSchema),
    controller.createSession
  );

  /**
   * @swagger
   * /classes/sessions/{id}:
   *   put:
   *     tags: [Classes - Sessions]
   *     summary: Update class session
   *     description: Update an existing class session (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               instructorId:
   *                 type: string
   *                 format: uuid
   *                 nullable: true
   *               sessionDate:
   *                 type: string
   *                 format: date
   *               startTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *               endTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *               capacity:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *               status:
   *                 type: string
   *                 enum: [scheduled, in_progress, completed, cancelled]
   *               notes:
   *                 type: string
   *                 maxLength: 500
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Session updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ClassSession'
   *       404:
   *         description: Session not found
   *       403:
   *         description: Only managers can update sessions
   */
  router.put(
    "/sessions/:id",
    classCreationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validate(updateClassSessionSchema),
    controller.updateSession
  );

  /**
   * @swagger
   * /classes/sessions/{id}/cancel:
   *   post:
   *     tags: [Classes - Sessions]
   *     summary: Cancel class session
   *     description: Cancel a scheduled class session (Manager only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Session cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Cannot cancel past session or session not found
   *       403:
   *         description: Only managers can cancel sessions
   */
  router.post(
    "/sessions/:id/cancel",
    authMiddleware.requireEstablishmentAccess(["manager"]),
    controller.cancelSession
  );

  // ENROLLMENT ROUTES

  /**
   * @swagger
   * /classes/sessions/{id}/enrollments:
   *   get:
   *     tags: [Classes - Enrollments]
   *     summary: Get session enrollments
   *     description: Get list of students enrolled in a session
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Session ID
   *     responses:
   *       200:
   *         description: List of enrolled students
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/SessionEnrollment'
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/:id/enrollments",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getSessionEnrollments
  );

  /**
   * @swagger
   * /classes/sessions/{id}/enroll:
   *   post:
   *     tags: [Classes - Enrollments]
   *     summary: Enroll students in session
   *     description: Enroll one or more students in a class session
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Session ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - studentIds
   *             properties:
   *               studentIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: uuid
   *                 minItems: 1
   *                 maxItems: 10
   *                 description: Array of student IDs to enroll
   *               usePackageCredits:
   *                 type: boolean
   *                 default: false
   *                 description: Whether to deduct from student packages
   *               notifyStudent:
   *                 type: boolean
   *                 default: false
   *                 description: Whether to notify students of enrollment
   *     responses:
   *       200:
   *         description: Enrollment results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 enrollments:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       studentId:
   *                         type: string
   *                       studentName:
   *                         type: string
   *                       enrolled:
   *                         type: boolean
   *                       waitlisted:
   *                         type: boolean
   *                       error:
   *                         type: string
   *                       packageDeducted:
   *                         type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Session full or invalid data
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    "/sessions/:id/enroll",
    enrollmentRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validate(enrollStudentsSchema),
    controller.enrollStudents
  );

  /**
   * @swagger
   * /classes/sessions/{id}/enroll/{studentId}:
   *   delete:
   *     tags: [Classes - Enrollments]
   *     summary: Remove student from session
   *     description: Remove a student from a class session
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Session ID
   *       - in: path
   *         name: studentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Student ID
   *     responses:
   *       200:
   *         description: Student removed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: Enrollment not found
   *       403:
   *         description: Insufficient permissions
   */
  router.delete(
    "/sessions/:id/enroll/:studentId",
    enrollmentRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.removeStudent
  );

  /**
   * @swagger
   * /classes/students/{studentId}/enrolled-sessions:
   *   get:
   *     tags: [Classes - Enrollments]
   *     summary: Get student's enrolled sessions
   *     description: Get list of sessions a student is enrolled in
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: path
   *         name: studentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Student ID
   *       - in: query
   *         name: includeCompleted
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Include completed sessions
   *     responses:
   *       200:
   *         description: List of enrolled sessions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/StudentEnrolledSession'
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/students/:studentId/enrolled-sessions",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getStudentEnrolledSessions
  );

  // STATISTICS AND REPORTING ROUTES

  /**
   * @swagger
   * /classes/stats:
   *   get:
   *     tags: [Classes - Reports]
   *     summary: Get class statistics
   *     description: Get overall class and enrollment statistics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *     responses:
   *       200:
   *         description: Class statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ClassStats'
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/stats",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getStats
  );

  /**
   * @swagger
   * /classes/calendar:
   *   get:
   *     tags: [Classes - Reports]
   *     summary: Get calendar events
   *     description: Get class sessions in calendar format for a date range
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Establishment context ID
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for calendar events
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for calendar events
   *     responses:
   *       200:
   *         description: Calendar events
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/CalendarEvent'
   *       400:
   *         description: Invalid date range
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/calendar",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getCalendarEvents
  );

  // Error handling middleware
  router.use((error: any, req: any, res: any, next: any) => {
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

  return router;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ClassTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         establishmentId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           example: "Beginner Ballet"
 *         classType:
 *           type: string
 *           enum: [ballet, pilates, barre, yoga, contemporary, jazz, modern]
 *         skillLevel:
 *           type: string
 *           enum: [beginner, intermediate, advanced, all_levels]
 *         instructorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         instructorName:
 *           type: string
 *           nullable: true
 *         capacity:
 *           type: integer
 *           example: 12
 *         durationMinutes:
 *           type: integer
 *           example: 60
 *         price:
 *           type: number
 *           example: 25.00
 *         description:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     ClassSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         establishmentId:
 *           type: string
 *           format: uuid
 *         classTemplateId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         templateTitle:
 *           type: string
 *           nullable: true
 *         instructorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         instructorName:
 *           type: string
 *           nullable: true
 *         sessionDate:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *           example: "10:00"
 *         endTime:
 *           type: string
 *           example: "11:00"
 *         capacity:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         notes:
 *           type: string
 *           nullable: true
 *         isRecurring:
 *           type: boolean
 *         recurrenceFrequency:
 *           type: string
 *           enum: [weekly, biweekly, monthly, daily]
 *           nullable: true
 *         recurrenceDaysOfWeek:
 *           type: array
 *           items:
 *             type: integer
 *           nullable: true
 *         recurrenceEndDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         parentSessionId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         enrollmentCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     SessionEnrollment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         establishmentId:
 *           type: string
 *           format: uuid
 *         sessionId:
 *           type: string
 *           format: uuid
 *         studentId:
 *           type: string
 *           format: uuid
 *         studentName:
 *           type: string
 *         studentEmail:
 *           type: string
 *         enrollmentDate:
 *           type: string
 *           format: date-time
 *         isWaitlist:
 *           type: boolean
 *         isNotifiedAbsence:
 *           type: boolean
 *     
 *     StudentEnrolledSession:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           format: uuid
 *         sessionDate:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         templateTitle:
 *           type: string
 *         instructorName:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         isWaitlist:
 *           type: boolean
 *         enrollmentDate:
 *           type: string
 *           format: date-time
 *     
 *     ClassStats:
 *       type: object
 *       properties:
 *         totalTemplates:
 *           type: integer
 *         activeTemplates:
 *           type: integer
 *         totalSessions:
 *           type: integer
 *         upcomingSessions:
 *           type: integer
 *         totalEnrollments:
 *           type: integer
 *         averageEnrollmentRate:
 *           type: number
 *         popularClassTypes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               classType:
 *                 type: string
 *               count:
 *                 type: integer
 *         monthlyRevenue:
 *           type: number
 *     
 *     CalendarEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         instructorName:
 *           type: string
 *           nullable: true
 *         enrollmentCount:
 *           type: integer
 *         capacity:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         classType:
 *           type: string
 *           enum: [ballet, pilates, barre, yoga, contemporary, jazz, modern]
 *         skillLevel:
 *           type: string
 *           enum: [beginner, intermediate, advanced, all_levels]
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of items
 *         page:
 *           type: integer
 *           description: Current page number
 *         limit:
 *           type: integer
 *           description: Items per page
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 */

export default createClassesRoutes;