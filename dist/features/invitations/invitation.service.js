import crypto from "crypto";
import { INVITATION_ERRORS, AUTH_ERRORS, formatMessage, } from "../../constants/errorMessages.js";
import { ERROR_MESSAGES } from "../../utils/error-messages.js";
export class InvitationService {
    invitationRepository;
    authRepository;
    passwordService;
    logger;
    constructor(invitationRepository, authRepository, passwordService, logger) {
        this.invitationRepository = invitationRepository;
        this.authRepository = authRepository;
        this.passwordService = passwordService;
        this.logger = logger;
    }
    async createInstructorInvitation(request, createdBy) {
        try {
            this.logger.info("Creating instructor invitation", {
                email: request.email,
                phoneNumber: request.phoneNumber,
                establishmentId: request.establishmentId,
                createdBy,
            });
            const canInvite = await this.invitationRepository.canUserInvite(createdBy, request.establishmentId, "instructor");
            if (!canInvite) {
                throw new Error(INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS);
            }
            const settings = await this.invitationRepository.getInvitationSettings(request.establishmentId);
            if (!settings.instructorInvitationEnabled) {
                throw new Error(INVITATION_ERRORS.INVITATIONS_DISABLED);
            }
            await this.invitationRepository.cleanupExpiredInstructorInvitations();
            const normalizedEmail = request.email.toLowerCase().trim();
            const hasActiveInvitation = await this.invitationRepository.hasActiveInstructorInvitation(normalizedEmail, request.establishmentId);
            if (hasActiveInvitation) {
                throw new Error(INVITATION_ERRORS.DUPLICATE_INVITATION);
            }
            const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);
            if (existingUser) {
                const existsInEstablishment = await this.invitationRepository.userExistsInEstablishment(existingUser.id, request.establishmentId);
                if (existsInEstablishment) {
                    throw new Error(INVITATION_ERRORS.USER_ALREADY_EXISTS);
                }
            }
            const token = this.generateInvitationToken();
            const expiryHours = request.expiryHours || 24;
            const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
            const invitationId = await this.invitationRepository.db.transaction(async (client) => {
                const result = await client.query(`
          INSERT INTO invitations (
            establishment_id, created_by, invitation_type, token, 
            usage_limit, message, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
                    request.establishmentId,
                    createdBy,
                    "instructor",
                    token,
                    1,
                    request.message || null,
                    expiresAt,
                ]);
                const invitationId = result.rows[0].id;
                await client.query(`
          INSERT INTO instructor_invitations (
            invitation_id, email, phone_number, establishment_id, 
            invited_by, message, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
                    invitationId,
                    normalizedEmail,
                    request.phoneNumber,
                    request.establishmentId,
                    createdBy,
                    request.message || null,
                    expiresAt,
                ]);
                await client.query(`
          INSERT INTO activities (
            establishment_id, activity_type, title, description, user_id
          ) VALUES ($1, 'invitation', $2, $3, $4)
        `, [
                    request.establishmentId,
                    `Invitation created`,
                    `Instructor invitation sent to ${normalizedEmail} (${request.phoneNumber})`,
                    createdBy,
                ]);
                return invitationId;
            });
            const invitation = await this.invitationRepository.findByToken(token);
            if (!invitation.isValid || !invitation.invitation) {
                throw new Error(INVITATION_ERRORS.INVITATION_CREATION_FAILED);
            }
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
                message: request.message || "",
                usageLimit: 1,
                usageCount: 0,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString(),
                invitationUrl,
            };
        }
        catch (error) {
            this.logger.error("Failed to create instructor invitation", {
                error,
                request,
                createdBy,
            });
            throw error;
        }
    }
    async createInvitation(request, createdBy) {
        try {
            this.logger.info("Creating invitation", {
                type: request.type,
                establishmentId: request.establishmentId,
                createdBy,
            });
            if (request.type !== "student") {
                throw new Error(INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS);
            }
            const canInvite = await this.invitationRepository.canUserInvite(createdBy, request.establishmentId, request.type);
            if (!canInvite) {
                throw new Error(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
            }
            const settings = await this.invitationRepository.getInvitationSettings(request.establishmentId);
            if (!settings.studentInvitationEnabled) {
                throw new Error(INVITATION_ERRORS.INVITATIONS_DISABLED);
            }
            const token = this.generateInvitationToken();
            const expiryHours = this.calculateExpiryHours(request, settings);
            const usageLimit = request.usageLimit || settings.studentInvitationDefaultUsageLimit;
            const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
            if (expiryHours > settings.studentInvitationMaxHours) {
                throw new Error(formatMessage("Geçerlilik süresi {max} saati geçemez", {
                    max: settings.studentInvitationMaxHours,
                }));
            }
            if (usageLimit > 50) {
                throw new Error(ERROR_MESSAGES.USAGE_LIMIT_EXCEEDED);
            }
            const invitationId = await this.invitationRepository.createInvitation({
                establishmentId: request.establishmentId,
                createdBy,
                type: request.type,
                token,
                usageLimit,
                sessionId: request.sessionId ?? undefined,
                cohortId: request.cohortId ?? undefined,
                message: request.message,
                expiresAt,
            });
            const invitation = await this.invitationRepository.findByToken(token);
            if (!invitation.isValid || !invitation.invitation) {
                throw new Error(ERROR_MESSAGES.FAILED_TO_CREATE_INVITATION);
            }
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
                cohortId: request.cohortId,
                cohortName: invitation.cohortName,
                message: request.message,
                usageLimit,
                usageCount: 0,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString(),
                invitationUrl,
            };
        }
        catch (error) {
            console.log(error);
            this.logger.error("Failed to create invitation", {
                error,
                request,
                createdBy,
            });
            throw error;
        }
    }
    async validateInvitation(token, userId) {
        try {
            const result = await this.invitationRepository.findByToken(token);
            if (!result.isValid) {
                return result;
            }
            if (userId && result.invitation) {
                const existsInEstablishment = await this.invitationRepository.userExistsInEstablishment(userId, result.invitation.establishmentId);
                if (existsInEstablishment) {
                    return {
                        ...result,
                        warningMessage: "You are already a member of this establishment. Using this invitation will not change your role or access.",
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
        }
        catch (error) {
            this.logger.error("Error validating invitation", {
                error,
                token: token.substring(0, 8) + "...",
            });
            return { isValid: false, error: "Invalid invitation token" };
        }
    }
    async acceptInvitation(token, userId, ipAddress, userAgent) {
        try {
            const validation = await this.validateInvitation(token, userId);
            if (!validation.isValid || !validation.invitation) {
                throw new Error(validation.error || INVITATION_ERRORS.INVALID_INVITATION);
            }
            const invitation = validation.invitation;
            const user = await this.authRepository.findUserById(userId);
            if (!user) {
                throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
            }
            if (invitation.type === "instructor" && invitation.instructorEmail) {
                if (user.email.toLowerCase().trim() !==
                    invitation.instructorEmail.toLowerCase().trim()) {
                    throw new Error(formatMessage(INVITATION_ERRORS.EMAIL_MISMATCH, {
                        email: invitation.instructorEmail,
                    }));
                }
            }
            this.logger.info("Processing invitation acceptance", {
                invitationId: invitation.id,
                type: invitation.type,
                userId,
                userEmail: user.email,
                invitationEmail: invitation.instructorEmail,
            });
            const existsInEstablishment = await this.invitationRepository.userExistsInEstablishment(userId, invitation.establishmentId);
            if (existsInEstablishment) {
                await this.invitationRepository.acceptInvitation(invitation.id, userId, user.email, ipAddress, userAgent);
                return {
                    message: "Davetiye başarıyla kabul edildi!",
                    warning: "Zaten bu kurumun üyesisiniz.",
                };
            }
            const userRole = invitation.type === "instructor" ? "instructor" : "student";
            await this.invitationRepository.db.transaction(async (client) => {
                await client.query(`
          INSERT INTO invitation_usage (
            invitation_id, user_id, user_email, used_at, ip_address, user_agent
          ) VALUES ($1, $2, $3, NOW(), $4, $5)
        `, [invitation.id, userId, user.email, ipAddress, userAgent]);
                await client.query(`
          UPDATE invitations 
          SET usage_count = usage_count + 1,
              status = CASE 
                WHEN usage_count + 1 >= usage_limit THEN 'used_up' 
                ELSE status 
              END,
              updated_at = NOW()
          WHERE id = $1
        `, [invitation.id]);
                if (invitation.type === "instructor") {
                    const exists = await this.invitationRepository.tableExists("instructor_invitations");
                    if (exists) {
                        await client.query(`
              UPDATE instructor_invitations 
              SET status = $1, accepted_at = NOW(), updated_at = NOW()
              WHERE invitation_id = $2
            `, ["accepted", invitation.id]);
                    }
                }
                await client.query(`
          INSERT INTO user_establishments (user_id, establishment_id, role, status, created_at, updated_at)
          VALUES ($1, $2, $3, 'active', NOW(), NOW())
          ON CONFLICT (user_id, establishment_id) DO UPDATE SET
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            updated_at = NOW()
        `, [userId, invitation.establishmentId, userRole]);
                if (invitation.type === "student" && invitation.sessionId) {
                    await client.query(`
            INSERT INTO session_enrollments (session_id, student_id)
            VALUES ($1, $2)
            ON CONFLICT (session_id, student_id) DO NOTHING
          `, [invitation.sessionId, userId]);
                }
                if (invitation.type === "student" && invitation.cohortId) {
                    const cohortCheck = await client.query(`
            SELECT c.max_students, 
                   COUNT(cm.id) as current_enrollment
            FROM cohorts c
            LEFT JOIN cohort_memberships cm ON c.id = cm.cohort_id AND cm.is_active = true
            WHERE c.id = $1 AND c.is_active = true
            GROUP BY c.id, c.max_students
          `, [invitation.cohortId]);
                    if (cohortCheck.rows.length === 0) {
                        throw new Error(ERROR_MESSAGES.COHORT_NOT_FOUND_OR_INACTIVE);
                    }
                    const cohort = cohortCheck.rows[0];
                    if (cohort.current_enrollment >= cohort.max_students) {
                        throw new Error(ERROR_MESSAGES.COHORT_FULL);
                    }
                    const existingMembership = await client.query(`
            SELECT id FROM cohort_memberships 
            WHERE cohort_id = $1 AND student_id = $2 AND is_active = true
          `, [invitation.cohortId, userId]);
                    if (existingMembership.rows.length === 0) {
                        await client.query(`
              INSERT INTO cohort_memberships (
                cohort_id, student_id, payment_type, joined_date, is_active, notes
              ) VALUES ($1, $2, $3, CURRENT_DATE, true, $4)
            `, [
                            invitation.cohortId,
                            userId,
                            "drop_in",
                            `Enrolled via invitation on ${new Date().toISOString().split("T")[0]}`
                        ]);
                        const futureSessions = await client.query(`
              SELECT id FROM class_sessions 
              WHERE cohort_id = $1 
                AND session_date >= CURRENT_DATE 
                AND status = 'scheduled'
              ORDER BY session_date, start_time
            `, [invitation.cohortId]);
                        for (const session of futureSessions.rows) {
                            try {
                                await client.query(`
                  INSERT INTO session_enrollments (
                    establishment_id, session_id, student_id, is_waitlist
                  ) VALUES ($1, $2, $3, false)
                  ON CONFLICT (session_id, student_id) DO NOTHING
                `, [invitation.establishmentId, session.id, userId]);
                            }
                            catch (enrollError) {
                                console.warn("Failed to enroll student in future session", {
                                    sessionId: session.id,
                                    userId,
                                    error: enrollError
                                });
                            }
                        }
                    }
                }
                await client.query(`
          INSERT INTO activities (
            establishment_id, activity_type, title, description, user_id
          ) VALUES ($1, 'invitation', $2, $3, $4)
        `, [
                    invitation.establishmentId,
                    "Invitation accepted",
                    `${user.email} joined as ${userRole}`,
                    userId,
                ]);
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
        }
        catch (error) {
            this.logger.error("Failed to accept invitation", {
                error,
                token: token.substring(0, 8) + "...",
                userId,
            });
            throw error;
        }
    }
    async getInvitations(filters) {
        return await this.invitationRepository.getInvitations(filters);
    }
    async revokeInvitation(invitationId, revokedBy, establishmentId, userRole) {
        try {
            const invitationDetails = await this.invitationRepository.getInvitationById(invitationId);
            if (!invitationDetails) {
                throw new Error(ERROR_MESSAGES.INVITATION_NOT_FOUND);
            }
            if (invitationDetails.type === "instructor") {
                if (userRole !== "manager") {
                    throw new Error("Only managers can revoke instructor invitations");
                }
            }
            else {
                if (!["instructor", "manager"].includes(userRole)) {
                    throw new Error("Insufficient permissions to revoke this invitation");
                }
            }
            await this.invitationRepository.db.transaction(async (client) => {
                await client.query("UPDATE invitations SET status = $1, updated_at = NOW() WHERE id = $2", ["revoked", invitationId]);
                if (invitationDetails.type === "instructor") {
                    const exists = await this.invitationRepository.tableExists("instructor_invitations");
                    if (exists) {
                        await client.query(`
              UPDATE instructor_invitations 
              SET status = $1, updated_at = NOW()
              WHERE invitation_id = $2
            `, ["revoked", invitationId]);
                    }
                }
                await client.query(`
          INSERT INTO activities (
            establishment_id, activity_type, title, description, user_id
          ) VALUES ($1, 'invitation', $2, $3, $4)
        `, [
                    invitationDetails.establishmentId,
                    `Invitation revoked`,
                    `${invitationDetails.type} invitation revoked`,
                    revokedBy,
                ]);
            });
            this.logger.info("Invitation revoked", {
                invitationId,
                revokedBy,
                invitationType: invitationDetails.type,
                userRole,
            });
        }
        catch (error) {
            this.logger.error("Failed to revoke invitation", {
                error,
                invitationId,
                revokedBy,
            });
            throw error;
        }
    }
    async getInvitationSettings(establishmentId) {
        return await this.invitationRepository.getInvitationSettings(establishmentId);
    }
    async updateInvitationSettings(establishmentId, settings, updatedBy) {
        try {
            await this.invitationRepository.updateInvitationSettings(establishmentId, settings);
            this.logger.info("Invitation settings updated", {
                establishmentId,
                settings,
                updatedBy,
            });
        }
        catch (error) {
            this.logger.error("Failed to update invitation settings", {
                error,
                establishmentId,
            });
            throw error;
        }
    }
    async getInvitationStats(establishmentId) {
        return await this.invitationRepository.getInvitationStats(establishmentId);
    }
    async getInvitationUsage(invitationId) {
        return await this.invitationRepository.getInvitationUsage(invitationId);
    }
    generateInvitationToken() {
        return crypto.randomBytes(32).toString("base64url");
    }
    calculateExpiryHours(request, settings) {
        const requestedHours = request.expiryHours || settings.defaultExpiryHours;
        return Math.min(requestedHours, settings.studentInvitationMaxHours);
    }
    generateInvitationUrl(token) {
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return `${baseUrl}/invite/${token}`;
    }
    async addUserToEstablishment(userId, establishmentId, role) {
        try {
            await this.invitationRepository.db.query(`
        INSERT INTO user_establishments (user_id, establishment_id, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', NOW(), NOW())
        ON CONFLICT (user_id, establishment_id) DO UPDATE SET
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [userId, establishmentId, role]);
            this.logger.info("User added to establishment", {
                userId,
                establishmentId,
                role,
            });
        }
        catch (error) {
            this.logger.error("Failed to add user to establishment", {
                error,
                userId,
                establishmentId,
                role,
            });
            throw error;
        }
    }
    async enrollStudentInSession(userId, sessionId) {
        try {
            await this.invitationRepository.db.query(`
        INSERT INTO session_enrollments (session_id, student_id)
        VALUES ($1, $2)
        ON CONFLICT (session_id, student_id) DO NOTHING
      `, [sessionId, userId]);
            this.logger.info("Student enrolled in session", { userId, sessionId });
        }
        catch (error) {
            this.logger.error("Failed to enroll student in session", {
                error,
                userId,
                sessionId,
            });
        }
    }
}
