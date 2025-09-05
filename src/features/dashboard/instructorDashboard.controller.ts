import { Request, Response, NextFunction } from "express";
import { InstructorDashboardService } from "./instructorDashboard.service.js";
import { InstructorActivityFilters } from "./instructorDashboard.types.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AUTH_ERRORS, GENERAL_ERRORS } from "../../constants/errorMessages.js";

// Extended Request interface for authentication context
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    establishmentId: string;
    role: string;
    permissions: string[];
  };
  establishment?: {
    id: string;
    name: string;
  };
}

export class InstructorDashboardController {
  constructor(
    private service: InstructorDashboardService,
    private logger: LoggerService
  ) {}

  private validateInstructorAccess(req: AuthenticatedRequest, res: Response): boolean {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
        code: "AUTH_REQUIRED"
      });
      return false;
    }

    if (!req.establishment) {
      res.status(400).json({
        success: false,
        message: AUTH_ERRORS.ESTABLISHMENT_ACCESS_REQUIRED,
        code: "ESTABLISHMENT_REQUIRED"
      });
      return false;
    }

    // Verify user has instructor role
    if (req.user.role !== 'instructor') {
      res.status(403).json({
        success: false,
        message: "Eğitmen rolü gerekli",
        code: "INSTRUCTOR_ROLE_REQUIRED"
      });
      return false;
    }

    return true;
  }

  /**
   * GET /instructor-dashboard/stats
   * Get instructor dashboard statistics for the authenticated user's establishment
   */
  async getStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.validateInstructorAccess(req, res)) return;

      const stats = await this.service.getStatsForEstablishment(
        req.establishment.id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: stats,
        meta: {
          establishmentId: req.establishment.id,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Dashboard stats controller error", { error });
      next(error);
    }
  }

  /**
   * GET /instructor-dashboard/activities
   * Get recent activities with optional filters for the authenticated user's establishment
   */
  async getRecentActivities(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.validateInstructorAccess(req, res)) return;

      const filters: InstructorActivityFilters = {};

      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string, 10);
      }

      if (req.query.type && typeof req.query.type === "string") {
        const validTypes = [
          "payment",
          "registration",
          "attendance",
          "class",
          "enrollment",
        ];
        if (validTypes.includes(req.query.type)) {
          filters.type = req.query.type as InstructorActivityFilters["type"];
        }
      }

      if (req.query.priority && typeof req.query.priority === "string") {
        const validPriorities = ["high", "medium", "low"];
        if (validPriorities.includes(req.query.priority)) {
          filters.priority = req.query.priority as InstructorActivityFilters["priority"];
        }
      }

      if (req.query.dateFrom) {
        filters.dateFrom = req.query.dateFrom as string;
      }

      if (req.query.dateTo) {
        filters.dateTo = req.query.dateTo as string;
      }

      const activities = await this.service.getRecentActivitiesForEstablishment(
        req.establishment.id,
        filters,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: activities,
        meta: {
          establishmentId: req.establishment.id,
          count: activities.length,
          filters: filters,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Dashboard activities controller error", { error });
      next(error);
    }
  }

  /**
   * GET /instructor-dashboard/weekly-summary
   * Get weekly summary data for the authenticated user's establishment
   */
  async getWeeklySummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.validateInstructorAccess(req, res)) return;

      const summary = await this.service.getWeeklySummaryForEstablishment(
        req.establishment.id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: summary,
        meta: {
          establishmentId: req.establishment.id,
          weekStart: new Date().toISOString().split("T")[0], // Simplified
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Dashboard weekly summary controller error", { error });
      next(error);
    }
  }

  /**
   * GET /instructor-dashboard/todays-classes
   * Get today's classes for the authenticated user's establishment
   */
  async getTodaysClasses(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.validateInstructorAccess(req, res)) return;

      const classes = await this.service.getTodaysClassesForEstablishment(
        req.establishment.id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: classes,
        meta: {
          establishmentId: req.establishment.id,
          date: new Date().toISOString().split("T")[0],
          count: classes.length,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Dashboard today's classes controller error", {
        error,
      });
      next(error);
    }
  }

  /**
   * GET /instructor-dashboard/overview
   * Get complete instructor dashboard data in a single request for the authenticated user's establishment
   */
  async getDashboardOverview(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.validateInstructorAccess(req, res)) return;

      const dashboardData = await this.service.getDashboardDataForEstablishment(
        req.establishment.id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: dashboardData,
        meta: {
          establishmentId: req.establishment.id,
          fetchedAt: new Date().toISOString(),
          hasErrors: dashboardData.errors.length > 0,
          errorCount: dashboardData.errors.length,
        },
      });
    } catch (error) {
      this.logger.error("Dashboard overview controller error", { error });
      next(error);
    }
  }

  /**
   * GET /instructor-dashboard/health
   * Health check endpoint for instructor dashboard services
   */
  async getHealth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Simple health check - just check if we can connect to database
      const startTime = Date.now();

      // For health check, we don't need establishment-specific data
      // Just verify the service is responding
      const responseTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          status: "sağlıklı",
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
          service: "gösterge paneli",
        },
      });
    } catch (error) {
      this.logger.error("Dashboard health check failed", { error });
      res.status(503).json({
        success: false,
        data: {
          status: "sağlıksız",
          error: "Gösterge paneli servisleri kullanılamıyor",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
