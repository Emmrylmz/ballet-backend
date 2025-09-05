import { Router } from "express";
import { InstructorDashboardController } from "./instructorDashboard.controller.js";
import { InstructorDashboardService } from "./instructorDashboard.service.js";
import { InstructorDashboardRepository } from "./instructorDashboard.repository.js";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
import { EstablishmentMiddleware } from "../../middleware/EstablishmentMiddleware.js";
import { TokenService } from "../auth/services/TokenService.js";
import { AuthRepository } from "../auth/auth.repository.js";
import Joi from "joi";

// Validation schemas
const activitiesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string()
    .valid("payment", "registration", "attendance", "class", "enrollment")
    .optional(),
  priority: Joi.string().valid("high", "medium", "low").optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

const createInstructorDashboardRoutes = (
  db: DatabaseService,
  logger: LoggerService,
  tokenService: TokenService,
  authRepository: AuthRepository
): Router => {
  const router = Router();

  // Initialize instructor dashboard components
  const repository = new InstructorDashboardRepository(db);
  const service = new InstructorDashboardService(repository, logger);
  const controller = new InstructorDashboardController(service, logger);

  // Initialize middleware
  const authMiddleware = new AuthMiddleware(
    tokenService,
    authRepository,
    logger
  );
  const establishmentMiddleware = new EstablishmentMiddleware(logger);

  // Apply authentication and establishment context to all routes
  router.use(authMiddleware.authenticate());
  router.use(establishmentMiddleware.extractEstablishment());
  router.use(establishmentMiddleware.validateEstablishmentAccess());

  /**
   * @swagger
   * /instructor-dashboard/stats:
   *   get:
   *     tags: [InstructorDashboard]
   *     summary: Get instructor dashboard statistics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: header
   *         name: X-Establishment-ID
   *         required: false
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The establishment ID to get statistics for (optional if user has default establishment)
   *     description: Retrieve comprehensive dashboard statistics including student counts, revenue, attendance rates, and trends
   *     parameters:
   *       - in: path
   *         name: establishment_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The establishment ID to get statistics for
   *     responses:
   *       200:
   *         description: Dashboard statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/DashboardStats'
   *       400:
   *         description: Bad request - Establishment ID is required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Establishment ID is required
   *       500:
   *         description: Internal server error
   */
  router.get("/stats", controller.getStats.bind(controller));

  /**
   * @swagger
   * /dashboard/activities/{establishment_id}:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get recent activities
   *     description: Retrieve recent activities with optional filtering
   *     parameters:
   *       - in: path
   *         name: establishment_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The establishment ID to get activities for
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Maximum number of activities to return
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [payment, registration, attendance, class, enrollment]
   *         description: Filter by activity type
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [high, medium, low]
   *         description: Filter by activity priority
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter activities from this date
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter activities until this date
   *     responses:
   *       200:
   *         description: Recent activities retrieved successfully
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
   *                     $ref: '#/components/schemas/RecentActivity'
   *                 meta:
   *                   type: object
   *                   properties:
   *                     count:
   *                       type: integer
   *                     filters:
   *                       type: object
   *       400:
   *         description: Invalid query parameters
   *       500:
   *         description: Internal server error
   */
  router.get(
    "/activities",
    ValidationMiddleware.validateQuery(activitiesQuerySchema),
    authMiddleware.requireEstablishmentAccess(["instructor", "manager"]),
    controller.getRecentActivities.bind(controller)
  );

  /**
   * @swagger
   * /dashboard/weekly-summary/{establishment_id}:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get weekly summary
   *     description: Retrieve weekly summary data including class counts, attendance rates, and income
   *     parameters:
   *       - in: path
   *         name: establishment_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The establishment ID to get weekly summary for
   *     responses:
   *       200:
   *         description: Weekly summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/WeeklySummaryData'
   *       500:
   *         description: Internal server error
   */
  router.get("/weekly-summary", controller.getWeeklySummary.bind(controller));

  /**
   * @swagger
   * /dashboard/todays-classes/{establishment_id}:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get today's classes
   *     description: Retrieve all classes scheduled for today with enrollment and status information
   *     parameters:
   *       - in: path
   *         name: establishment_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The establishment ID to get today's classes for
   *     responses:
   *       200:
   *         description: Today's classes retrieved successfully
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
   *                     $ref: '#/components/schemas/ClassScheduleItem'
   *                 meta:
   *                   type: object
   *                   properties:
   *                     date:
   *                       type: string
   *                       format: date
   *                     count:
   *                       type: integer
   *       500:
   *         description: Internal server error
   */
  router.get("/todays-classes", controller.getTodaysClasses.bind(controller));

  /**
   * @swagger
   * /dashboard/overview/{establishment_id}:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get complete dashboard overview
   *     description: Retrieve all dashboard data in a single request for initial page load
   *     parameters:
   *       - in: path
   *         name: establishment_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The establishment ID to get dashboard overview for
   *     responses:
   *       200:
   *         description: Dashboard overview retrieved successfully
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
   *                     stats:
   *                       $ref: '#/components/schemas/DashboardStats'
   *                     activities:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/RecentActivity'
   *                     weeklySummary:
   *                       $ref: '#/components/schemas/WeeklySummaryData'
   *                     todaysClasses:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ClassScheduleItem'
   *                     errors:
   *                       type: array
   *                       items:
   *                         type: string
   *                 meta:
   *                   type: object
   *                   properties:
   *                     fetchedAt:
   *                       type: string
   *                       format: date-time
   *                     hasErrors:
   *                       type: boolean
   *       500:
   *         description: Internal server error
   */
  router.get("/overview", controller.getDashboardOverview.bind(controller));

  /**
   * @swagger
   * /dashboard/health:
   *   get:
   *     tags: [Dashboard]
   *     summary: Dashboard health check
   *     description: Check if dashboard services are healthy
   *     responses:
   *       200:
   *         description: Dashboard services are healthy
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
   *                     status:
   *                       type: string
   *                       example: healthy
   *                     responseTime:
   *                       type: string
   *                       example: "45ms"
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *       503:
   *         description: Dashboard services are unhealthy
   */
  router.get("/health", controller.getHealth.bind(controller));

  return router;
};

export default createInstructorDashboardRoutes;
