import crypto from "crypto";
import { LoggerService } from "../../services/LoggerService.js";
import { InvitationRepository } from "./invitation.repository.js";
import { AuthRepository } from "../auth/auth.repository.js";
import {
  CreateInvitationRequest,
  InvitationResponse,
  AcceptInvitationRequest,
  InvitationValidationResult,
  InvitationFilters,
  InvitationSettings,
  InvitationType,
  CreateInstructorInvitationRequest,
} from "./invitation.types.js";
import { INVITATION_ERRORS, AUTH_ERRORS, formatMessage } from "../../constants/errorMessages.js";

export class InvitationService {
  constructor(
    private invitationRepository: InvitationRepository,
    private authRepository: AuthRepository,
    private logger: LoggerService
  ) {}

  /**
   * Create instructor invitation
   */
  async createInstructorInvitation(
    request: CreateInstructorInvitationRequest,
    createdBy: string
  ): Promise<InvitationResponse> {
    try {
      this.logger.info("Creating instructor invitation", {
        email: request.email,
        phoneNumber: request.phoneNumber,
        establishmentId: request.establishmentId,
        createdBy,
      });

      // Validate permissions - only managers can invite instructors
      const canInvite = await this.invitationRepository.canUserInvite(
        createdBy,
        request.establishmentId,
        "instructor"
      );

      if (!canInvite) {
        throw new Error(INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS);
      }

      // Get invitation settings
      const settings = await this.invitationRepository.getInvitationSettings(
        request.establishmentId
      );

      // Check if instructor invitations are enabled
      if (!settings.instructorInvitationEnabled) {
        throw new Error(INVITATION_ERRORS.INVITATIONS_DISABLED);
      }

      // Clean up expired invitations first to ensure accurate check
      await this.invitationRepository.cleanupExpiredInstructorInvitations();

      // Check if there's already an active invitation for this email (normalize case)
      const normalizedEmail = request.email.toLowerCase().trim();
      const hasActiveInvitation = await this.invitationRepository.hasActiveInstructorInvitation(
        normalizedEmail,
        request.establishmentId
      );
      if (hasActiveInvitation) {
        throw new Error(INVITATION_ERRORS.DUPLICATE_INVITATION);
      }

      // Check if user with this email already exists and is already an instructor
      const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);
      if (existingUser) {
        const existsInEstablishment = await this.invitationRepository.userExistsInEstablishment(
          existingUser.id,
          request.establishmentId
        );
        if (existsInEstablishment) {
          throw new Error(INVITATION_ERRORS.USER_ALREADY_EXISTS);
        }
      }

      // Generate secure token
      const token = this.generateInvitationToken();

      // Calculate expiry (instructor invitations are longer lived)
      const expiryHours = request.expiryHours || 24; // Default 24 hours for instructors
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      // Use DatabaseService transaction method to ensure data consistency
      const invitationId = await this.invitationRepository.db.transaction(async (client) => {
        // Create invitation in database
        const result = await client.query(
          `
          INSERT INTO invitations (
            establishment_id, created_by, invitation_type, token, 
            usage_limit, message, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
          [
            request.establishmentId,
            createdBy,
            "instructor",
            token,
            1, // Always 1 for instructor invitations
            request.message || null,
            expiresAt,
          ]
        );

        const invitationId = result.rows[0].id;

        // Store instructor-specific details (email and phone) - use normalized email
        await client.query(
          `
          INSERT INTO instructor_invitations (
            invitation_id, email, phone_number, establishment_id, 
            invited_by, message, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            invitationId,
            normalizedEmail,
            request.phoneNumber,
            request.establishmentId,
            createdBy,
            request.message || null,
            expiresAt,
          ]
        );

        // Log activity within the same transaction
        await client.query(
          `
          INSERT INTO activities (
            establishment_id, activity_type, title, description, user_id
          ) VALUES ($1, 'invitation', $2, $3, $4)
        `,
          [
            request.establishmentId,
            `Invitation created`,
            `Instructor invitation sent to ${normalizedEmail} (${request.phoneNumber})`,
            createdBy
          ]
        );

        return invitationId;
      });

      // Get invitation details for response
      const invitation = await this.invitationRepository.findByToken(token);
      if (!invitation.isValid || !invitation.invitation) {
        throw new Error(INVITATION_ERRORS.INVITATION_CREATION_FAILED);
      }

      // Generate invitation URL
      const invitationUrl = this.generateInvitationUrl(token);

      this.logger.info("Instructor invitation created successfully", {
        invitationId,
        email: request.email,
        phoneNumber: request.phoneNumber,
        expiresAt,
      });

      return {
        id: invitationId,
        type: "instructor",
        status: "active",
        createdBy,
        createdByName: invitation.invitation.createdByName,
        message: request.message,
        usageLimit: 1,
        usageCount: 0,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        invitationUrl,
      };
    } catch (error) {
      this.logger.error("Failed to create instructor invitation", {
        error,
        request,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Create and send a generic invitation (for students only)
   */
  async createInvitation(
    request: CreateInvitationRequest,
    createdBy: string
  ): Promise<InvitationResponse> {
    try {
      this.logger.info("Creating invitation", {
        type: request.type,
        establishmentId: request.establishmentId,
        createdBy,
      });

      // Validate that only students can use generic invitations
      if (request.type !== "student") {
        throw new Error(INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS);
      }

      // Validate permissions
      const canInvite = await this.invitationRepository.canUserInvite(
        createdBy,
        request.establishmentId,
        request.type
      );

      if (!canInvite) {
        throw new Error(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
      }

      // Get invitation settings
      const settings = await this.invitationRepository.getInvitationSettings(
        request.establishmentId
      );

      // Check if student invitations are enabled
      if (!settings.studentInvitationEnabled) {
        throw new Error(INVITATION_ERRORS.INVITATIONS_DISABLED);
      }

      // Generate secure token
      const token = this.generateInvitationToken();

      // Calculate expiry and usage limit
      const expiryHours = this.calculateExpiryHours(request, settings);
      const usageLimit =
        request.usageLimit || settings.studentInvitationDefaultUsageLimit;
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      // Validate limits
      if (expiryHours > settings.studentInvitationMaxHours) {
        throw new Error(
          formatMessage("Geçerlilik süresi {max} saati geçemez", { max: settings.studentInvitationMaxHours })
        );
      }

      if (usageLimit > 50) {
        // Reasonable upper limit
        throw new Error("Kullanım limiti 50 kişiyi geçemez");
      }

      // Create invitation
      const invitationId = await this.invitationRepository.createInvitation({
        establishmentId: request.establishmentId,
        createdBy,
        type: request.type,
        token,
        usageLimit,
        sessionId: request.sessionId,
        message: request.message,
        expiresAt,
      });

      // Get invitation details for response
      const invitation = await this.invitationRepository.findByToken(token);
      if (!invitation.isValid || !invitation.invitation) {
        throw new Error("Failed to create invitation");
      }

      // Generate invitation URL
      const invitationUrl = this.generateInvitationUrl(token);

      this.logger.info("Invitation created successfully", {
        invitationId,
        type: request.type,
        usageLimit,
        expiresAt,
      });

      return {
        id: invitationId,
        type: request.type,
        status: "active",
        createdBy,
        createdByName: invitation.invitation.createdByName,
        sessionId: request.sessionId,
        sessionName: invitation.sessionName,
        message: request.message,
        usageLimit,
        usageCount: 0,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        invitationUrl,
      };
    } catch (error) {
      console.log(error);
      this.logger.error("Failed to create invitation", {
        error,
        request,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Validate an invitation token
   */
  async validateInvitation(
    token: string,
    userId?: string
  ): Promise<InvitationValidationResult> {
    try {
      const result = await this.invitationRepository.findByToken(token);

      // If invitation is not valid, return as is
      if (!result.isValid) {
        return result;
      }

      // If user is provided, check if they're already in the establishment
      if (userId && result.invitation) {
        const existsInEstablishment =
          await this.invitationRepository.userExistsInEstablishment(
            userId,
            result.invitation.establishmentId
          );

        if (existsInEstablishment) {
          // Return valid with warning message
          return {
            ...result,
            warningMessage:
              "You are already a member of this establishment. Using this invitation will not change your role or access.",
          };
        }
      }

      this.logger.info("Invitation validation", {
        token: token.substring(0, 8) + "...",
        isValid: result.isValid,
        error: result.error,
        warning: result.warningMessage,
      });

      return result;
    } catch (error) {
      this.logger.error("Error validating invitation", {
        error,
        token: token.substring(0, 8) + "...",
      });
      return { isValid: false, error: "Invalid invitation token" };
    }
  }

  /**
   * Accept an invitation and add user to establishment
   */
  async acceptInvitation(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string; warning?: string }> {
    try {
      // Validate invitation
      const validation = await this.validateInvitation(token, userId);
      if (!validation.isValid || !validation.invitation) {
        throw new Error(validation.error || INVITATION_ERRORS.INVALID_INVITATION);
      }

      const invitation = validation.invitation;

      // Get user details
      const user = await this.authRepository.findUserById(userId);
      if (!user) {
        throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
      }

      // For instructor invitations, verify the user's email matches the invitation email
      if (invitation.type === "instructor" && invitation.instructorEmail) {
        if (user.email.toLowerCase().trim() !== invitation.instructorEmail.toLowerCase().trim()) {
          throw new Error(
            formatMessage(INVITATION_ERRORS.EMAIL_MISMATCH, { email: invitation.instructorEmail })
          );
        }
      }

      this.logger.info("Processing invitation acceptance", {
        invitationId: invitation.id,
        type: invitation.type,
        userId,
        userEmail: user.email,
        invitationEmail: invitation.instructorEmail,
      });

      // Check if user is already in establishment
      const existsInEstablishment =
        await this.invitationRepository.userExistsInEstablishment(
          userId,
          invitation.establishmentId
        );

      if (existsInEstablishment) {
        // Still record the usage for tracking purposes but don't add them again
        await this.invitationRepository.acceptInvitation(
          invitation.id,
          userId,
          user.email,
          ipAddress,
          userAgent
        );

        return {
          message: "Davetiye başarıyla kabul edildi!",
          warning: "Zaten bu kurumun üyesisiniz.",
        };
      }

      // Use transaction to ensure all acceptance operations are atomic
      const userRole = invitation.type === "instructor" ? "instructor" : "student";
      
      await this.invitationRepository.db.transaction(async (client) => {
        // Record the invitation usage
        await client.query(
          `
          INSERT INTO invitation_usage (
            invitation_id, user_id, user_email, used_at, ip_address, user_agent
          ) VALUES ($1, $2, $3, NOW(), $4, $5)
        `,
          [invitation.id, userId, user.email, ipAddress, userAgent]
        );

        // Update invitation usage count and possibly status
        await client.query(
          `
          UPDATE invitations 
          SET usage_count = usage_count + 1,
              status = CASE 
                WHEN usage_count + 1 >= usage_limit THEN 'used_up' 
                ELSE status 
              END,
              updated_at = NOW()
          WHERE id = $1
        `,
          [invitation.id]
        );

        // Update instructor invitation status if it's an instructor invitation
        if (invitation.type === "instructor") {
          const exists = await this.invitationRepository.tableExists('instructor_invitations');
          if (exists) {
            await client.query(`
              UPDATE instructor_invitations 
              SET status = $1, accepted_at = NOW(), updated_at = NOW()
              WHERE invitation_id = $2
            `, ['accepted', invitation.id]);
          }
        }

        // Add user to the establishment with appropriate role
        await client.query(
          `
          INSERT INTO user_establishments (user_id, establishment_id, role, status, created_at, updated_at)
          VALUES ($1, $2, $3, 'active', NOW(), NOW())
          ON CONFLICT (user_id, establishment_id) DO UPDATE SET
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            updated_at = NOW()
        `,
          [userId, invitation.establishmentId, userRole]
        );

        // If it's a student invitation with a session, enroll them in the session
        if (invitation.type === "student" && invitation.sessionId) {
          await client.query(
            `
            INSERT INTO session_enrollments (session_id, student_id)
            VALUES ($1, $2)
            ON CONFLICT (session_id, student_id) DO NOTHING
          `,
            [invitation.sessionId, userId]
          );
        }

        // Log activity
        await client.query(
          `
          INSERT INTO activities (
            establishment_id, activity_type, title, description, user_id
          ) VALUES ($1, 'invitation', $2, $3, $4)
        `,
          [
            invitation.establishmentId,
            "Invitation accepted",
            `${user.email} joined as ${userRole}`,
            userId,
          ]
        );
      });

      this.logger.info("Invitation accepted successfully", {
        invitationId: invitation.id,
        userId,
        type: invitation.type,
        establishmentId: invitation.establishmentId,
      });

      const roleText = userRole === "instructor" ? "eğitmen" : "öğrenci";
      return {
        message: `Kuruma ${roleText} olarak başarıyla katıldınız!`,
      };
    } catch (error) {
      this.logger.error("Failed to accept invitation", {
        error,
        token: token.substring(0, 8) + "...",
        userId,
      });
      throw error;
    }
  }

  /**
   * Get invitations with filtering
   */
  async getInvitations(filters: InvitationFilters) {
    return await this.invitationRepository.getInvitations(filters);
  }

  /**
   * Revoke an invitation with permission checks
   */
  async revokeInvitation(
    invitationId: string,
    revokedBy: string,
    establishmentId: string,
    userRole: string
  ): Promise<void> {
    try {
      // Get invitation details first to check type
      const invitationDetails = await this.invitationRepository.getInvitationById(invitationId);
      
      if (!invitationDetails) {
        throw new Error("Invitation not found");
      }

      // Check permissions based on invitation type
      if (invitationDetails.type === "instructor") {
        // Only managers can revoke instructor invitations
        if (userRole !== "manager") {
          throw new Error("Only managers can revoke instructor invitations");
        }
      } else {
        // For student invitations, both instructors and managers can revoke
        if (!["instructor", "manager"].includes(userRole)) {
          throw new Error("Insufficient permissions to revoke this invitation");
        }
      }

      // Use transaction to ensure both invitation and instructor_invitation are updated atomically
      await this.invitationRepository.db.transaction(async (client) => {
        // Update main invitation status
        await client.query(
          'UPDATE invitations SET status = $1, updated_at = NOW() WHERE id = $2',
          ['revoked', invitationId]
        );

        // Update instructor invitation status if it's an instructor invitation
        if (invitationDetails.type === "instructor") {
          const exists = await this.invitationRepository.tableExists('instructor_invitations');
          if (exists) {
            await client.query(`
              UPDATE instructor_invitations 
              SET status = $1, updated_at = NOW()
              WHERE invitation_id = $2
            `, ['revoked', invitationId]);
          }
        }

        // Log activity within the same transaction
        await client.query(
          `
          INSERT INTO activities (
            establishment_id, activity_type, title, description, user_id
          ) VALUES ($1, 'invitation', $2, $3, $4)
        `,
          [
            invitationDetails.establishmentId,
            `Invitation revoked`,
            `${invitationDetails.type} invitation revoked`,
            revokedBy
          ]
        );
      });

      this.logger.info("Invitation revoked", { 
        invitationId, 
        revokedBy, 
        invitationType: invitationDetails.type,
        userRole 
      });
    } catch (error) {
      this.logger.error("Failed to revoke invitation", {
        error,
        invitationId,
        revokedBy,
      });
      throw error;
    }
  }

  /**
   * Get invitation settings for establishment
   */
  async getInvitationSettings(
    establishmentId: string
  ): Promise<InvitationSettings> {
    return await this.invitationRepository.getInvitationSettings(
      establishmentId
    );
  }

  /**
   * Update invitation settings
   */
  async updateInvitationSettings(
    establishmentId: string,
    settings: Partial<InvitationSettings>,
    updatedBy: string
  ): Promise<void> {
    try {
      await this.invitationRepository.updateInvitationSettings(
        establishmentId,
        settings
      );

      this.logger.info("Invitation settings updated", {
        establishmentId,
        settings,
        updatedBy,
      });
    } catch (error) {
      this.logger.error("Failed to update invitation settings", {
        error,
        establishmentId,
      });
      throw error;
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(establishmentId: string) {
    return await this.invitationRepository.getInvitationStats(establishmentId);
  }

  /**
   * Get invitation usage history
   */
  async getInvitationUsage(invitationId: string) {
    return await this.invitationRepository.getInvitationUsage(invitationId);
  }

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    // Generate a cryptographically secure token
    // Format: 32 bytes (256 bits) encoded as base64url
    return crypto.randomBytes(32).toString("base64url");
  }

  /**
   * Calculate expiry hours based on request and settings
   */
  private calculateExpiryHours(
    request: CreateInvitationRequest,
    settings: InvitationSettings
  ): number {
    // For student invitations - use requested hours or default, capped at max allowed
    const requestedHours = request.expiryHours || settings.defaultExpiryHours;
    return Math.min(requestedHours, settings.studentInvitationMaxHours);
  }

  /**
   * Generate invitation URL
   */
  private generateInvitationUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return `${baseUrl}/invite/${token}`;
  }

  /**
   * Add user to establishment with specified role
   * NOTE: Currently not used - operations are handled within transactions for better consistency
   */
  private async addUserToEstablishment(
    userId: string,
    establishmentId: string,
    role: string
  ): Promise<void> {
    try {
      await this.invitationRepository.db.query(
        `
        INSERT INTO user_establishments (user_id, establishment_id, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', NOW(), NOW())
        ON CONFLICT (user_id, establishment_id) DO UPDATE SET
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = NOW()
      `,
        [userId, establishmentId, role]
      );

      this.logger.info("User added to establishment", {
        userId,
        establishmentId,
        role,
      });
    } catch (error) {
      this.logger.error("Failed to add user to establishment", {
        error,
        userId,
        establishmentId,
        role,
      });
      throw error;
    }
  }

  /**
   * Enroll student in session
   * NOTE: Currently not used - operations are handled within transactions for better consistency
   */
  private async enrollStudentInSession(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      await this.invitationRepository.db.query(
        `
        INSERT INTO session_enrollments (session_id, student_id)
        VALUES ($1, $2)
        ON CONFLICT (session_id, student_id) DO NOTHING
      `,
        [sessionId, userId]
      );

      this.logger.info("Student enrolled in session", { userId, sessionId });
    } catch (error) {
      this.logger.error("Failed to enroll student in session", {
        error,
        userId,
        sessionId,
      });
      // Don't throw error - account creation should still succeed
    }
  }
}
