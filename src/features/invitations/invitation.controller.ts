import { Request, Response, NextFunction } from "express";
import { InvitationService } from "./invitation.service.js";
import { LoggerService } from "../../services/LoggerService.js";
import {
  CreateInvitationRequest,
  AcceptInvitationRequest,
  InvitationFilters,
  InvitationSettings,
  CreateInstructorInvitationRequest,
} from "./invitation.types.js";
import {
  INVITATION_ERRORS,
  AUTH_ERRORS,
  SUCCESS_MESSAGES,
} from "../../constants/errorMessages.js";
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

export class InvitationController {
  constructor(
    private invitationService: InvitationService,
    private logger: LoggerService
  ) {}

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

  /**
   * POST /invitations/create-student-invitation
   * Create a generic invitation link for students (no email required)
   */
  async createStudentInvitation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check if user can invite students

      const { sessionId, cohortId, message, expiryHours, usageLimit } =
        req.body;

      // Validate that only one target is specified
      if (sessionId && cohortId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.CANNOT_SPECIFY_BOTH_SESSION_AND_COHORT,
          code: "INVALID_INVITATION_TARGET",
        });
        return;
      }

      // Validate expiry hours (max 24 hours)
      if (expiryHours && (expiryHours < 0.1 || expiryHours > 24)) {
        res.status(400).json({
          success: false,
          message: INVITATION_ERRORS.INVALID_EXPIRY_HOURS,
          code: "INVALID_EXPIRY_HOURS",
        });
        return;
      }

      // Validate usage limit
      if (usageLimit && (usageLimit < 1 || usageLimit > 50)) {
        res.status(400).json({
          success: false,
          message: INVITATION_ERRORS.INVALID_USAGE_LIMIT,
          code: "INVALID_USAGE_LIMIT",
        });
        return;
      }

      const invitationRequest: CreateInvitationRequest = {
        type: "student",
        establishmentId: req.establishment!.id,
        sessionId,
        cohortId,
        message,
        expiryHours,
        usageLimit,
      };

      const invitation = await this.invitationService.createInvitation(
        invitationRequest,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: invitation,
        message: SUCCESS_MESSAGES.INVITATION_CREATED,
      });
    } catch (error) {
      this.logger.error("Failed to create student invitation", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * POST /invitations/create-cohort-invitation
   * Create invitation link for students to join a specific cohort
   */
  async createCohortInvitation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { cohortId, message, expiryHours, usageLimit } = req.body;
      if (!cohortId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.COHORT_ID_REQUIRED,
          code: "MISSING_COHORT_ID",
        });
        return;
      }

      // Validate expiry hours (max 24 hours)
      if (expiryHours && (expiryHours < 0.1 || expiryHours > 24)) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.EXPIRY_HOURS_RANGE,
          code: "INVALID_EXPIRY_HOURS",
        });
        return;
      }

      // Validate usage limit
      if (usageLimit && (usageLimit < 1 || usageLimit > 50)) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.USAGE_LIMIT_RANGE,
          code: "INVALID_USAGE_LIMIT",
        });
        return;
      }

      const invitationRequest: CreateInvitationRequest = {
        type: "student",
        establishmentId: req.establishment!.id,
        cohortId,
        message,
        expiryHours,
        usageLimit,
      };

      const invitation = await this.invitationService.createInvitation(
        invitationRequest,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: invitation,
        message: ERROR_MESSAGES.COHORT_INVITATION_CREATED,
      });
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes("Cohort not found")) {
        res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.COHORT_NOT_FOUND,
          code: "COHORT_NOT_FOUND",
        });
        return;
      }

      if (error.message?.includes("invitations are disabled")) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.STUDENT_INVITATIONS_DISABLED,
          code: "INVITATIONS_DISABLED",
        });
        return;
      }

      this.logger.error("Failed to create cohort invitation", {
        error,
        userId: req.user?.id,
        establishmentId: req.establishment?.id,
      });
      next(error);
    }
  }

  /**
   * POST /invitations/invite-instructor
   * Create instructor invitation with email and phone number (manager only)
   */
  async inviteInstructor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate user role (should be enforced by middleware, but double-check)
      if (req.establishment?.userRole !== "manager") {
        res.status(403).json({
          success: false,
          message: INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS,
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      const { email, phoneNumber, message, expiryHours } = req.body;

      // Validate email format (additional validation beyond Joi)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: INVITATION_ERRORS.INVALID_EMAIL_FORMAT,
          code: "INVALID_EMAIL",
        });
        return;
      }

      // Validate phone number format (international format recommended)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format: +[country code][number] (max 15 digits)
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, ""); // Remove formatting
      if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
        res.status(400).json({
          success: false,
          message: INVITATION_ERRORS.INVALID_PHONE_FORMAT,
          code: "INVALID_PHONE",
        });
        return;
      }

      // Validate expiry hours
      if (expiryHours && (expiryHours < 0.1 || expiryHours > 24)) {
        res.status(400).json({
          success: false,
          message: INVITATION_ERRORS.INVALID_EXPIRY_HOURS,
          code: "INVALID_EXPIRY_HOURS",
        });
        return;
      }

      const invitationRequest: CreateInstructorInvitationRequest = {
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim(),
        establishmentId: req.establishment!.id,
        message,
        expiryHours,
      };

      const invitation =
        await this.invitationService.createInstructorInvitation(
          invitationRequest,
          req.user!.id
        );

      res.status(201).json({
        success: true,
        data: invitation,
        message: SUCCESS_MESSAGES.INVITATION_CREATED,
      });
    } catch (error: any) {
      // Handle specific error cases with appropriate HTTP status codes
      if (
        error.message?.includes("aktif bir davetiye") ||
        error.message?.includes("active instructor invitation")
      ) {
        res.status(409).json({
          success: false,
          message: INVITATION_ERRORS.DUPLICATE_INVITATION,
          code: "DUPLICATE_INVITATION",
        });
        return;
      }

      if (
        error.message?.includes("zaten bu kurumun üyesi") ||
        error.message?.includes("already a member")
      ) {
        res.status(409).json({
          success: false,
          message: INVITATION_ERRORS.USER_ALREADY_EXISTS,
          code: "USER_ALREADY_EXISTS",
        });
        return;
      }

      if (
        error.message?.includes("Sadece yöneticiler") ||
        error.message?.includes("Only managers")
      ) {
        res.status(403).json({
          success: false,
          message: INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS,
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      if (
        error.message?.includes("davetiye gönderimi devre dışı") ||
        error.message?.includes("invitations are disabled")
      ) {
        res.status(400).json({
          success: false,
          message: INVITATION_ERRORS.INVITATIONS_DISABLED,
          code: "INVITATIONS_DISABLED",
        });
        return;
      }

      this.logger.error("Failed to invite instructor", {
        error,
        userId: req.user?.id,
        establishmentId: req.establishment?.id,
      });
      next(error);
    }
  }

  /**
   * GET /invitations
   * Get invitations for the establishment
   */
  async getInvitations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Only managers and above can view all invitations

      const filters: InvitationFilters = {
        establishmentId: req.establishment!.id,
        type: req.query.type as any,
        status: req.query.status as any,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string)
          : undefined,
      };

      const invitations = await this.invitationService.getInvitations(filters);

      res.json({
        success: true,
        data: invitations,
        meta: {
          establishmentId: req.establishment!.id,
          count: invitations.length,
          filters,
        },
      });
    } catch (error) {
      this.logger.error("Failed to get invitations", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * GET /invitations/:invitationId/usage
   * Get usage history for a specific invitation
   */
  async getInvitationUsage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Only managers and above can view invitation usage

      const { invitationId } = req.params;

      if (!invitationId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVITATION_ID_REQUIRED,
          code: "MISSING_INVITATION_ID",
        });
        return;
      }

      const usage = await this.invitationService.getInvitationUsage(
        invitationId
      );

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      this.logger.error("Failed to get invitation usage", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * POST /invitations/:invitationId/revoke
   * Revoke an invitation
   */
  async revokeInvitation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { invitationId } = req.params;

      if (!invitationId) {
        res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.INVITATION_ID_REQUIRED,
          code: "MISSING_INVITATION_ID",
        });
        return;
      }

      await this.invitationService.revokeInvitation(
        invitationId,
        req.user!.id,
        req.establishment!.id,
        req.establishment!.userRole
      );

      res.json({
        success: true,
        message: ERROR_MESSAGES.INVITATION_REVOKED,
      });
    } catch (error: any) {
      // Handle permission-specific errors
      if (
        error.message?.includes(
          "Only managers can revoke instructor invitations"
        )
      ) {
        res.status(403).json({
          success: false,
          message: error.message,
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      if (error.message?.includes("Invitation not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: "INVITATION_NOT_FOUND",
        });
        return;
      }

      if (error.message?.includes("Insufficient permissions")) {
        res.status(403).json({
          success: false,
          message: error.message,
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      this.logger.error("Failed to revoke invitation", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * GET /invitations/validate/:token
   * Validate an invitation token (can be used by authenticated or unauthenticated users)
   */
  async validateInvitation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          message: "Invitation token is required",
          code: "MISSING_TOKEN",
        });
        return;
      }

      // Pass user ID if authenticated for checking existing membership
      const userId = req.user?.id;
      const validation = await this.invitationService.validateInvitation(
        token,
        userId
      );

      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: validation.error || "Invalid invitation",
          code: "INVALID_INVITATION",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          establishmentName: validation.establishmentName,
          sessionName: validation.sessionName,
          cohortName: validation.cohortName,
          type: validation.invitation?.type,
          message: validation.invitation?.message,
          expiresAt: validation.invitation?.expiresAt,
          usageLimit: validation.invitation?.usageLimit,
          usageCount: validation.invitation?.usageCount,
          warningMessage: validation.warningMessage,
          // Include instructor email for instructor invitations
          ...(validation.invitation?.type === "instructor" &&
            validation.invitation.instructorEmail && {
              requiredEmail: validation.invitation.instructorEmail,
              emailNote:
                "This instructor invitation requires you to be logged in with the invited email address",
            }),
          // Include cohort information for cohort invitations
          ...(validation.invitation?.cohortId && {
            cohortId: validation.invitation.cohortId,
            invitationType: "cohort",
            enrollmentNote:
              "You will be automatically enrolled in this cohort and all its future sessions",
          }),
        },
        message: "Valid invitation",
      });
    } catch (error) {
      this.logger.error("Failed to validate invitation", {
        error,
        token: req.params.token?.substring(0, 8) + "...",
      });
      next(error);
    }
  }

  /**
   * POST /invitations/accept/:token
   * Accept an invitation and add user to establishment (requires authentication only)
   * Note: No establishment context required since user may not belong to any establishment yet
   */
  async acceptInvitation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required to accept invitations",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          message: "Invitation token is required",
          code: "MISSING_TOKEN",
        });
        return;
      }

      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent");

      const result = await this.invitationService.acceptInvitation(
        token,
        req.user.id,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: result.message,
        warning: result.warning,
      });
    } catch (error: any) {
      // Handle email verification errors for instructor invitations
      if (
        error.message?.includes("Please log in with the correct email address")
      ) {
        res.status(403).json({
          success: false,
          message: error.message,
          code: "EMAIL_MISMATCH",
        });
        return;
      }

      this.logger.error("Failed to accept invitation", {
        error,
        token: req.params.token?.substring(0, 8) + "...",
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * GET /invitations/settings
   * Get invitation settings for establishment
   */
  async getInvitationSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Only managers and above can view settings

      const settings = await this.invitationService.getInvitationSettings(
        req.establishment!.id
      );

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      this.logger.error("Failed to get invitation settings", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * PUT /invitations/settings
   * Update invitation settings for establishment
   */
  async updateInvitationSettings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Only managers and above can update settings

      const settings: Partial<InvitationSettings> = req.body;

      // Validate settings
      if (
        settings.studentInvitationMaxHours &&
        (settings.studentInvitationMaxHours < 1 ||
          settings.studentInvitationMaxHours > 24)
      ) {
        res.status(400).json({
          success: false,
          message: "Student invitation max hours must be between 1 and 24",
          code: "INVALID_SETTINGS",
        });
        return;
      }

      if (
        settings.defaultExpiryHours &&
        (settings.defaultExpiryHours < 1 || settings.defaultExpiryHours > 24)
      ) {
        res.status(400).json({
          success: false,
          message: "Default expiry hours must be between 1 and 24",
          code: "INVALID_SETTINGS",
        });
        return;
      }

      if (
        settings.studentInvitationDefaultUsageLimit &&
        (settings.studentInvitationDefaultUsageLimit < 1 ||
          settings.studentInvitationDefaultUsageLimit > 50)
      ) {
        res.status(400).json({
          success: false,
          message: "Default usage limit must be between 1 and 50",
          code: "INVALID_SETTINGS",
        });
        return;
      }

      await this.invitationService.updateInvitationSettings(
        req.establishment!.id,
        settings,
        req.user!.id
      );

      res.json({
        success: true,
        message: "Invitation settings updated successfully",
      });
    } catch (error) {
      this.logger.error("Failed to update invitation settings", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * GET /invitations/stats
   * Get invitation statistics for dashboard
   */
  async getInvitationStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Only managers and above can view stats

      const stats = await this.invitationService.getInvitationStats(
        req.establishment!.id
      );

      res.json({
        success: true,
        data: stats,
        meta: {
          establishmentId: req.establishment!.id,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.logger.error("Failed to get invitation stats", {
        error,
        userId: req.user?.id,
      });
      next(error);
    }
  }
}
