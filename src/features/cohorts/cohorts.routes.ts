import { Router, Request, Response, NextFunction } from "express";
import Joi from "joi";
import { CohortsController } from "./cohorts.controller.js";
import { CohortsService } from "./cohorts.service.js";
import { CohortsRepository } from "./cohorts.repository.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";

// Validation schemas
const createCohortSchema = Joi.object({
  templateId: Joi.string().uuid().required(),
  instructorId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  ageMin: Joi.number().integer().min(0).max(100).optional(),
  ageMax: Joi.number().integer().min(0).max(100).optional(),
  maxStudents: Joi.number().integer().min(1).max(50).required(),
  scheduleDays: Joi.array()
    .items(Joi.number().integer().min(0).max(6))
    .min(1)
    .required(),
  scheduleStartTime: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required(),
  scheduleDurationMinutes: Joi.number().integer().min(15).max(480).required(),
  termStartDate: Joi.string().isoDate().required(),
  termEndDate: Joi.string().isoDate().required(),
  holidayBreaks: Joi.array()
    .items(
      Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        name: Joi.string().min(1).max(100).required(),
      })
    )
    .optional(),
  makeupPolicy: Joi.string().max(500).optional(),
}).custom((value, helpers) => {
  // Validate age range
  if (value.ageMin && value.ageMax && value.ageMin > value.ageMax) {
    return helpers.error("any.invalid", {
      message: "ageMin cannot be greater than ageMax",
    });
  }

  // Validate term dates
  if (new Date(value.termStartDate) >= new Date(value.termEndDate)) {
    return helpers.error("any.invalid", {
      message: "termStartDate must be before termEndDate",
    });
  }

  // Validate holiday breaks
  if (value.holidayBreaks) {
    for (const holiday of value.holidayBreaks) {
      if (new Date(holiday.start) >= new Date(holiday.end)) {
        return helpers.error("any.invalid", {
          message: `Holiday break "${holiday.name}": start date must be before end date`,
        });
      }
    }
  }

  return value;
});

const updateCohortSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  instructorId: Joi.string().uuid().optional(),
  ageMin: Joi.number().integer().min(0).max(100).optional(),
  ageMax: Joi.number().integer().min(0).max(100).optional(),
  maxStudents: Joi.number().integer().min(1).max(50).optional(),
  scheduleDays: Joi.array()
    .items(Joi.number().integer().min(0).max(6))
    .min(1)
    .optional(),
  scheduleStartTime: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  scheduleDurationMinutes: Joi.number().integer().min(15).max(480).optional(),
  termStartDate: Joi.string().isoDate().optional(),
  termEndDate: Joi.string().isoDate().optional(),
  holidayBreaks: Joi.array()
    .items(
      Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        name: Joi.string().min(1).max(100).required(),
      })
    )
    .optional(),
  makeupPolicy: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
}).custom((value, helpers) => {
  // Validate age range if both provided
  if (
    value.ageMin !== undefined &&
    value.ageMax !== undefined &&
    value.ageMin > value.ageMax
  ) {
    return helpers.error("any.invalid", {
      message: "ageMin cannot be greater than ageMax",
    });
  }

  // Validate term dates if both provided
  if (
    value.termStartDate &&
    value.termEndDate &&
    new Date(value.termStartDate) >= new Date(value.termEndDate)
  ) {
    return helpers.error("any.invalid", {
      message: "termStartDate must be before termEndDate",
    });
  }

  // Validate holiday breaks
  if (value.holidayBreaks) {
    for (const holiday of value.holidayBreaks) {
      if (new Date(holiday.start) >= new Date(holiday.end)) {
        return helpers.error("any.invalid", {
          message: `Holiday break "${holiday.name}": start date must be before end date`,
        });
      }
    }
  }

  return value;
});

const addStudentToCohortSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  paymentType: Joi.string().valid("package", "term_fee", "drop_in").required(),
  joinedDate: Joi.string().isoDate().optional(),
  notes: Joi.string().max(500).optional(),
});

const removeStudentFromCohortSchema = Joi.object({
  leftDate: Joi.string().isoDate().optional(),
  notes: Joi.string().max(500).optional(),
});

const bulkEnrollSchema = Joi.object({
  students: Joi.array()
    .items(
      Joi.object({
        studentId: Joi.string().uuid().required(),
        paymentType: Joi.string()
          .valid("package", "term_fee", "drop_in")
          .required(),
        joinedDate: Joi.string().isoDate().optional(),
        notes: Joi.string().max(500).optional(),
      })
    )
    .min(1)
    .max(20)
    .required(),
});

const generateSessionsSchema = Joi.object({
  generateFromDate: Joi.string().isoDate().optional(),
  generateToDate: Joi.string().isoDate().optional(),
  includeHolidays: Joi.boolean().optional(),
  skipEnrollment: Joi.boolean().optional(),
});

const cloneCohortSchema = Joi.object({
  newName: Joi.string().min(1).max(255).required(),
  newTermStartDate: Joi.string().isoDate().required(),
  newTermEndDate: Joi.string().isoDate().required(),
  newInstructorId: Joi.string().uuid().optional(),
  copyStudents: Joi.boolean().default(false),
  newHolidayBreaks: Joi.array()
    .items(
      Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        name: Joi.string().min(1).max(100).required(),
      })
    )
    .optional(),
}).custom((value, helpers) => {
  // Validate new term dates
  if (new Date(value.newTermStartDate) >= new Date(value.newTermEndDate)) {
    return helpers.error("any.invalid", {
      message: "newTermStartDate must be before newTermEndDate",
    });
  }

  // Validate new holiday breaks
  if (value.newHolidayBreaks) {
    for (const holiday of value.newHolidayBreaks) {
      if (new Date(holiday.start) >= new Date(holiday.end)) {
        return helpers.error("any.invalid", {
          message: `Holiday break "${holiday.name}": start date must be before end date`,
        });
      }
    }
  }

  return value;
});

// Query parameter schemas
const cohortFiltersSchema = Joi.object({
  instructorId: Joi.string().uuid().optional(),
  templateId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().optional(),
  ageMin: Joi.number().integer().min(0).max(100).optional(),
  ageMax: Joi.number().integer().min(0).max(100).optional(),
  scheduleDays: Joi.alternatives()
    .try(
      Joi.number().integer().min(0).max(6),
      Joi.string().pattern(/^[0-6](,[0-6])*$/)
    )
    .optional(),
  termActive: Joi.boolean().optional(),
  hasAvailableSpots: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const membershipFiltersSchema = Joi.object({
  cohortId: Joi.string().uuid().optional(),
  studentId: Joi.string().uuid().optional(),
  paymentType: Joi.string().valid("package", "term_fee", "drop_in").optional(),
  isActive: Joi.boolean().optional(),
  joinedAfter: Joi.string().isoDate().optional(),
  joinedBefore: Joi.string().isoDate().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// UUID parameter validation
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const cohortAndStudentParamSchema = Joi.object({
  cohortId: Joi.string().uuid().required(),
  studentId: Joi.string().uuid().required(),
});

// Factory function to create routes with dependencies
export function createCohortsRoutes(
  db: DatabaseService,
  logger: LoggerService,
  authMiddleware: AuthMiddleware,
  establishmentMiddleware: EstablishmentMiddleware
): Router {
  const router = Router();

  // Initialize dependencies
  const cohortsRepository = new CohortsRepository(db);
  const cohortsService = new CohortsService(cohortsRepository, db, logger);
  const cohortsController = new CohortsController(cohortsService, logger, db);

  // Apply middleware to all routes
  router.use(authMiddleware.authenticate());
  router.use(establishmentMiddleware.extractEstablishment());

  // Routes

  /**
   * @swagger
   * /cohorts:
   *   post:
   *     summary: Create a new cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
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
   *               - templateId
   *               - instructorId
   *               - name
   *               - maxStudents
   *               - scheduleDays
   *               - scheduleStartTime
   *               - scheduleDurationMinutes
   *               - termStartDate
   *               - termEndDate
   *             properties:
   *               templateId:
   *                 type: string
   *                 format: uuid
   *               instructorId:
   *                 type: string
   *                 format: uuid
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *               description:
   *                 type: string
   *                 maxLength: 1000
   *               ageMin:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *               ageMax:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *               maxStudents:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 50
   *               scheduleDays:
   *                 type: array
   *                 items:
   *                   type: integer
   *                   minimum: 0
   *                   maximum: 6
   *                 minItems: 1
   *               scheduleStartTime:
   *                 type: string
   *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *               scheduleDurationMinutes:
   *                 type: integer
   *                 minimum: 15
   *                 maximum: 480
   *               termStartDate:
   *                 type: string
   *                 format: date
   *               termEndDate:
   *                 type: string
   *                 format: date
   *               holidayBreaks:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     start:
   *                       type: string
   *                       format: date
   *                     end:
   *                       type: string
   *                       format: date
   *                     name:
   *                       type: string
   *               makeupPolicy:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       201:
   *         description: Cohort created successfully
   *       400:
   *         description: Invalid request data
   *       409:
   *         description: Cohort name already exists
   *       422:
   *         description: Business validation failed
   */
  router.post(
    "/",
    ValidationMiddleware.validateBody(createCohortSchema),
    cohortsController.createCohort.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts:
   *   get:
   *     summary: List cohorts with filters
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: instructorId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: templateId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: termActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: hasAvailableSpots
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *     responses:
   *       200:
   *         description: List of cohorts
   */
  router.get(
    "/",
    ValidationMiddleware.validateQuery(cohortFiltersSchema),
    cohortsController.getCohorts.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/stats:
   *   get:
   *     summary: Get cohort statistics
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Cohort statistics
   */
  router.get(
    "/stats",
    ValidationMiddleware.validateQuery(cohortFiltersSchema),
    cohortsController.getCohortStats.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{id}:
   *   get:
   *     summary: Get cohort by ID
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Cohort details
   *       404:
   *         description: Cohort not found
   */
  router.get(
    "/:id",
    ValidationMiddleware.validateParams(uuidParamSchema),
    cohortsController.getCohort.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{id}:
   *   put:
   *     summary: Update cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
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
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               maxStudents:
   *                 type: integer
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Cohort updated successfully
   *       404:
   *         description: Cohort not found
   *       422:
   *         description: Business validation failed
   */
  router.put(
    "/:id",
    ValidationMiddleware.validateParams(uuidParamSchema),
    ValidationMiddleware.validateBody(updateCohortSchema),
    cohortsController.updateCohort.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{id}:
   *   delete:
   *     summary: Delete cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Cohort deleted successfully
   *       404:
   *         description: Cohort not found
   *       409:
   *         description: Cannot delete cohort with active sessions
   */
  router.delete(
    "/:id",
    ValidationMiddleware.validateParams(uuidParamSchema),
    cohortsController.deleteCohort.bind(cohortsController)
  );

  // Student membership operations

  /**
   * @swagger
   * /cohorts/{cohortId}/students:
   *   post:
   *     summary: Add student to cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
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
   *               - studentId
   *               - paymentType
   *             properties:
   *               studentId:
   *                 type: string
   *                 format: uuid
   *               paymentType:
   *                 type: string
   *                 enum: [package, term_fee, drop_in]
   *               joinedDate:
   *                 type: string
   *                 format: date
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Student added to cohort
   *       409:
   *         description: Student already enrolled or cohort full
   *       422:
   *         description: Business validation failed
   */
  router.post(
    "/:cohortId/students",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateBody(addStudentToCohortSchema),
    cohortsController.addStudentToCohort.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{cohortId}/students/bulk:
   *   post:
   *     summary: Bulk enroll students to cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
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
   *               - students
   *             properties:
   *               students:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     studentId:
   *                       type: string
   *                       format: uuid
   *                     paymentType:
   *                       type: string
   *                       enum: [package, term_fee, drop_in]
   *                     notes:
   *                       type: string
   *     responses:
   *       201:
   *         description: Students enrolled successfully
   *       207:
   *         description: Partial success with some failures
   */
  router.post(
    "/:cohortId/students/bulk",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateBody(bulkEnrollSchema),
    cohortsController.bulkEnrollStudents.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{cohortId}/students/{studentId}:
   *   delete:
   *     summary: Remove student from cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: studentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               leftDate:
   *                 type: string
   *                 format: date
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Student removed from cohort
   *       404:
   *         description: Student not found in cohort
   */
  router.delete(
    "/:cohortId/students/:studentId",
    ValidationMiddleware.validateParams(cohortAndStudentParamSchema),
    ValidationMiddleware.validateBody(removeStudentFromCohortSchema),
    cohortsController.removeStudentFromCohort.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{cohortId}/students:
   *   get:
   *     summary: Get cohort members
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of cohort members
   */
  router.get(
    "/:cohortId/students",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateQuery(membershipFiltersSchema),
    cohortsController.getCohortMembers.bind(cohortsController)
  );

  // Session operations

  /**
   * @swagger
   * /cohorts/{cohortId}/sessions/generate:
   *   post:
   *     summary: Generate sessions for cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               generateFromDate:
   *                 type: string
   *                 format: date
   *               generateToDate:
   *                 type: string
   *                 format: date
   *               includeHolidays:
   *                 type: boolean
   *               skipEnrollment:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Sessions generated successfully
   *       422:
   *         description: Sessions already exist or validation failed
   */
  router.post(
    "/:cohortId/sessions/generate",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateBody(generateSessionsSchema),
    cohortsController.generateSessions.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{cohortId}/sessions:
   *   get:
   *     summary: Get cohort sessions
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of cohort sessions
   */
  router.get(
    "/:cohortId/sessions",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateQuery(
      Joi.object({
        startDate: Joi.string().isoDate().optional(),
        endDate: Joi.string().isoDate().optional(),
        includeEnrollments: Joi.boolean().optional(),
        limit: Joi.number().integer().min(1).max(100).default(50),
        offset: Joi.number().integer().min(0).default(0),
      })
    ),
    cohortsController.getCohortSessions.bind(cohortsController)
  );

  // Utility operations

  /**
   * @swagger
   * /cohorts/{cohortId}/availability:
   *   get:
   *     summary: Check cohort availability
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Cohort availability information
   */
  router.get(
    "/:cohortId/availability",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    cohortsController.checkAvailability.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{cohortId}/next-session:
   *   get:
   *     summary: Get next upcoming session for cohort
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Next session details
   *       404:
   *         description: No upcoming sessions
   */
  router.get(
    "/:cohortId/next-session",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    cohortsController.getUpcomingSession.bind(cohortsController)
  );

  /**
   * @swagger
   * /cohorts/{cohortId}/clone:
   *   post:
   *     summary: Clone cohort for new term
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: cohortId
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
   *               - newName
   *               - newTermStartDate
   *               - newTermEndDate
   *             properties:
   *               newName:
   *                 type: string
   *               newTermStartDate:
   *                 type: string
   *                 format: date
   *               newTermEndDate:
   *                 type: string
   *                 format: date
   *               copyStudents:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Cohort cloned successfully
   *       404:
   *         description: Original cohort not found
   */
  router.post(
    "/:cohortId/clone",
    ValidationMiddleware.validateParams(
      Joi.object({ cohortId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateBody(cloneCohortSchema),
    cohortsController.cloneCohort.bind(cohortsController)
  );

  // Student-centric operations

  /**
   * @swagger
   * /cohorts/students/{studentId}/cohorts:
   *   get:
   *     summary: Get student's cohorts
   *     tags: [Cohorts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: studentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of student's cohorts
   */
  router.get(
    "/students/:studentId/cohorts",
    ValidationMiddleware.validateParams(
      Joi.object({ studentId: Joi.string().uuid().required() })
    ),
    ValidationMiddleware.validateQuery(
      Joi.object({
        isActive: Joi.boolean().optional(),
        includeStats: Joi.boolean().optional(),
      })
    ),
    cohortsController.getStudentCohorts.bind(cohortsController)
  );

  return router;
}

// Export for named import compatibility
export { createCohortsRoutes as cohortsRoutes };
