import { Router } from "express";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import { StudentsController } from "./students.controller.js";
import { StudentsService } from "./students.service.js";
import { StudentsRepository } from "./students.repository.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { TokenService } from "../auth/services/TokenService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { CookieService } from "../auth/services/CookieService.js";

// Validation schemas
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

// Rate limiting
const studentsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

const createStudentsRoutes = (
  db: DatabaseService,
  logger: LoggerService,
  tokenService: TokenService,
  authRepository: AuthRepository,
  passwordService: any,
  cookieService: CookieService
): Router => {
  const router = Router();

  // Initialize components
  const repository = new StudentsRepository(db);
  const service = new StudentsService(repository, logger);
  const controller = new StudentsController(service, logger);

  // Initialize middleware
  const authMiddleware = new AuthMiddleware(
    tokenService,
    cookieService,
    authRepository,
    logger
  );
  const establishmentMiddleware = new EstablishmentMiddleware(logger, db);

  // Apply rate limiting to all routes
  router.use(studentsRateLimit);

  /**
   * @swagger
   * /students/search:
   *   get:
   *     tags: [Students]
   *     summary: Search students
   *     description: Search for students with various filters (Manager/Instructor only)
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
   *         name: q
   *         schema:
   *           type: string
   *           maxLength: 100
   *         description: Search term (name, email, phone)
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, inactive, all]
   *           default: active
   *         description: Student status filter
   *       - in: query
   *         name: cohortId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by specific cohort
   *       - in: query
   *         name: available
   *         schema:
   *           type: boolean
   *         description: Show only students not in any active cohorts
   *       - in: query
   *         name: ageMin
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 150
   *         description: Minimum age filter
   *       - in: query
   *         name: ageMax
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 150
   *         description: Maximum age filter
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of results per page
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *     responses:
   *       200:
   *         description: Students found
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
   *                     $ref: '#/components/schemas/StudentSearchResult'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *                 message:
   *                   type: string
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/search",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validateQuery(searchStudentsSchema),
    controller.searchStudents
  );

  /**
   * @swagger
   * /students/stats:
   *   get:
   *     tags: [Students]
   *     summary: Get students statistics
   *     description: Get statistical data about students (Manager only)
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
   *         description: Statistics retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/StudentStats'
   *                 message:
   *                   type: string
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/stats",
    authMiddleware.requireEstablishmentAccess(["manager"]),
    controller.getStudentsStats
  );

  /**
   * @swagger
   * /students/{id}:
   *   get:
   *     tags: [Students]
   *     summary: Get student profile
   *     description: Get detailed student information (Manager/Instructor only)
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
   *         description: Student ID
   *     responses:
   *       200:
   *         description: Student profile retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/StudentProfile'
   *                 message:
   *                   type: string
   *       404:
   *         description: Student not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/:id",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getStudentProfile
  );

  /**
   * @swagger
   * /students:
   *   post:
   *     tags: [Students]
   *     summary: Create new student
   *     description: Create a new student record (Manager only)
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
   *             required: [name, phone, emergencyContact]
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *                 description: Student full name
   *               email:
   *                 type: string
   *                 format: email
   *                 maxLength: 255
   *                 description: Student email (optional)
   *               phone:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *                 description: Student phone number
   *               emergencyContact:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *                 description: Emergency contact phone
   *               emergencyContactName:
   *                 type: string
   *                 maxLength: 255
   *                 description: Emergency contact name
   *               parentName:
   *                 type: string
   *                 maxLength: 255
   *                 description: Parent/guardian name
   *               parentPhone:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *                 description: Parent/guardian phone
   *               parentEmail:
   *                 type: string
   *                 format: email
   *                 maxLength: 255
   *                 description: Parent/guardian email
   *               birthDate:
   *                 type: string
   *                 format: date
   *                 description: Student birth date
   *               medicalNotes:
   *                 type: string
   *                 maxLength: 1000
   *                 description: Medical notes and conditions
   *     responses:
   *       201:
   *         description: Student created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Student'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validation error
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    "/",
    authMiddleware.requireEstablishmentAccess(["manager"]),
    ValidationMiddleware.validate(createStudentSchema),
    controller.createStudent
  );

  /**
   * @swagger
   * /students/{id}:
   *   put:
   *     tags: [Students]
   *     summary: Update student
   *     description: Update student information (Manager/Instructor only)
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
   *         description: Student ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *               email:
   *                 type: string
   *                 format: email
   *                 maxLength: 255
   *               phone:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *               emergencyContact:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *               emergencyContactName:
   *                 type: string
   *                 maxLength: 255
   *               parentName:
   *                 type: string
   *                 maxLength: 255
   *               parentPhone:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *               parentEmail:
   *                 type: string
   *                 format: email
   *                 maxLength: 255
   *               birthDate:
   *                 type: string
   *                 format: date
   *               medicalNotes:
   *                 type: string
   *                 maxLength: 1000
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Student updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Student'
   *                 message:
   *                   type: string
   *       404:
   *         description: Student not found
   *       403:
   *         description: Insufficient permissions
   */
  router.put(
    "/:id",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validate(updateStudentSchema),
    controller.updateStudent
  );

  /**
   * @swagger
   * /students/{id}:
   *   delete:
   *     tags: [Students]
   *     summary: Deactivate student
   *     description: Deactivate a student (soft delete) - Manager only
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
   *         description: Student ID
   *     responses:
   *       200:
   *         description: Student deactivated successfully
   *       404:
   *         description: Student not found
   *       403:
   *         description: Insufficient permissions
   */
  router.delete(
    "/:id",
    authMiddleware.requireEstablishmentAccess(["manager"]),
    controller.deactivateStudent
  );

  /**
   * @swagger
   * /students/sessions/{sessionId}/roster:
   *   get:
   *     tags: [Students]
   *     summary: Get session roster
   *     description: Get list of students enrolled in a session (Instructor view)
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
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Session ID
   *     responses:
   *       200:
   *         description: Session roster retrieved
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
   *                     $ref: '#/components/schemas/StudentRosterEntry'
   *                 message:
   *                   type: string
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/:sessionId/roster",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getSessionRoster
  );

  return router;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         establishmentId:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         phone:
 *           type: string
 *         emergencyContact:
 *           type: string
 *         emergencyContactName:
 *           type: string
 *           nullable: true
 *         parentName:
 *           type: string
 *           nullable: true
 *         parentPhone:
 *           type: string
 *           nullable: true
 *         parentEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *         birthDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         medicalNotes:
 *           type: string
 *           nullable: true
 *         registrationDate:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     StudentProfile:
 *       allOf:
 *         - $ref: '#/components/schemas/Student'
 *         - type: object
 *           properties:
 *             userEmail:
 *               type: string
 *               format: email
 *               nullable: true
 *             activeCohorts:
 *               type: integer
 *             totalSessions:
 *               type: integer
 *             cohortNames:
 *               type: array
 *               items:
 *                 type: string
 *             lastAttendance:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             attendanceRate:
 *               type: number
 *               format: float
 *
 *     StudentSearchResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         phone:
 *           type: string
 *         userEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         activeCohorts:
 *           type: integer
 *         cohortNames:
 *           type: array
 *           items:
 *             type: string
 *         registrationDate:
 *           type: string
 *           format: date
 *
 *     StudentRosterEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         emergencyContact:
 *           type: string
 *         medicalNotes:
 *           type: string
 *           nullable: true
 *         isPresent:
 *           type: boolean
 *         isLate:
 *           type: boolean
 *         notes:
 *           type: string
 *           nullable: true
 *
 *     StudentStats:
 *       type: object
 *       properties:
 *         totalStudents:
 *           type: integer
 *         activeStudents:
 *           type: integer
 *         inactiveStudents:
 *           type: integer
 *         newThisMonth:
 *           type: integer
 *         averageCohortsPerStudent:
 *           type: number
 *           format: float
 *         topCohorts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               cohortId:
 *                 type: string
 *                 format: uuid
 *               cohortName:
 *                 type: string
 *               studentCount:
 *                 type: integer
 */

export default createStudentsRoutes;
