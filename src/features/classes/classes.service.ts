import { LoggerService } from "../../services/LoggerService.js";
import { ClassesRepository } from "./classes.repository.js";
import {
  ClassTemplate,
  CreateClassTemplateRequest,
  UpdateClassTemplateRequest,
  ClassTemplateFilters,
  ClassSession,
  CreateClassSessionRequest,
  UpdateClassSessionRequest,
  ClassSessionFilters,
  GenerateSessionsRequest,
  EnrollStudentRequest,
  EnrollStudentResponse,
  SessionEnrollment,
  StudentEnrolledSession,
  ClassStats,
  CalendarEvent,
  SessionValidation,
  EnrollmentValidation,
  StudentPackage,
  ClassResponse,
  PaginatedClassResponse,
  SessionStatus,
  SessionType,
} from "./classes.types.js";
import { ERROR_MESSAGES } from "../../utils/error-messages.js";

// Error constants (should be moved to errorMessages.js)
const CLASS_ERRORS = {
  TEMPLATE_NOT_FOUND: "Template not found",
  SESSION_NOT_FOUND: "Session not found",
  SESSION_FULL: "Session is at full capacity",
  INSUFFICIENT_PACKAGE_CREDITS: "Insufficient package credits",
  DUPLICATE_ENROLLMENT: "Student is already enrolled in this session",
  CANNOT_CANCEL_PAST_SESSION: "Cannot cancel past session",
  INVALID_DATE_RANGE: "Invalid date range",
  INVALID_CAPACITY: "Capacity must be a positive integer",
  INVALID_DURATION: "Duration must be between 15 and 180 minutes",
  INVALID_PRICE: "Price must be non-negative",
  SESSION_IN_PAST: "Cannot create session in the past",
  TEMPLATE_INACTIVE: "Template is not active",
  STUDENT_NOT_FOUND: "Student not found",
  INSTRUCTOR_NOT_FOUND: "Instructor not found",
  ENROLLMENT_NOT_FOUND: "Enrollment not found",
  PACKAGE_EXPIRED: "Student package has expired",
};

export class ClassesService {
  constructor(
    private classesRepository: ClassesRepository,
    private logger: LoggerService
  ) {}

  // CLASS TEMPLATE METHODS

  /**
   * Create a new class template
   */
  async createClassTemplate(
    establishmentId: string,
    template: CreateClassTemplateRequest,
    userId: string
  ): Promise<ClassResponse<ClassTemplate>> {
    try {
      this.logger.info("Creating class template", {
        establishmentId,
        title: template.title,
        classType: template.classType,
        userId,
      });

      // Validate template data
      const validation = this.validateTemplateData(template);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors[0] || "",
          error: {
            code: "VALIDATION_ERROR",
            message: validation.errors[0] || "",
          },
        };
      }

      // Create template
      const createdTemplate = await this.classesRepository.createClassTemplate(
        establishmentId,
        template
      );

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Template created: ${template.title}`,
        `Class type: ${template.classType}, Skill level: ${template.skillLevel}`,
        undefined,
        undefined,
        userId,
        "medium"
      );

      return {
        success: true,
        data: createdTemplate,
        message: ERROR_MESSAGES.CLASS_TEMPLATE_CREATED_SUCCESSFULLY,
      };
    } catch (error) {
      console.log(error, "debug");
      this.logger.error("Failed to create class template", {
        error,
        establishmentId,
      });
      return {
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_CREATE_CLASS_TEMPLATE,
        error: {
          code: "CREATE_TEMPLATE_ERROR",
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        },
      };
    }
  }

  /**
   * Get class template by ID
   */
  async getClassTemplate(
    establishmentId: string,
    templateId: string
  ): Promise<ClassResponse<ClassTemplate>> {
    try {
      const template = await this.classesRepository.getClassTemplate(
        establishmentId,
        templateId
      );

      if (!template) {
        return {
          success: false,
          message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          },
        };
      }

      return {
        success: true,
        data: template,
        message: ERROR_MESSAGES.CLASS_TEMPLATE_RETRIEVED_SUCCESSFULLY,
      };
    } catch (error) {
      this.logger.error("Failed to get class template", {
        error,
        establishmentId,
        templateId,
      });
      return {
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_GET_CLASS_TEMPLATE,
        error: {
          code: "GET_TEMPLATE_ERROR",
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        },
      };
    }
  }

  /**
   * Get all class templates with filters
   */
  async getClassTemplates(
    establishmentId: string,
    filters: ClassTemplateFilters = {}
  ): Promise<PaginatedClassResponse<ClassTemplate>> {
    try {
      const { templates, total } =
        await this.classesRepository.getClassTemplates(
          establishmentId,
          filters
        );

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: templates,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error("Failed to get class templates", {
        error,
        establishmentId,
      });
      return {
        success: false,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        error: {
          code: "GET_TEMPLATES_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Update class template
   */
  async updateClassTemplate(
    establishmentId: string,
    templateId: string,
    updates: UpdateClassTemplateRequest,
    userId: string
  ): Promise<ClassResponse<ClassTemplate>> {
    try {
      this.logger.info("Updating class template", {
        establishmentId,
        templateId,
        userId,
      });

      // Validate updates
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: ERROR_MESSAGES.NO_UPDATES_PROVIDED,
          error: {
            code: "NO_UPDATES",
            message: ERROR_MESSAGES.NO_UPDATES_PROVIDED,
          },
        };
      }

      // Validate update data
      const validation = this.validateTemplateUpdates(updates);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors[0] || "",
          error: {
            code: "VALIDATION_ERROR",
            message: validation.errors[0] || "",
          },
        };
      }

      const updatedTemplate = await this.classesRepository.updateClassTemplate(
        establishmentId,
        templateId,
        updates
      );

      if (!updatedTemplate) {
        return {
          success: false,
          message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          },
        };
      }

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Template updated: ${updatedTemplate.title}`,
        `Updates: ${Object.keys(updates).join(", ")}`,
        undefined,
        undefined,
        userId,
        "medium"
      );

      return {
        success: true,
        data: updatedTemplate,
        message: ERROR_MESSAGES.CLASS_TEMPLATE_UPDATED_SUCCESSFULLY,
      };
    } catch (error) {
      this.logger.error("Failed to update class template", {
        error,
        establishmentId,
        templateId,
      });
      return {
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_UPDATE_CLASS_TEMPLATE,
        error: {
          code: "UPDATE_TEMPLATE_ERROR",
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        },
      };
    }
  }

  /**
   * Delete (deactivate) class template
   */
  async deleteClassTemplate(
    establishmentId: string,
    templateId: string,
    userId: string
  ): Promise<ClassResponse<void>> {
    try {
      this.logger.info("Deleting class template", {
        establishmentId,
        templateId,
        userId,
      });

      // Get template before deletion for logging
      const template = await this.classesRepository.getClassTemplate(
        establishmentId,
        templateId
      );

      if (!template) {
        return {
          success: false,
          message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          },
        };
      }

      const deleted = await this.classesRepository.deleteClassTemplate(
        establishmentId,
        templateId
      );

      if (!deleted) {
        return {
          success: false,
          message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          },
        };
      }

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Template deleted: ${template.title}`,
        "Template has been deactivated",
        undefined,
        undefined,
        userId,
        "high"
      );

      // TODO: Optionally cancel future sessions based on this template
      // TODO: Send notifications to enrolled students

      return {
        success: true,
        message: "Class template deleted successfully",
      };
    } catch (error) {
      this.logger.error("Failed to delete class template", {
        error,
        establishmentId,
        templateId,
      });
      return {
        success: false,
        message: "Failed to delete class template",
        error: {
          code: "DELETE_TEMPLATE_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  // CLASS SESSION METHODS

  /**
   * Create multiple class sessions in bulk
   */
  async createBulkClassSessions(
    establishmentId: string,
    sessions: (CreateClassSessionRequest & {
      cohortId?: string;
      overrideInstructorId?: string;
      sessionType?: SessionType;
    })[],
    userId: string
  ): Promise<ClassResponse<ClassSession[]>> {
    try {
      this.logger.info("Creating bulk class sessions", {
        establishmentId,
        sessionCount: sessions.length,
        userId,
      });

      // Validate all sessions first
      for (const session of sessions) {
        const validation = await this.validateSessionData(
          establishmentId,
          session
        );
        if (!validation.isValid) {
          return {
            success: false,
            message: `Session validation failed: ${validation.errors[0]}`,
            error: {
              code: "VALIDATION_ERROR",
              message: validation.errors[0] || "",
            },
          };
        }
      }

      // Create sessions in bulk
      const createdSessions =
        await this.classesRepository.createBulkClassSessions(
          establishmentId,
          sessions
        );

      // Log activity for bulk creation
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Bulk created ${createdSessions.length} sessions`,
        `Created sessions for cohort or batch operation`,
        undefined,
        undefined,
        userId,
        "medium"
      );

      return {
        success: true,
        data: createdSessions,
        message: `Successfully created ${createdSessions.length} sessions`,
      };
    } catch (error) {
      this.logger.error("Failed to create bulk class sessions", {
        error,
        establishmentId,
      });
      return {
        success: false,
        message: "Failed to create bulk sessions",
        error: {
          code: "CREATE_BULK_SESSIONS_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Bulk enroll users in a session
   */
  async bulkEnrollUsersInSession(
    establishmentId: string,
    sessionId: string,
    userIds: string[],
    userId: string,
    isWaitlist: boolean = false
  ): Promise<ClassResponse<SessionEnrollment[]>> {
    try {
      this.logger.info("Bulk enrolling users in session", {
        establishmentId,
        sessionId,
        userCount: userIds.length,
        userId,
      });

      // Check if session exists
      const session = await this.classesRepository.getClassSession(
        establishmentId,
        sessionId
      );

      if (!session) {
        return {
          success: false,
          message: CLASS_ERRORS.SESSION_NOT_FOUND,
          error: {
            code: "SESSION_NOT_FOUND",
            message: CLASS_ERRORS.SESSION_NOT_FOUND,
          },
        };
      }

      // Perform bulk enrollment
      const enrollments = await this.classesRepository.bulkEnrollUsersInSession(
        establishmentId,
        sessionId,
        userIds,
        isWaitlist
      );

      // Log activity for bulk enrollment
      await this.classesRepository.logActivity(
        establishmentId,
        "enrollment",
        `Bulk enrolled ${enrollments.length} users`,
        `Session: ${session.sessionDate} at ${session.startTime}`,
        undefined,
        sessionId,
        userId,
        "medium"
      );

      return {
        success: true,
        data: enrollments,
        message: `Successfully enrolled ${enrollments.length} users`,
      };
    } catch (error) {
      this.logger.error("Failed to bulk enroll users", {
        error,
        establishmentId,
        sessionId,
      });
      return {
        success: false,
        message: "Failed to bulk enroll users",
        error: {
          code: "BULK_ENROLL_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Create a new class session
   */
  async createClassSession(
    establishmentId: string,
    session: CreateClassSessionRequest & {
      cohortId: string;
      override_instructor_id?: string;
      sessionType?: SessionType;
    },
    userId: string
  ): Promise<ClassResponse<ClassSession>> {
    try {
      this.logger.info("Creating class session for cohort", {
        establishmentId,
        sessionDate: session.sessionDate,
        cohortId: session.cohortId,
        userId,
      });

      // Get cohort information to derive session properties
      const cohort = await this.classesRepository.getCohort(establishmentId, session.cohortId);
      if (!cohort) {
        return {
          success: false,
          message: "Cohort not found",
          error: {
            code: "COHORT_NOT_FOUND",
            message: "Cohort not found",
          },
        };
      }

      // Get template information from cohort
      const template = await this.classesRepository.getClassTemplate(
        establishmentId,
        cohort.templateId
      );

      if (!template) {
        return {
          success: false,
          message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
          },
        };
      }

      // Build session object with cohort properties
      const sessionToCreate = {
        ...session,
        classTemplateId: cohort.templateId,
        instructorId: session.override_instructor_id || cohort.instructorId,
        capacity: cohort.maxStudents,
        // Calculate end time if not provided
        endTime: session.endTime || (() => {
          const startTime = new Date(`2000-01-01T${session.startTime}`);
          const endTime = new Date(
            startTime.getTime() + template.durationMinutes * 60000
          );
          return endTime.toTimeString().slice(0, 5);
        })(),
        cohortId: session.cohortId,
        overrideInstructorId: session.override_instructor_id || undefined,
        sessionType: session.sessionType || "regular",
      };

      // Validate session data
      const validation = await this.validateSessionData(
        establishmentId,
        sessionToCreate
      );
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors[0] || "",
          error: {
            code: "VALIDATION_ERROR",
            message: validation.errors[0] || "",
          },
        };
      }

      const createdSession = await this.classesRepository.createClassSession(
        establishmentId,
        sessionToCreate
      );

      // Auto-enroll all cohort members
      await this.autoEnrollCohortMembers(establishmentId, createdSession.id, session.cohortId, userId);

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Session created for cohort ${cohort.name}`,
        `Date: ${session.sessionDate}, Start time: ${session.startTime}`,
        undefined,
        createdSession.id,
        userId,
        "medium"
      );

      return {
        success: true,
        data: createdSession,
        message: "Class session created successfully",
      };
    } catch (error) {
      this.logger.error("Failed to create class session", {
        error,
        establishmentId,
      });
      return {
        success: false,
        message: "Failed to create class session",
        error: {
          code: "CREATE_SESSION_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Generate multiple sessions from template
   */
  async generateSessionsFromTemplate(
    establishmentId: string,
    templateId: string,
    request: GenerateSessionsRequest,
    userId: string
  ): Promise<ClassResponse<ClassSession[]>> {
    try {
      this.logger.info("Generating sessions from template", {
        establishmentId,
        templateId,
        startDate: request.startDate,
        endDate: request.endDate,
        userId,
      });

      // Get template
      const template = await this.classesRepository.getClassTemplate(
        establishmentId,
        templateId
      );

      if (!template || !template.isActive) {
        return {
          success: false,
          message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
          },
        };
      }

      // Generate sessions for each specified day of week in the date range
      const sessions: ClassSession[] = [];
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dayOfWeek = date.getDay();

        if (request.daysOfWeek.includes(dayOfWeek)) {
          const sessionDate = date.toISOString().split("T")[0];

          // Calculate end time if not provided
          let endTime = request.endTime;
          if (!endTime) {
            const startTime = new Date(`2000-01-01T${request.startTime}`);
            const calculatedEndTime = new Date(
              startTime.getTime() + template.durationMinutes * 60000
            );
            endTime = calculatedEndTime.toTimeString().slice(0, 5);
          }

          const sessionRequest: CreateClassSessionRequest & {
            cohortId: string;
            override_instructor_id?: string;
            sessionType?: SessionType;
          } = {
            classTemplateId: templateId,
            instructorId: request.instructorId || template.instructorId,
            sessionDate: sessionDate || "",
            startTime: request.startTime,
            endTime,
            capacity: request.capacity || template.capacity,
            isRecurring: false,
            cohortId: "temp-template-cohort", // Temporary fix for template-based sessions
            override_instructor_id: undefined,
            sessionType: "regular",
          };

          // TODO: This needs to be refactored to work without cohortId requirement
          // For now, skipping auto session creation from templates
          // const result = await this.createClassSession(
          //   establishmentId,
          //   sessionRequest,
          //   userId
          // );

          // if (result.success && result.data) {
          //   sessions.push(result.data);
          // }
        }
      }

      return {
        success: true,
        data: sessions,
        message: `Generated ${sessions.length} sessions successfully`,
      };
    } catch (error) {
      this.logger.error("Failed to generate sessions from template", {
        error,
        establishmentId,
        templateId,
      });
      return {
        success: false,
        message: "Failed to generate sessions",
        error: {
          code: "GENERATE_SESSIONS_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Get class session by ID
   */
  async getClassSession(
    establishmentId: string,
    sessionId: string
  ): Promise<ClassResponse<ClassSession>> {
    try {
      const session = await this.classesRepository.getClassSession(
        establishmentId,
        sessionId
      );

      if (!session) {
        return {
          success: false,
          message: CLASS_ERRORS.SESSION_NOT_FOUND,
          error: {
            code: "SESSION_NOT_FOUND",
            message: CLASS_ERRORS.SESSION_NOT_FOUND,
          },
        };
      }

      return {
        success: true,
        data: session,
        message: "Class session retrieved successfully",
      };
    } catch (error) {
      this.logger.error("Failed to get class session", {
        error,
        establishmentId,
        sessionId,
      });
      return {
        success: false,
        message: "Failed to get class session",
        error: { code: "GET_SESSION_ERROR", message: "Internal server error" },
      };
    }
  }

  /**
   * Get class sessions with filters (including cohort support)
   */
  async getClassSessions(
    establishmentId: string,
    filters: ClassSessionFilters & { cohortId?: string } = {}
  ): Promise<PaginatedClassResponse<ClassSession>> {
    try {
      const { sessions, total } = await this.classesRepository.getClassSessions(
        establishmentId,
        filters
      );
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: sessions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error("Failed to get class sessions", {
        error,
        establishmentId,
      });
      return {
        success: false,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        error: { code: "GET_SESSIONS_ERROR", message: "Internal server error" },
      };
    }
  }

  /**
   * Get upcoming sessions
   */
  async getUpcomingSessions(
    establishmentId: string,
    daysAhead: number = 7
  ): Promise<ClassResponse<ClassSession[]>> {
    try {
      const sessions = await this.classesRepository.getUpcomingSessions(
        establishmentId,
        daysAhead
      );

      return {
        success: true,
        data: sessions,
        message: `Retrieved ${sessions.length} upcoming sessions`,
      };
    } catch (error) {
      this.logger.error("Failed to get upcoming sessions", {
        error,
        establishmentId,
      });
      return {
        success: false,
        message: "Failed to get upcoming sessions",
        error: { code: "GET_UPCOMING_ERROR", message: "Internal server error" },
      };
    }
  }

  /**
   * Update class session
   */
  async updateClassSession(
    establishmentId: string,
    sessionId: string,
    updates: UpdateClassSessionRequest,
    userId: string
  ): Promise<ClassResponse<ClassSession>> {
    try {
      this.logger.info("Updating class session", {
        establishmentId,
        sessionId,
        userId,
      });
      const updatedSession = await this.classesRepository.updateClassSession(
        establishmentId,
        sessionId,
        updates
      );

      if (!updatedSession) {
        return {
          success: false,
          message: CLASS_ERRORS.SESSION_NOT_FOUND,
          error: {
            code: "SESSION_NOT_FOUND",
            message: CLASS_ERRORS.SESSION_NOT_FOUND,
          },
        };
      }

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Session updated for ${updatedSession.sessionDate}`,
        `Updates: ${Object.keys(updates).join(", ")}`,
        undefined,
        sessionId,
        userId,
        "medium"
      );

      return {
        success: true,
        data: updatedSession,
        message: "Class session updated successfully",
      };
    } catch (error) {
      this.logger.error("Failed to update class session", {
        error,
        establishmentId,
        sessionId,
      });
      return {
        success: false,
        message: "Failed to update class session",
        error: {
          code: "UPDATE_SESSION_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Cancel class session
   */
  async cancelClassSession(
    establishmentId: string,
    sessionId: string,
    userId: string
  ): Promise<ClassResponse<void>> {
    try {
      this.logger.info("Cancelling class session", {
        establishmentId,
        sessionId,
        userId,
      });
      // Get session to validate it exists and check date
      const session = await this.classesRepository.getClassSession(
        establishmentId,
        sessionId
      );

      if (!session) {
        return {
          success: false,
          message: CLASS_ERRORS.SESSION_NOT_FOUND,
          error: {
            code: "SESSION_NOT_FOUND",
            message: CLASS_ERRORS.SESSION_NOT_FOUND,
          },
        };
      }

      // Check if session is in the past
      const sessionDate = new Date(session.sessionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (sessionDate < today) {
        return {
          success: false,
          message: CLASS_ERRORS.CANNOT_CANCEL_PAST_SESSION,
          error: {
            code: "CANNOT_CANCEL_PAST_SESSION",
            message: CLASS_ERRORS.CANNOT_CANCEL_PAST_SESSION,
          },
        };
      }

      // Update session status to cancelled
      const updatedSession = await this.classesRepository.updateClassSession(
        establishmentId,
        sessionId,
        { status: "cancelled" as SessionStatus }
      );

      if (!updatedSession) {
        return {
          success: false,
          message: "Failed to cancel session",
          error: {
            code: "CANCEL_SESSION_ERROR",
            message: "Failed to cancel session",
          },
        };
      }

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Session cancelled for ${session.sessionDate}`,
        "Session has been cancelled",
        undefined,
        sessionId,
        userId,
        "high"
      );

      // TODO: Send notifications to enrolled students
      // TODO: Process refunds if applicable

      return {
        success: true,
        message: "Class session cancelled successfully",
      };
    } catch (error) {
      this.logger.error("Failed to cancel class session", {
        error,
        establishmentId,
        sessionId,
      });
      return {
        success: false,
        message: "Failed to cancel class session",
        error: {
          code: "CANCEL_SESSION_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  // ENROLLMENT METHODS

  /**
   * Enroll students in a session
   */
  async enrollStudents(
    establishmentId: string,
    sessionId: string,
    request: EnrollStudentRequest,
    userId: string
  ): Promise<EnrollStudentResponse> {
    try {
      this.logger.info("Enrolling students in session", {
        establishmentId,
        sessionId,
        studentIds: request.studentIds,
        userId,
      });

      // Get session details
      const session = await this.classesRepository.getClassSession(
        establishmentId,
        sessionId
      );

      if (!session) {
        return {
          success: false,
          enrollments: [],
          message: CLASS_ERRORS.SESSION_NOT_FOUND,
        };
      }

      const enrollments: EnrollStudentResponse["enrollments"] = [];
      let successCount = 0;

      for (const studentId of request.studentIds) {
        try {
          // Check if student is already enrolled
          const isEnrolled = await this.classesRepository.isStudentEnrolled(
            establishmentId,
            sessionId,
            studentId
          );

          if (isEnrolled) {
            enrollments.push({
              studentId,
              studentName: "Unknown", // TODO: Get student name
              enrolled: false,
              waitlisted: false,
              error: CLASS_ERRORS.DUPLICATE_ENROLLMENT,
            });
            continue;
          }

          // Validate enrollment
          const validation = await this.validateStudentEnrollment(
            establishmentId,
            sessionId,
            studentId,
            request.usePackageCredits
          );

          if (!validation.canEnroll) {
            enrollments.push({
              studentId,
              studentName: "Unknown", // TODO: Get student name
              enrolled: false,
              waitlisted: false,
              error: validation.reason || "Cannot enroll student",
            });
            continue;
          }

          // Determine if student should be waitlisted
          const availableSpots = session.capacity - session.enrollmentCount;
          const isWaitlist = availableSpots <= 0;

          // Enroll student
          const enrollment = await this.classesRepository.enrollStudent(
            establishmentId,
            sessionId,
            studentId,
            isWaitlist
          );

          // Deduct package credit if applicable
          let packageDeducted = false;
          if (
            request.usePackageCredits &&
            validation.hasValidPackage &&
            !isWaitlist
          ) {
            const studentPackage =
              await this.classesRepository.getActiveStudentPackage(
                establishmentId,
                studentId
              );

            if (studentPackage) {
              packageDeducted =
                await this.classesRepository.deductPackageCredit(
                  establishmentId,
                  studentPackage.id
                );

              if (packageDeducted) {
                await this.classesRepository.logActivity(
                  establishmentId,
                  "class",
                  `Package credit deducted`,
                  `Session: ${session.sessionDate}`,
                  studentId,
                  sessionId,
                  userId,
                  "low"
                );
              }
            }
          }

          enrollments.push({
            studentId,
            studentName: enrollment.studentName,
            enrolled: !isWaitlist,
            waitlisted: isWaitlist,
            packageDeducted,
          });

          if (!isWaitlist) {
            successCount++;
          }

          // Log activity
          await this.classesRepository.logActivity(
            establishmentId,
            "class",
            `Student enrolled in session`,
            `${isWaitlist ? "Added to waitlist" : "Enrolled"} for ${
              session.sessionDate
            }`,
            studentId,
            sessionId,
            userId,
            "medium"
          );

          // TODO: Send enrollment notification to student if requested
        } catch (error) {
          this.logger.error("Failed to enroll individual student", {
            error,
            studentId,
            sessionId,
          });

          enrollments.push({
            studentId,
            studentName: "Unknown",
            enrolled: false,
            waitlisted: false,
            error: "Failed to enroll student",
          });
        }
      }

      return {
        success: successCount > 0,
        enrollments,
        message: `Successfully enrolled ${successCount} out of ${request.studentIds.length} students`,
      };
    } catch (error) {
      this.logger.error("Failed to enroll students", {
        error,
        establishmentId,
        sessionId,
      });
      return {
        success: false,
        enrollments: [],
        message: "Failed to enroll students",
      };
    }
  }

  /**
   * Remove student from session
   */
  async removeStudentFromSession(
    establishmentId: string,
    sessionId: string,
    studentId: string,
    userId: string
  ): Promise<ClassResponse<void>> {
    try {
      this.logger.info("Removing student from session", {
        establishmentId,
        sessionId,
        studentId,
        userId,
      });

      const removed = await this.classesRepository.removeStudentFromSession(
        establishmentId,
        sessionId,
        studentId
      );

      if (!removed) {
        return {
          success: false,
          message: CLASS_ERRORS.ENROLLMENT_NOT_FOUND,
          error: {
            code: "ENROLLMENT_NOT_FOUND",
            message: CLASS_ERRORS.ENROLLMENT_NOT_FOUND,
          },
        };
      }

      // Log activity
      await this.classesRepository.logActivity(
        establishmentId,
        "class",
        `Student removed from session`,
        `Removed from session on ${new Date().toISOString().split("T")[0]}`,
        studentId,
        sessionId,
        userId,
        "medium"
      );

      // TODO: Process refund if applicable
      // TODO: Move waitlisted student to enrolled if space available

      return {
        success: true,
        message: "Student removed from session successfully",
      };
    } catch (error) {
      this.logger.error("Failed to remove student from session", {
        error,
        establishmentId,
        sessionId,
        studentId,
      });
      return {
        success: false,
        message: "Failed to remove student from session",
        error: {
          code: "REMOVE_STUDENT_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Get session enrollments
   */
  async getSessionEnrollments(
    establishmentId: string,
    sessionId: string
  ): Promise<ClassResponse<SessionEnrollment[]>> {
    try {
      const enrollments = await this.classesRepository.getSessionEnrollments(
        establishmentId,
        sessionId
      );

      return {
        success: true,
        data: enrollments,
        message: `Retrieved ${enrollments.length} enrollments`,
      };
    } catch (error) {
      this.logger.error("Failed to get session enrollments", {
        error,
        establishmentId,
        sessionId,
      });
      return {
        success: false,
        message: "Failed to get session enrollments",
        error: {
          code: "GET_ENROLLMENTS_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  /**
   * Get student's enrolled sessions
   */
  async getStudentEnrolledSessions(
    establishmentId: string,
    studentId: string,
    includeCompleted: boolean = false
  ): Promise<ClassResponse<StudentEnrolledSession[]>> {
    try {
      const sessions = await this.classesRepository.getStudentEnrolledSessions(
        establishmentId,
        studentId,
        includeCompleted
      );

      return {
        success: true,
        data: sessions,
        message: `Retrieved ${sessions.length} enrolled sessions`,
      };
    } catch (error) {
      this.logger.error("Failed to get student enrolled sessions", {
        error,
        establishmentId,
        studentId,
      });
      return {
        success: false,
        message: "Failed to get student enrolled sessions",
        error: {
          code: "GET_STUDENT_SESSIONS_ERROR",
          message: "Internal server error",
        },
      };
    }
  }

  // STATISTICS AND REPORTING

  /**
   * Get class statistics
   */
  async getClassStats(
    establishmentId: string
  ): Promise<ClassResponse<ClassStats>> {
    try {
      const stats = await this.classesRepository.getClassStats(establishmentId);

      return {
        success: true,
        data: stats,
        message: "Class statistics retrieved successfully",
      };
    } catch (error) {
      this.logger.error("Failed to get class statistics", {
        error,
        establishmentId,
      });
      return {
        success: false,
        message: "Failed to get class statistics",
        error: { code: "GET_STATS_ERROR", message: "Internal server error" },
      };
    }
  }

  /**
   * Get calendar events
   */
  async getCalendarEvents(
    establishmentId: string,
    startDate: string,
    endDate: string
  ): Promise<ClassResponse<CalendarEvent[]>> {
    try {
      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        return {
          success: false,
          message: CLASS_ERRORS.INVALID_DATE_RANGE,
          error: {
            code: "INVALID_DATE_RANGE",
            message: CLASS_ERRORS.INVALID_DATE_RANGE,
          },
        };
      }

      const events = await this.classesRepository.getCalendarEvents(
        establishmentId,
        startDate,
        endDate
      );

      return {
        success: true,
        data: events,
        message: `Retrieved ${events.length} calendar events`,
      };
    } catch (error) {
      this.logger.error("Failed to get calendar events", {
        error,
        establishmentId,
      });
      return {
        success: false,
        message: "Failed to get calendar events",
        error: { code: "GET_CALENDAR_ERROR", message: "Internal server error" },
      };
    }
  }

  // PRIVATE VALIDATION METHODS

  /**
   * Validate template data
   */
  private validateTemplateData(
    template: CreateClassTemplateRequest
  ): SessionValidation {
    const errors: string[] = [];

    if (!template.title || template.title.trim().length < 3) {
      errors.push("Title must be at least 3 characters long");
    }

    if (template.capacity <= 0) {
      errors.push(CLASS_ERRORS.INVALID_CAPACITY);
    }

    if (template.durationMinutes < 15 || template.durationMinutes > 180) {
      errors.push(CLASS_ERRORS.INVALID_DURATION);
    }

    if (template.price < 0) {
      errors.push(CLASS_ERRORS.INVALID_PRICE);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate template updates
   */
  private validateTemplateUpdates(
    updates: UpdateClassTemplateRequest
  ): SessionValidation {
    const errors: string[] = [];

    if (
      updates.title !== undefined &&
      (!updates.title || updates.title.trim().length < 3)
    ) {
      errors.push("Title must be at least 3 characters long");
    }

    if (updates.capacity !== undefined && updates.capacity <= 0) {
      errors.push(CLASS_ERRORS.INVALID_CAPACITY);
    }

    if (
      updates.durationMinutes !== undefined &&
      (updates.durationMinutes < 15 || updates.durationMinutes > 180)
    ) {
      errors.push(CLASS_ERRORS.INVALID_DURATION);
    }

    if (updates.price !== undefined && updates.price < 0) {
      errors.push(CLASS_ERRORS.INVALID_PRICE);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate session data
   */
  private async validateSessionData(
    establishmentId: string,
    session: CreateClassSessionRequest
  ): Promise<SessionValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if session date is in the future
    const sessionDate = new Date(session.sessionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (sessionDate < today) {
      errors.push(CLASS_ERRORS.SESSION_IN_PAST);
    }

    // Validate capacity
    if (session.capacity !== undefined && session.capacity <= 0) {
      errors.push(CLASS_ERRORS.INVALID_CAPACITY);
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(session.startTime)) {
      errors.push("Invalid start time format (HH:MM)");
    }

    if (session.endTime && !timeRegex.test(session.endTime)) {
      errors.push("Invalid end time format (HH:MM)");
    }

    // Check if end time is after start time
    if (session.endTime) {
      const startTime = new Date(`2000-01-01T${session.startTime}`);
      const endTime = new Date(`2000-01-01T${session.endTime}`);

      if (endTime <= startTime) {
        errors.push("End time must be after start time");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate student enrollment
   */
  private async validateStudentEnrollment(
    establishmentId: string,
    sessionId: string,
    studentId: string,
    usePackageCredits?: boolean
  ): Promise<EnrollmentValidation> {
    // Check if student package is required and valid
    let requiresPackage = usePackageCredits || false;
    let hasValidPackage = false;
    let packageCreditsRemaining = 0;

    if (requiresPackage) {
      const studentPackage =
        await this.classesRepository.getActiveStudentPackage(
          establishmentId,
          studentId
        );

      if (studentPackage) {
        hasValidPackage = true;
        packageCreditsRemaining = studentPackage.remainingClasses || 0;

        // Check if package has credits remaining
        if (
          studentPackage.packageType !== "monthly_unlimited" &&
          (studentPackage.remainingClasses || 0) <= 0
        ) {
          return {
            canEnroll: false,
            reason: CLASS_ERRORS.INSUFFICIENT_PACKAGE_CREDITS,
            requiresPackage: true,
            hasValidPackage: false,
            packageCreditsRemaining: 0,
          };
        }

        // Check if package has expired
        if (studentPackage.endDate) {
          const expiryDate = new Date(studentPackage.endDate);
          const today = new Date();

          if (expiryDate < today) {
            return {
              canEnroll: false,
              reason: CLASS_ERRORS.PACKAGE_EXPIRED,
              requiresPackage: true,
              hasValidPackage: false,
              packageCreditsRemaining,
            };
          }
        }
      } else {
        return {
          canEnroll: false,
          reason: CLASS_ERRORS.INSUFFICIENT_PACKAGE_CREDITS,
          requiresPackage: true,
          hasValidPackage: false,
          packageCreditsRemaining: 0,
        };
      }
    }

    return {
      canEnroll: true,
      requiresPackage,
      hasValidPackage,
      packageCreditsRemaining,
    };
  }

  /**
   * Get all dropdown data for classes
   */
  async getDropdownData(establishmentId: string): Promise<
    ClassResponse<{
      instructors: Array<{
        id: string;
        name: string;
        email: string;
        phone?: string;
        role: string;
        isActive: boolean;
      }>;
      classTypes: Array<{
        id: number;
        nameTr: string;
        nameEn: string;
        isActive: boolean;
      }>;
      classLevels: Array<{
        id: number;
        nameTr: string;
        nameEn: string;
        isActive: boolean;
      }>;
    }>
  > {
    try {
      const dropdownData = await this.classesRepository.getDropdownData(
        establishmentId
      );

      return {
        success: true,
        data: dropdownData,
        message: "Dropdown data retrieved successfully",
      };
    } catch (error) {
      this.logger.error("Failed to get dropdown data", {
        error,
        establishmentId,
      });

      return {
        success: false,
        message: "Failed to get dropdown data",
        error: {
          code: "DROPDOWN_DATA_FETCH_ERROR",
          message: "Failed to retrieve dropdown data",
        },
      };
    }
  }

  /**
   * Auto-enroll all cohort members in a session
   */
  private async autoEnrollCohortMembers(
    establishmentId: string,
    sessionId: string,
    cohortId: string,
    userId: string
  ): Promise<void> {
    try {
      const members = await this.classesRepository.getCohortMembers(establishmentId, cohortId);
      
      if (members.length === 0) {
        return;
      }

      // Enroll all cohort members
      await this.classesRepository.bulkEnrollUsersInSession(
        establishmentId,
        sessionId,
        members,
        false // Not waitlisted since it's cohort members
      );

      this.logger.info("Auto-enrolled cohort members", {
        establishmentId,
        sessionId,
        cohortId,
        memberCount: members.length,
      });
    } catch (error) {
      this.logger.error("Failed to auto-enroll cohort members", {
        error,
        establishmentId,
        sessionId,
        cohortId,
      });
      // Don't throw error to avoid breaking session creation
    }
  }
}
