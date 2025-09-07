import { Request, Response } from "express";
import { CohortsService } from "./cohorts.service.js";
import { LoggerService } from "../../services/LoggerService.js";
import {
  CreateCohortRequest,
  UpdateCohortRequest,
  AddStudentToCohortRequest,
  CohortFilters,
  GenerateSessionsForCohortRequest,
  COHORT_ERRORS,
} from "./cohorts.types.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  establishment?: {
    id: string;
    name: string;
  };
}

export class CohortsController {
  private db: any;

  constructor(
    private cohortsService: CohortsService,
    private logger: LoggerService,
    db?: any
  ) {
    this.db = db;
  }

  private getEstablishmentId(req: AuthenticatedRequest): string {
    const establishmentId = req.establishment?.id;
    if (!establishmentId) {
      throw new Error("Establishment ID is required");
    }
    return establishmentId;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      "unknown"
    );
  }

  private getRequiredParam(
    req: AuthenticatedRequest,
    paramName: string
  ): string {
    const value = req.params[paramName];
    if (!value) {
      throw new Error(`Required parameter '${paramName}' is missing`);
    }
    return value;
  }

  // BASIC CRUD OPERATIONS

  /**
   * List cohorts with filters
   * GET /cohorts
   */
  getCohorts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);

      const filters: CohortFilters = {
        instructorId: req.query.instructorId as string,
        templateId: req.query.templateId as string,
        isActive: req.query.isActive
          ? req.query.isActive === "true"
          : undefined,
        ageMin: req.query.ageGroup
          ? parseInt(req.query.ageGroup as string)
          : undefined,
        ageMax: req.query.ageGroup
          ? parseInt(req.query.ageGroup as string)
          : undefined,
        scheduleDays: req.query.scheduleDays
          ? (req.query.scheduleDays as string).split(",").map(Number)
          : undefined,
        termActive: req.query.termActive === "true" ? true : undefined,
        hasAvailableSpots: req.query.hasSpace === "true" ? true : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string)
          : undefined,
      };

      const result = await this.cohortsService.getCohorts(
        establishmentId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      this.logger.error("Error in getCohorts controller", {
        error,
        query: req.query,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Get single cohort with details
   * GET /cohorts/:id
   */
  getCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const id = this.getRequiredParam(req, "id");

      const result = await this.cohortsService.getCohort(establishmentId, id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getCohort controller", {
        error,
        cohortId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Create new cohort
   * POST /cohorts
   */
  createCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const userId = req.user?.id || "";

      const cohortRequest: CreateCohortRequest = req.body;

      this.logger.info("Creating cohort via API", {
        establishmentId,
        cohortName: cohortRequest.name,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.cohortsService.createCohort(
        establishmentId,
        cohortRequest,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        // Map specific error codes to HTTP status codes
        let statusCode = 400;
        if (result.error?.code === COHORT_ERRORS.INSTRUCTOR_NOT_AVAILABLE) {
          statusCode = 409; // Conflict
        } else if (result.error?.code === COHORT_ERRORS.INVALID_TERM_DATES) {
          statusCode = 422; // Unprocessable Entity
        }

        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.logger.error("Error in createCohort controller", {
        error,
        body: req.body,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Update cohort
   * PUT /cohorts/:id
   */
  updateCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const id = this.getRequiredParam(req, "id");
      const userId = req.user?.id || "";

      // Check if user is manager
      if (req.user?.role !== "manager" && req.user?.role !== "admin") {
        res.status(403).json({
          success: false,
          message: "Only managers can update cohorts",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only managers can update cohorts",
          },
        });
        return;
      }

      const updates: UpdateCohortRequest = req.body;

      this.logger.info("Updating cohort via API", {
        establishmentId,
        cohortId: id,
        userId,
        updates: Object.keys(updates),
        ip: this.getClientIp(req),
      });

      // For now, use repository method directly - can be enhanced with service layer validation
      const cohort = await this.cohortsService[
        "cohortsRepository"
      ].updateCohort(establishmentId, id, updates);

      if (cohort) {
        res.status(200).json({
          success: true,
          data: cohort,
          message: "Cohort updated successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Cohort not found",
          error: {
            code: COHORT_ERRORS.COHORT_NOT_FOUND,
            message: "Cohort not found",
          },
        });
      }
    } catch (error) {
      this.logger.error("Error in updateCohort controller", {
        error,
        cohortId: req.params.id,
        body: req.body,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Soft delete cohort
   * DELETE /cohorts/:id
   */
  deleteCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const id = this.getRequiredParam(req, "id");
      const userId = req.user?.id || "";

      // Check if user is manager
      if (req.user?.role !== "manager" && req.user?.role !== "admin") {
        res.status(403).json({
          success: false,
          message: "Only managers can delete cohorts",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only managers can delete cohorts",
          },
        });
        return;
      }

      this.logger.info("Deleting cohort via API", {
        establishmentId,
        cohortId: id,
        userId,
        ip: this.getClientIp(req),
      });

      const deleted = await this.cohortsService[
        "cohortsRepository"
      ].deleteCohort(establishmentId, id);

      if (deleted) {
        res.status(200).json({
          success: true,
          message: "Cohort deleted successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Cohort not found",
          error: {
            code: COHORT_ERRORS.COHORT_NOT_FOUND,
            message: "Cohort not found",
          },
        });
      }
    } catch (error) {
      this.logger.error("Error in deleteCohort controller", {
        error,
        cohortId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Get cohort enrollment statistics
   * GET /cohorts/:id/stats
   */
  getCohortStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const id = this.getRequiredParam(req, "id");

      const result = await this.cohortsService.getCohortStats(
        establishmentId,
        id
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getCohortStats controller", {
        error,
        cohortId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  // MEMBERSHIP MANAGEMENT

  /**
   * List cohort members
   * GET /cohorts/:id/members
   */
  getCohortMembers = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");

      const filters = {
        cohortId,
        isActive: req.query.isActive ? req.query.isActive === "true" : true,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string)
          : undefined,
      };

      const { memberships, total } = await this.cohortsService[
        "cohortsRepository"
      ].getCohortMemberships(establishmentId, filters);

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: memberships,
        pagination: { total, page, limit, totalPages },
      });
    } catch (error) {
      this.logger.error("Error in getCohortMembers controller", {
        error,
        cohortId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Add single student to cohort
   * POST /cohorts/:id/members
   */
  addStudentToCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");
      const userId = req.user?.id || "";

      // Check permissions - managers and instructors can add students
      if (!["manager", "admin", "instructor"].includes(req.user?.role || "")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to add students",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Insufficient permissions to add students",
          },
        });
        return;
      }

      const request: AddStudentToCohortRequest = req.body;

      this.logger.info("Adding student to cohort via API", {
        establishmentId,
        cohortId,
        studentId: request.studentId,
        userId,
        ip: this.getClientIp(req),
      });

      const membership = await this.cohortsService[
        "cohortsRepository"
      ].addStudentToCohort(establishmentId, cohortId, request);

      // Enroll in future sessions
      await this.cohortsService["enrollInFutureSessions"](
        establishmentId,
        cohortId,
        request.studentId
      );

      res.status(201).json({
        success: true,
        data: membership,
        message: "Student added to cohort successfully",
      });
    } catch (error) {
      this.logger.error("Error in addStudentToCohort controller", {
        error,
        cohortId: req.params.id,
        body: req.body,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      // Map error messages to appropriate HTTP status codes
      let statusCode = 400;
      let errorCode = "MEMBERSHIP_CREATION_FAILED";

      if (error instanceof Error) {
        if (error.message.includes("already enrolled")) {
          statusCode = 409;
          errorCode = COHORT_ERRORS.STUDENT_ALREADY_ENROLLED;
        } else if (error.message.includes("full capacity")) {
          statusCode = 422;
          errorCode = COHORT_ERRORS.COHORT_FULL;
        } else if (error.message.includes("not found")) {
          statusCode = 404;
          errorCode = COHORT_ERRORS.COHORT_NOT_FOUND;
        }
      }

      res.status(statusCode).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to add student to cohort",
        error: {
          code: errorCode,
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Bulk enroll students in cohort
   * POST /cohorts/:id/members/bulk
   */
  bulkEnrollStudents = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");
      const userId = req.user?.id || "";

      // Check permissions - only managers can bulk enroll
      if (req.user?.role !== "manager" && req.user?.role !== "admin") {
        res.status(403).json({
          success: false,
          message: "Only managers can bulk enroll students",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only managers can bulk enroll students",
          },
        });
        return;
      }

      const {
        studentIds,
        paymentType,
        enrollInExistingSessions = true,
      } = req.body;

      if (
        !studentIds ||
        !Array.isArray(studentIds) ||
        studentIds.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "Student IDs array is required",
          error: {
            code: "INVALID_INPUT",
            message: "Student IDs array is required",
          },
        });
        return;
      }

      this.logger.info("Bulk enrolling students in cohort via API", {
        establishmentId,
        cohortId,
        studentCount: studentIds.length,
        paymentType,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.cohortsService.bulkEnrollStudents(
        establishmentId,
        cohortId,
        studentIds,
        paymentType,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in bulkEnrollStudents controller", {
        error,
        cohortId: req.params.id,
        body: req.body,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Remove student from cohort
   * DELETE /cohorts/:id/members/:studentId
   */
  removeStudentFromCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");
      const studentId = this.getRequiredParam(req, "studentId");
      const userId = req.user?.id || "";

      // Check permissions - managers and instructors can remove students
      if (!["manager", "admin", "instructor"].includes(req.user?.role || "")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to remove students",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Insufficient permissions to remove students",
          },
        });
        return;
      }

      const {
        removeFromFutureSessions = true,
        effectiveDate,
        notes,
      } = req.query;

      this.logger.info("Removing student from cohort via API", {
        establishmentId,
        cohortId,
        studentId,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.cohortsService.handleStudentDeparture(
        establishmentId,
        cohortId,
        studentId,
        {
          removeFromFutureSessions: removeFromFutureSessions === "true",
          effectiveDate: effectiveDate as string,
          notes: notes as string,
        },
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode =
          result.error?.code === COHORT_ERRORS.STUDENT_NOT_ENROLLED ? 404 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.logger.error("Error in removeStudentFromCohort controller", {
        error,
        cohortId: req.params.id,
        studentId: req.params.studentId,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  // SESSION OPERATIONS

  /**
   * Generate sessions for cohort
   * POST /cohorts/:id/generate-sessions
   */
  generateSessions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");
      const userId = req.user?.id || "";

      // Check permissions - only managers can generate sessions
      if (req.user?.role !== "manager" && req.user?.role !== "admin") {
        res.status(403).json({
          success: false,
          message: "Only managers can generate sessions",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only managers can generate sessions",
          },
        });
        return;
      }

      const options: GenerateSessionsForCohortRequest = req.body;

      this.logger.info("Generating sessions for cohort via API", {
        establishmentId,
        cohortId,
        userId,
        options,
        ip: this.getClientIp(req),
      });

      const result = await this.cohortsService.generateCohortSessions(
        establishmentId,
        cohortId,
        options,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode =
          result.error?.code === COHORT_ERRORS.COHORT_NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.logger.error("Error in generateSessions controller", {
        error,
        cohortId: req.params.id,
        body: req.body,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * View generated sessions for cohort
   * GET /cohorts/:id/sessions
   */
  getCohortSessions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");

      // Get sessions for this cohort
      const result = await this.db.query(
        `
        SELECT cs.*, ct.title as template_title,
               CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
               COALESCE(enrollment_count.count, 0) as enrollment_count
        FROM class_sessions cs
        LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
        LEFT JOIN users u ON COALESCE(cs.override_instructor_id, cs.instructor_id) = u.id
        LEFT JOIN (
          SELECT session_id, COUNT(*) as count
          FROM session_enrollments
          WHERE is_waitlist = false
          GROUP BY session_id
        ) enrollment_count ON cs.id = enrollment_count.session_id
        WHERE cs.cohort_id = $1 AND cs.establishment_id = $2
        ORDER BY cs.session_date ASC, cs.start_time ASC
      `,
        [cohortId, establishmentId]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
        message: "Sessions retrieved successfully",
      });
    } catch (error) {
      this.logger.error("Error in getCohortSessions controller", {
        error,
        cohortId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Clone cohort for new term
   * POST /cohorts/:id/clone
   */
  cloneCohort = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");
      const userId = req.user?.id || "";

      // Check permissions - only managers can clone cohorts
      if (req.user?.role !== "manager" && req.user?.role !== "admin") {
        res.status(403).json({
          success: false,
          message: "Only managers can clone cohorts",
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only managers can clone cohorts",
          },
        });
        return;
      }

      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: "Start date and end date are required",
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Start date and end date are required",
          },
        });
        return;
      }

      this.logger.info("Cloning cohort via API", {
        establishmentId,
        cohortId,
        newTermDates: { startDate, endDate },
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.cohortsService.cloneCohort(
        establishmentId,
        cohortId,
        { startDate, endDate },
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode =
          result.error?.code === COHORT_ERRORS.COHORT_NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.logger.error("Error in cloneCohort controller", {
        error,
        cohortId: req.params.id,
        body: req.body,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  // UTILITY ENDPOINTS

  /**
   * Check instructor availability
   * GET /cohorts/check-availability
   */
  checkAvailability = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const {
        instructorId,
        scheduleDays,
        startTime,
        durationMinutes,
        termStart,
        termEnd,
      } = req.query;

      if (
        !instructorId ||
        !scheduleDays ||
        !startTime ||
        !durationMinutes ||
        !termStart ||
        !termEnd
      ) {
        res.status(400).json({
          success: false,
          message:
            "All parameters required: instructorId, scheduleDays, startTime, durationMinutes, termStart, termEnd",
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Missing required query parameters",
          },
        });
        return;
      }

      const days = (scheduleDays as string).split(",").map(Number);

      const availability = await this.cohortsService[
        "checkInstructorAvailability"
      ](
        establishmentId,
        instructorId as string,
        days,
        startTime as string,
        parseInt(durationMinutes as string),
        termStart as string,
        termEnd as string
      );

      res.status(200).json({
        success: true,
        data: availability,
        message: availability.isAvailable
          ? "Instructor is available"
          : `Instructor not available: ${availability.reason}`,
      });
    } catch (error) {
      this.logger.error("Error in checkAvailability controller", {
        error,
        query: req.query,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Get next class date for cohort
   * GET /cohorts/:id/upcoming-session
   */
  getUpcomingSession = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const cohortId = this.getRequiredParam(req, "cohortId");

      const today = new Date().toISOString().split("T")[0];

      const result = await this.db.query(
        `
        SELECT cs.*, ct.title as template_title,
               CONCAT(u.first_name, ' ', u.last_name) as instructor_name
        FROM class_sessions cs
        LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
        LEFT JOIN users u ON COALESCE(cs.override_instructor_id, cs.instructor_id) = u.id
        WHERE cs.cohort_id = $1 
          AND cs.establishment_id = $2 
          AND cs.session_date >= $3
          AND cs.status = 'scheduled'
        ORDER BY cs.session_date ASC, cs.start_time ASC
        LIMIT 1
      `,
        [cohortId, establishmentId, today]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "No upcoming sessions found",
          error: {
            code: "NO_UPCOMING_SESSIONS",
            message: "No upcoming sessions found",
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.rows[0],
        message: "Upcoming session retrieved successfully",
      });
    } catch (error) {
      this.logger.error("Error in getUpcomingSession controller", {
        error,
        cohortId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };

  /**
   * Get student's enrolled cohorts
   * GET /students/:id/cohorts
   */
  getStudentCohorts = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const studentId = this.getRequiredParam(req, "studentId");

      const filters = {
        studentId,
        isActive: req.query.includeInactive !== "true",
      };

      const { memberships } = await this.cohortsService[
        "cohortsRepository"
      ].getCohortMemberships(establishmentId, filters);

      res.status(200).json({
        success: true,
        data: memberships,
        message: "Student cohorts retrieved successfully",
      });
    } catch (error) {
      this.logger.error("Error in getStudentCohorts controller", {
        error,
        studentId: req.params.id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  };
}
