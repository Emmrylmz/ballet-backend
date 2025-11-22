import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AttendanceController } from "./attendance.controller.js";
import { AttendanceService } from "./attendance.service.js";
import { AttendanceRepository } from "./attendance.repository.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuditLogService } from "../../services/AuditLogService.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { AuditMiddleware } from "../../middleware/AuditMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { TokenService } from "../auth/services/TokenService.js";
import { CookieService } from "../auth/services/CookieService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import Joi from "joi";

// Validation schemas
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
    .items(
      Joi.object({
        studentId: Joi.string().uuid().required(),
        status: Joi.string()
          .valid("present", "late", "absent", "excused")
          .required(),
        notes: Joi.string().max(500).optional(),
      })
    )
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

// Rate limiting for attendance operations
const attendanceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 attendance operations per 15 minutes
  message: {
    success: false,
    message: "Too many attendance operations, please try again later",
    code: "ATTENDANCE_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for bulk operations
const bulkOperationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 bulk operations per hour
  message: {
    success: false,
    message: "Too many bulk operations, please try again later",
    code: "BULK_RATE_LIMIT_EXCEEDED",
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

const createAttendanceRoutes = (
  db: DatabaseService,
  logger: LoggerService,
  auditLogService: AuditLogService,
  tokenService: TokenService,
  authRepository: AuthRepository,
  passwordService: any,
  cookieService: CookieService
): (attendanceController: AttendanceController) => Router => {
  // This is a factory function that returns another function
  // The actual controller will be injected by the factory
  return (controller: AttendanceController): Router => {
    const router = Router();

    // Initialize middleware
    const authMiddleware = new AuthMiddleware(
      tokenService,
      cookieService,
      authRepository,
      logger
    );
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
    const auditMiddleware = new AuditMiddleware(auditLogService, logger);

    // Apply rate limiting to all routes
    router.use(generalRateLimit);

    // Apply authentication to all routes
    router.use(authMiddleware.authenticate());

    // Apply establishment context to all routes
    router.use(establishmentMiddleware.extractEstablishment());

  // SESSION ROSTER ROUTES

  /**
   * @swagger
   * /attendance/sessions/{sessionId}/roster:
   *   get:
   *     tags: [Attendance - Roster]
   *     summary: Get session roster with attendance information
   *     description: Retrieve session roster including student enrollments and attendance status
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
   *         description: Session roster retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/SessionRoster'
   *                 message:
   *                   type: string
   *       404:
   *         description: Session not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/:sessionId/roster",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getSessionRoster.bind(controller)
  );

  // ATTENDANCE MARKING ROUTES

  /**
   * @swagger
   * /attendance/sessions/{sessionId}/student/{studentId}:
   *   post:
   *     tags: [Attendance - Mark]
   *     summary: Mark attendance for a student
   *     description: Mark attendance status for a specific student in a session
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
   *       - in: path
   *         name: studentId
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
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [present, late, absent, excused]
   *                 example: "present"
   *               notes:
   *                 type: string
   *                 maxLength: 1000
   *                 example: "Student arrived 10 minutes late"
   *     responses:
   *       200:
   *         description: Attendance marked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AttendanceRecord'
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: Session or student not found
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    "/sessions/:sessionId/student/:studentId",
    attendanceRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validate(markAttendanceSchema),
    auditMiddleware.log('attendance', 'mark_attendance'),
    controller.markAttendance.bind(controller)
  );

  /**
   * @swagger
   * /attendance/sessions/{sessionId}/bulk:
   *   put:
   *     tags: [Attendance - Mark]
   *     summary: Bulk mark attendance for multiple students
   *     description: Mark attendance for multiple students in a session at once
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
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - attendanceRecords
   *             properties:
   *               attendanceRecords:
   *                 type: array
   *                 minItems: 1
   *                 maxItems: 50
   *                 items:
   *                   type: object
   *                   required:
   *                     - studentId
   *                     - status
   *                   properties:
   *                     studentId:
   *                       type: string
   *                       format: uuid
   *                     status:
   *                       type: string
   *                       enum: [present, late, absent, excused]
   *                     notes:
   *                       type: string
   *                       maxLength: 500
   *     responses:
   *       200:
   *         description: Bulk attendance marked successfully
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
   *                     $ref: '#/components/schemas/AttendanceRecord'
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid request data
   *       422:
   *         description: Some records failed validation
   *       403:
   *         description: Insufficient permissions
   */
  router.put(
    "/sessions/:sessionId/bulk",
    bulkOperationRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validate(bulkAttendanceSchema),
    auditMiddleware.logBatch('attendance', 'bulk_mark_attendance'),
    controller.bulkMarkAttendance.bind(controller)
  );

  // ATTENDANCE UPDATE ROUTES

  /**
   * @swagger
   * /attendance/{attendanceId}:
   *   put:
   *     tags: [Attendance - Update]
   *     summary: Update an existing attendance record
   *     description: Update status and notes of an existing attendance record
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
   *         name: attendanceId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Attendance record ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [present, late, absent, excused]
   *               notes:
   *                 type: string
   *                 maxLength: 1000
   *     responses:
   *       200:
   *         description: Attendance updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AttendanceRecord'
   *                 message:
   *                   type: string
   *       404:
   *         description: Attendance record not found
   *       403:
   *         description: Insufficient permissions
   */
  router.put(
    "/:attendanceId",
    attendanceRateLimit,
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validate(updateAttendanceSchema),
    auditMiddleware.log('attendance', 'update_attendance'),
    controller.updateAttendance.bind(controller)
  );

  // ATTENDANCE QUERY ROUTES

  /**
   * @swagger
   * /attendance/sessions/{sessionId}:
   *   get:
   *     tags: [Attendance - Query]
   *     summary: Get attendance records for a session
   *     description: Retrieve all attendance records for a specific session
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
   *         description: Session attendance records retrieved successfully
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
   *                     $ref: '#/components/schemas/AttendanceRecord'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *                 message:
   *                   type: string
   *       404:
   *         description: Session not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/:sessionId",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getAttendanceRecords.bind(controller)
  );

  /**
   * @swagger
   * /attendance/records:
   *   get:
   *     tags: [Attendance - Query]
   *     summary: Get attendance records with filters
   *     description: Retrieve attendance records with optional filtering and pagination
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
   *         name: sessionId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by session ID
   *       - in: query
   *         name: studentId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by student ID
   *       - in: query
   *         name: instructorId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by instructor ID
   *       - in: query
   *         name: cohortId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by cohort ID
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [present, late, absent, excused]
   *         description: Filter by attendance status
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter from this date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter to this date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Number of records per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of records to skip
   *     responses:
   *       200:
   *         description: Attendance records retrieved successfully
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
   *                     $ref: '#/components/schemas/AttendanceRecord'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *                 message:
   *                   type: string
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/records",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    ValidationMiddleware.validateQuery(attendanceFiltersSchema),
    controller.getAttendanceRecords.bind(controller)
  );

  // STUDENT ATTENDANCE ROUTES

  /**
   * @swagger
   * /attendance/students/{studentId}/history:
   *   get:
   *     tags: [Attendance - Students]
   *     summary: Get student attendance history
   *     description: Get complete attendance history for a specific student
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
   *         description: Student attendance history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/StudentAttendanceHistory'
   *                 message:
   *                   type: string
   *       404:
   *         description: Student not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/students/:studentId/history",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getStudentAttendanceHistory.bind(controller)
  );

  // STATISTICS AND REPORTING ROUTES

  /**
   * @swagger
   * /attendance/sessions/{sessionId}/stats:
   *   get:
   *     tags: [Attendance - Statistics]
   *     summary: Get attendance statistics for a session
   *     description: Get attendance statistics and summary for a specific session
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
   *         description: Session attendance statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SessionAttendanceStats'
   *                 message:
   *                   type: string
   *       404:
   *         description: Session not found
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/sessions/:sessionId/stats",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getSessionAttendanceStats.bind(controller)
  );

  /**
   * @swagger
   * /attendance/trends:
   *   get:
   *     tags: [Attendance - Statistics]
   *     summary: Get attendance trends and analytics
   *     description: Get attendance trends, patterns, and analytics for reporting
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
   *         description: Start date for trend analysis
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for trend analysis
   *       - in: query
   *         name: cohortId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by cohort ID
   *       - in: query
   *         name: instructorId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by instructor ID
   *     responses:
   *       200:
   *         description: Attendance trends retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AttendanceTrends'
   *                 message:
   *                   type: string
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    "/trends",
    authMiddleware.requireEstablishmentAccess(["manager", "instructor"]),
    controller.getAttendanceTrends.bind(controller)
  );

  // Error handling middleware
  router.use((error: any, req: any, res: any, next: any) => {
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

/**
 * @swagger
 * components:
 *   schemas:
 *     AttendanceRecord:
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
 *         status:
 *           type: string
 *           enum: [present, late, absent, excused]
 *         notes:
 *           type: string
 *           nullable: true
 *         markedAt:
 *           type: string
 *           format: date-time
 *         markedBy:
 *           type: string
 *           format: uuid
 *         markedByName:
 *           type: string
 *           nullable: true
 *
 *     SessionRoster:
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
 *           example: "10:00"
 *         endTime:
 *           type: string
 *           example: "11:00"
 *         sessionTitle:
 *           type: string
 *         cohortName:
 *           type: string
 *         instructorName:
 *           type: string
 *         capacity:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         enrollments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               enrollmentId:
 *                 type: string
 *                 format: uuid
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               studentName:
 *                 type: string
 *               studentPhone:
 *                 type: string
 *                 nullable: true
 *               studentEmail:
 *                 type: string
 *                 nullable: true
 *               isWaitlist:
 *                 type: boolean
 *               hasAttendance:
 *                 type: boolean
 *               attendanceStatus:
 *                 type: string
 *                 enum: [present, late, absent, excused]
 *                 nullable: true
 *               attendanceNotes:
 *                 type: string
 *                 nullable: true
 *               attendanceRecord:
 *                 $ref: '#/components/schemas/AttendanceRecord'
 *                 nullable: true
 *         attendanceStats:
 *           $ref: '#/components/schemas/SessionAttendanceStats'
 *
 *     SessionAttendanceStats:
 *       type: object
 *       properties:
 *         totalEnrolled:
 *           type: integer
 *         totalPresent:
 *           type: integer
 *         totalLate:
 *           type: integer
 *         totalAbsent:
 *           type: integer
 *         totalExcused:
 *           type: integer
 *         attendanceRate:
 *           type: number
 *           description: Percentage of students present or late
 *
 *     StudentAttendanceHistory:
 *       type: object
 *       properties:
 *         studentId:
 *           type: string
 *           format: uuid
 *         studentName:
 *           type: string
 *         totalSessions:
 *           type: integer
 *         presentCount:
 *           type: integer
 *         lateCount:
 *           type: integer
 *         absentCount:
 *           type: integer
 *         excusedCount:
 *           type: integer
 *         attendanceRate:
 *           type: number
 *         records:
 *           type: array
 *           items:
 *             allOf:
 *               - $ref: '#/components/schemas/AttendanceRecord'
 *               - type: object
 *                 properties:
 *                   sessionDate:
 *                     type: string
 *                     format: date
 *                   sessionTitle:
 *                     type: string
 *                   instructorName:
 *                     type: string
 *
 *     AttendanceTrends:
 *       type: object
 *       properties:
 *         period:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *         overallStats:
 *           type: object
 *           properties:
 *             totalSessions:
 *               type: integer
 *             totalStudents:
 *               type: integer
 *             overallAttendanceRate:
 *               type: number
 *         dailyTrends:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               sessionsCount:
 *                 type: integer
 *               attendanceRate:
 *                 type: number
 *         cohortStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               cohortId:
 *                 type: string
 *                 format: uuid
 *               cohortName:
 *                 type: string
 *               attendanceRate:
 *                 type: number
 *               sessionCount:
 *                 type: integer
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

export default createAttendanceRoutes;