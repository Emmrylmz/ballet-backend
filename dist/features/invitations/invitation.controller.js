import { INVITATION_ERRORS, SUCCESS_MESSAGES } from "../../constants/errorMessages.js";
export class InvitationController {
    invitationService;
    logger;
    constructor(invitationService, logger) {
        this.invitationService = invitationService;
        this.logger = logger;
    }
    getClientIp(req) {
        return (req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            "unknown");
    }
    async createStudentInvitation(req, res, next) {
        try {
            const { sessionId, message, expiryHours, usageLimit } = req.body;
            if (expiryHours && (expiryHours < 0.1 || expiryHours > 24)) {
                res.status(400).json({
                    success: false,
                    message: INVITATION_ERRORS.INVALID_EXPIRY_HOURS,
                    code: "INVALID_EXPIRY_HOURS",
                });
                return;
            }
            if (usageLimit && (usageLimit < 1 || usageLimit > 50)) {
                res.status(400).json({
                    success: false,
                    message: INVITATION_ERRORS.INVALID_USAGE_LIMIT,
                    code: "INVALID_USAGE_LIMIT",
                });
                return;
            }
            const invitationRequest = {
                type: "student",
                establishmentId: req.establishment.id,
                sessionId,
                message,
                expiryHours,
                usageLimit,
            };
            const invitation = await this.invitationService.createInvitation(invitationRequest, req.user.id);
            res.status(201).json({
                success: true,
                data: invitation,
                message: SUCCESS_MESSAGES.INVITATION_CREATED,
            });
        }
        catch (error) {
            this.logger.error("Failed to create student invitation", {
                error,
                userId: req.user?.id,
            });
            next(error);
        }
    }
    async inviteInstructor(req, res, next) {
        try {
            if (req.establishment?.userRole !== "manager") {
                res.status(403).json({
                    success: false,
                    message: INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS,
                    code: "INSUFFICIENT_PERMISSIONS",
                });
                return;
            }
            const { email, phoneNumber, message, expiryHours } = req.body;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    message: INVITATION_ERRORS.INVALID_EMAIL_FORMAT,
                    code: "INVALID_EMAIL",
                });
                return;
            }
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
            if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
                res.status(400).json({
                    success: false,
                    message: INVITATION_ERRORS.INVALID_PHONE_FORMAT,
                    code: "INVALID_PHONE",
                });
                return;
            }
            if (expiryHours && (expiryHours < 0.1 || expiryHours > 24)) {
                res.status(400).json({
                    success: false,
                    message: INVITATION_ERRORS.INVALID_EXPIRY_HOURS,
                    code: "INVALID_EXPIRY_HOURS",
                });
                return;
            }
            const invitationRequest = {
                email: email.toLowerCase().trim(),
                phoneNumber: phoneNumber.trim(),
                establishmentId: req.establishment.id,
                message,
                expiryHours,
            };
            const invitation = await this.invitationService.createInstructorInvitation(invitationRequest, req.user.id);
            res.status(201).json({
                success: true,
                data: invitation,
                message: SUCCESS_MESSAGES.INVITATION_CREATED,
            });
        }
        catch (error) {
            if (error.message?.includes("aktif bir davetiye") || error.message?.includes("active instructor invitation")) {
                res.status(409).json({
                    success: false,
                    message: INVITATION_ERRORS.DUPLICATE_INVITATION,
                    code: "DUPLICATE_INVITATION",
                });
                return;
            }
            if (error.message?.includes("zaten bu kurumun üyesi") || error.message?.includes("already a member")) {
                res.status(409).json({
                    success: false,
                    message: INVITATION_ERRORS.USER_ALREADY_EXISTS,
                    code: "USER_ALREADY_EXISTS",
                });
                return;
            }
            if (error.message?.includes("Sadece yöneticiler") || error.message?.includes("Only managers")) {
                res.status(403).json({
                    success: false,
                    message: INVITATION_ERRORS.ONLY_MANAGERS_CAN_INVITE_INSTRUCTORS,
                    code: "INSUFFICIENT_PERMISSIONS",
                });
                return;
            }
            if (error.message?.includes("davetiye gönderimi devre dışı") || error.message?.includes("invitations are disabled")) {
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
    async getInvitations(req, res, next) {
        try {
            const filters = {
                establishmentId: req.establishment.id,
                type: req.query.type,
                status: req.query.status,
                limit: req.query.limit
                    ? parseInt(req.query.limit)
                    : undefined,
                offset: req.query.offset
                    ? parseInt(req.query.offset)
                    : undefined,
            };
            const invitations = await this.invitationService.getInvitations(filters);
            res.json({
                success: true,
                data: invitations,
                meta: {
                    establishmentId: req.establishment.id,
                    count: invitations.length,
                    filters,
                },
            });
        }
        catch (error) {
            this.logger.error("Failed to get invitations", {
                error,
                userId: req.user?.id,
            });
            next(error);
        }
    }
    async getInvitationUsage(req, res, next) {
        try {
            const { invitationId } = req.params;
            if (!invitationId) {
                res.status(400).json({
                    success: false,
                    message: "Invitation ID is required",
                    code: "MISSING_INVITATION_ID",
                });
                return;
            }
            const usage = await this.invitationService.getInvitationUsage(invitationId);
            res.json({
                success: true,
                data: usage,
            });
        }
        catch (error) {
            this.logger.error("Failed to get invitation usage", {
                error,
                userId: req.user?.id,
            });
            next(error);
        }
    }
    async revokeInvitation(req, res, next) {
        try {
            const { invitationId } = req.params;
            if (!invitationId) {
                res.status(400).json({
                    success: false,
                    message: "Invitation ID is required",
                    code: "MISSING_INVITATION_ID",
                });
                return;
            }
            await this.invitationService.revokeInvitation(invitationId, req.user.id, req.establishment.id, req.establishment.userRole);
            res.json({
                success: true,
                message: "Invitation revoked successfully",
            });
        }
        catch (error) {
            if (error.message?.includes("Only managers can revoke instructor invitations")) {
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
                invitationId: invitationId,
            });
            next(error);
        }
    }
    async validateInvitation(req, res, next) {
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
            const userId = req.user?.id;
            const validation = await this.invitationService.validateInvitation(token, userId);
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
                    type: validation.invitation?.type,
                    message: validation.invitation?.message,
                    expiresAt: validation.invitation?.expiresAt,
                    usageLimit: validation.invitation?.usageLimit,
                    usageCount: validation.invitation?.usageCount,
                    warningMessage: validation.warningMessage,
                    ...(validation.invitation?.type === "instructor" && validation.invitation.instructorEmail && {
                        requiredEmail: validation.invitation.instructorEmail,
                        emailNote: "This instructor invitation requires you to be logged in with the invited email address"
                    }),
                },
                message: "Valid invitation",
            });
        }
        catch (error) {
            this.logger.error("Failed to validate invitation", {
                error,
                token: req.params.token?.substring(0, 8) + "...",
            });
            next(error);
        }
    }
    async acceptInvitation(req, res, next) {
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
            const result = await this.invitationService.acceptInvitation(token, req.user.id, ipAddress, userAgent);
            res.status(200).json({
                success: true,
                message: result.message,
                warning: result.warning,
            });
        }
        catch (error) {
            if (error.message?.includes("Please log in with the correct email address")) {
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
    async getInvitationSettings(req, res, next) {
        try {
            const settings = await this.invitationService.getInvitationSettings(req.establishment.id);
            res.json({
                success: true,
                data: settings,
            });
        }
        catch (error) {
            this.logger.error("Failed to get invitation settings", {
                error,
                userId: req.user?.id,
            });
            next(error);
        }
    }
    async updateInvitationSettings(req, res, next) {
        try {
            const settings = req.body;
            if (settings.studentInvitationMaxHours &&
                (settings.studentInvitationMaxHours < 1 ||
                    settings.studentInvitationMaxHours > 24)) {
                res.status(400).json({
                    success: false,
                    message: "Student invitation max hours must be between 1 and 24",
                    code: "INVALID_SETTINGS",
                });
                return;
            }
            if (settings.defaultExpiryHours &&
                (settings.defaultExpiryHours < 1 || settings.defaultExpiryHours > 24)) {
                res.status(400).json({
                    success: false,
                    message: "Default expiry hours must be between 1 and 24",
                    code: "INVALID_SETTINGS",
                });
                return;
            }
            if (settings.studentInvitationDefaultUsageLimit &&
                (settings.studentInvitationDefaultUsageLimit < 1 ||
                    settings.studentInvitationDefaultUsageLimit > 50)) {
                res.status(400).json({
                    success: false,
                    message: "Default usage limit must be between 1 and 50",
                    code: "INVALID_SETTINGS",
                });
                return;
            }
            await this.invitationService.updateInvitationSettings(req.establishment.id, settings, req.user.id);
            res.json({
                success: true,
                message: "Invitation settings updated successfully",
            });
        }
        catch (error) {
            this.logger.error("Failed to update invitation settings", {
                error,
                userId: req.user?.id,
            });
            next(error);
        }
    }
    async getInvitationStats(req, res, next) {
        try {
            const stats = await this.invitationService.getInvitationStats(req.establishment.id);
            res.json({
                success: true,
                data: stats,
                meta: {
                    establishmentId: req.establishment.id,
                    fetchedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            this.logger.error("Failed to get invitation stats", {
                error,
                userId: req.user?.id,
            });
            next(error);
        }
    }
}
