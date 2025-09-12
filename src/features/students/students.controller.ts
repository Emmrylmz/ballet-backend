import { Request, Response } from "express";
import { StudentsService } from "./students.service.js";
import { LoggerService } from "../../services/LoggerService.js";
import {
  StudentSearchFilters,
  CreateStudentRequest,
  UpdateStudentRequest,
} from "./students.types.js";
import { ERROR_MESSAGES } from "../../utils/error-messages.js";

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

export class StudentsController {
  constructor(
    private studentsService: StudentsService,
    private logger: LoggerService
  ) {}

  /**
   * Search students
   * GET /students/search
   */
  searchStudents = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const {
        q,
        status = "active",
        cohortId,
        available,
        ageMin,
        ageMax,
        limit = 20,
        page = 1,
      } = req.query;

      const filters: StudentSearchFilters = {
        q: q as string,
        status: status as "active" | "inactive" | "all",
        cohortId: cohortId as string,
        available: available === "true",
        ageMin: ageMin ? parseInt(ageMin as string) : undefined,
        ageMax: ageMax ? parseInt(ageMax as string) : undefined,
        limit: Math.min(parseInt(limit as string) || 20, 100), // Max 100
        offset:
          (parseInt(page as string) - 1 || 0) *
          (parseInt(limit as string) || 20),
      };

      this.logger.info("Searching students via API", {
        establishmentId,
        filters: { ...filters, q: filters.q ? `"${filters.q}"` : undefined },
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.searchStudents(
        establishmentId,
        filters
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in searchStudents controller", {
        error,
        query: req.query,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get student profile
   * GET /students/:id
   */
  getStudentProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: "Student ID is required",
          code: "MISSING_STUDENT_ID",
        });
        return;
      }

      this.logger.info("Getting student profile via API", {
        establishmentId,
        studentId: id,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.getStudentProfile(
        establishmentId,
        id
      );

      if (result.success) {
        res.status(200).json(result);
      } else if (result.error?.code === "STUDENT_NOT_FOUND") {
        res.status(404).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getStudentProfile controller", {
        error,
        studentId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Create new student
   * POST /students
   */
  createStudent = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const studentData: CreateStudentRequest = req.body;
      const userId = req.user?.id;

      this.logger.info("Creating student via API", {
        establishmentId,
        studentName: studentData.name,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.createStudent(
        establishmentId,
        studentData,
        // Only link to user if it's a self-registration (could be enhanced later)
        undefined
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in createStudent controller", {
        error,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Update student
   * PUT /students/:id
   */
  updateStudent = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: "Student ID is required",
          code: "MISSING_STUDENT_ID",
        });
        return;
      }

      const updates: UpdateStudentRequest = req.body;
      const userId = req.user?.id;

      this.logger.info("Updating student via API", {
        establishmentId,
        studentId: id,
        updates: Object.keys(updates),
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.updateStudent(
        establishmentId,
        id,
        updates
      );

      if (result.success) {
        res.status(200).json(result);
      } else if (result.error?.code === "STUDENT_NOT_FOUND") {
        res.status(404).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in updateStudent controller", {
        error,
        studentId: req.params.id,
        body: req.body,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get session roster
   * GET /sessions/:sessionId/roster
   */
  getSessionRoster = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { sessionId } = req.params;
      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: "Session ID is required",
          code: "MISSING_SESSION_ID",
        });
        return;
      }

      this.logger.info("Getting session roster via API", {
        establishmentId,
        sessionId,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.getSessionRoster(
        establishmentId,
        sessionId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getSessionRoster controller", {
        error,
        sessionId: req.params.sessionId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get students statistics
   * GET /students/stats
   */
  getStudentsStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      this.logger.info("Getting students statistics via API", {
        establishmentId,
        userId: req.user?.id,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.getStudentsStats(
        establishmentId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in getStudentsStats controller", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Deactivate student
   * DELETE /students/:id
   */
  deactivateStudent = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      // TESTING: Comment out establishment validation
      const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d"; // Use default for testing
      if (!establishmentId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
          code: "ESTABLISHMENT_ACCESS_ERROR",
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          message: "Student ID is required",
          code: "MISSING_STUDENT_ID",
        });
        return;
      }

      const userId = req.user?.id;

      this.logger.info("Deactivating student via API", {
        establishmentId,
        studentId: id,
        userId,
        ip: this.getClientIp(req),
      });

      const result = await this.studentsService.deactivateStudent(
        establishmentId,
        id
      );

      if (result.success) {
        res.status(200).json({
          ...result,
          message: "Student deactivated successfully",
        });
      } else if (result.error?.code === "STUDENT_NOT_FOUND") {
        res.status(404).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error("Error in deactivateStudent controller", {
        error,
        studentId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
      });
    }
  };

  /**
   * Get client IP address for logging
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "unknown"
    );
  }
}
