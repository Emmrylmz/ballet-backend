import { Request, Response, NextFunction } from "express";
import { ClassesService } from "./classes.service.js";
import { LoggerService } from "../../services/LoggerService.js";
import {
  CreateClassTemplateRequest,
  UpdateClassTemplateRequest,
  ClassTemplateFilters,
  CreateClassSessionRequest,
  UpdateClassSessionRequest,
  ClassSessionFilters,
  GenerateSessionsRequest,
  EnrollStudentRequest,
} from "./classes.types.js";

interface Establishment {
  id: string;
  name: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    establishments?: Establishment[];
  };
  establishment?: {
    id: string;
    name: string;
    userRole: string; // User's role in this establishment
  };
}

export class ClassesController {
  constructor(
    private classesService: ClassesService,
    private logger: LoggerService
  ) {}

  private getEstablishmentId(req: AuthenticatedRequest): string {
    const establishmentId = req.establishment?.id;
    if (!establishmentId) {
      throw new Error("Establishment ID is required");
    }
    return establishmentId;
  }

  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      "unknown"
    );
  }


  // CLASS TEMPLATE CONTROLLERS

  /**
   * Create class template
   * POST /classes/templates
   */
  createTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = this.getEstablishmentId(req);
      const templateRequest: CreateClassTemplateRequest = req.body;
      const userId = req.user?.id || "";

      this.logger.info("Creating class template via API", {
        establishmentId,
        title: templateRequest.title,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.createClassTemplate(
        establishmentId,
        templateRequest,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in createTemplate controller", {
        error,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get class template by ID
   * GET /classes/templates/:id
   */
  getTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Establishment context required",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;

      const result = await this.classesService.getClassTemplate(
        establishmentId,
        id
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getTemplate controller", {
        error,
        templateId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get all class templates with filters
   * GET /classes/templates
   */
  getTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const filters: ClassTemplateFilters = {
        classType: req.query.classType as any,
        skillLevel: req.query.skillLevel as any,
        instructorId: req.query.instructorId as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.classesService.getClassTemplates(
        establishmentId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      this.logger.error("Error in getTemplates controller", {
        error,
        filters: req.query,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Update class template
   * PUT /classes/templates/:id
   */
  updateTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      const updates: UpdateClassTemplateRequest = req.body;
      const userId = req.user?.id || "";

      this.logger.info("Updating class template via API", {
        establishmentId,
        templateId: id,
        userId,
        updates: Object.keys(updates),
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.updateClassTemplate(
        establishmentId,
        id,
        updates,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in updateTemplate controller", {
        error,
        templateId: req.params.id,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Delete class template
   * DELETE /classes/templates/:id
   */
  deleteTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id || "";

      this.logger.info("Deleting class template via API", {
        establishmentId,
        templateId: id,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.deleteClassTemplate(
        establishmentId,
        id,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in deleteTemplate controller", {
        error,
        templateId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Generate sessions from template
   * POST /classes/templates/:id/generate-sessions
   */
  generateSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      const request: GenerateSessionsRequest = req.body;
      const userId = req.user?.id || "";

      this.logger.info("Generating sessions from template via API", {
        establishmentId,
        templateId: id,
        startDate: request.startDate,
        endDate: request.endDate,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.generateSessionsFromTemplate(
        establishmentId,
        id,
        request,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in generateSessions controller", {
        error,
        templateId: req.params.id,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // CLASS SESSION CONTROLLERS

  /**
   * Create class session
   * POST /classes/sessions
   */
  createSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const sessionRequest: CreateClassSessionRequest = req.body;
      const userId = req.user?.id || "";

      this.logger.info("Creating class session via API", {
        establishmentId,
        sessionDate: sessionRequest.sessionDate,
        classTemplateId: sessionRequest.classTemplateId,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.createClassSession(
        establishmentId,
        sessionRequest,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in createSession controller", {
        error,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get class session by ID
   * GET /classes/sessions/:id
   */
  getSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;

      const result = await this.classesService.getClassSession(
        establishmentId,
        id
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getSession controller", {
        error,
        sessionId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get all class sessions with filters
   * GET /classes/sessions
   */
  getSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const filters: ClassSessionFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        instructorId: req.query.instructorId as string,
        status: req.query.status as any,
        classTemplateId: req.query.classTemplateId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.classesService.getClassSessions(
        establishmentId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      this.logger.error("Error in getSessions controller", {
        error,
        filters: req.query,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get upcoming sessions
   * GET /classes/sessions/upcoming
   */
  getUpcomingSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const daysAhead = req.query.days ? parseInt(req.query.days as string) : 7;

      const result = await this.classesService.getUpcomingSessions(
        establishmentId,
        daysAhead
      );

      res.status(200).json(result);
    } catch (error) {
      this.logger.error("Error in getUpcomingSessions controller", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Update class session
   * PUT /classes/sessions/:id
   */
  updateSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      const updates: UpdateClassSessionRequest = req.body;
      const userId = req.user?.id || "";

      this.logger.info("Updating class session via API", {
        establishmentId,
        sessionId: id,
        userId,
        updates: Object.keys(updates),
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.updateClassSession(
        establishmentId,
        id,
        updates,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in updateSession controller", {
        error,
        sessionId: req.params.id,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Cancel class session
   * POST /classes/sessions/:id/cancel
   */
  cancelSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id || "";

      this.logger.info("Cancelling class session via API", {
        establishmentId,
        sessionId: id,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.cancelClassSession(
        establishmentId,
        id,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in cancelSession controller", {
        error,
        sessionId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // ENROLLMENT CONTROLLERS

  /**
   * Enroll students in session
   * POST /classes/sessions/:id/enroll
   */
  enrollStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      const request: EnrollStudentRequest = req.body;
      const userId = req.user?.id || "";

      this.logger.info("Enrolling students in session via API", {
        establishmentId,
        sessionId: id,
        studentCount: request.studentIds?.length || 0,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.enrollStudents(
        establishmentId,
        id,
        request,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in enrollStudents controller", {
        error,
        sessionId: req.params.id,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Remove student from session
   * DELETE /classes/sessions/:id/enroll/:studentId
   */
  removeStudent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id, studentId } = req.params;
      const userId = req.user?.id || "";

      this.logger.info("Removing student from session via API", {
        establishmentId,
        sessionId: id,
        studentId,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.classesService.removeStudentFromSession(
        establishmentId,
        id,
        studentId,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in removeStudent controller", {
        error,
        sessionId: req.params.id,
        studentId: req.params.studentId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get session enrollments
   * GET /classes/sessions/:id/enrollments
   */
  getSessionEnrollments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;

      const result = await this.classesService.getSessionEnrollments(
        establishmentId,
        id
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getSessionEnrollments controller", {
        error,
        sessionId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get student's enrolled sessions
   * GET /students/:studentId/enrolled-sessions
   */
  getStudentEnrolledSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { studentId } = req.params;
      const includeCompleted = req.query.includeCompleted === 'true';

      const result = await this.classesService.getStudentEnrolledSessions(
        establishmentId,
        studentId,
        includeCompleted
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getStudentEnrolledSessions controller", {
        error,
        studentId: req.params.studentId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  // STATISTICS AND REPORTING CONTROLLERS

  /**
   * Get class statistics
   * GET /classes/stats
   */
  getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const result = await this.classesService.getClassStats(
        establishmentId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getStats controller", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get calendar events
   * GET /classes/calendar
   */
  getCalendarEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const establishmentId = req.establishment?.id;
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: "Invalid establishment access",
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: "Start date and end date are required",
          code: "MISSING_DATE_RANGE",
        });
        return;
      }

      const result = await this.classesService.getCalendarEvents(
        establishmentId,
        startDate,
        endDate
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getCalendarEvents controller", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };
}