import { ERROR_MESSAGES } from "../../utils/error-messages.js";
export class ClassesController {
    classesService;
    logger;
    constructor(classesService, logger) {
        this.classesService = classesService;
        this.logger = logger;
    }
    getEstablishmentId(req) {
        const establishmentId = req.establishment?.id;
        if (!establishmentId) {
            throw new Error(ERROR_MESSAGES.ESTABLISHMENT_ID_REQUIRED);
        }
        return establishmentId;
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
    createTemplate = async (req, res) => {
        try {
            const establishmentId = this.getEstablishmentId(req);
            const templateRequest = req.body;
            const userId = req.user?.id || "";
            this.logger.info("Creating class template via API", {
                establishmentId,
                title: templateRequest.title,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.createClassTemplate(establishmentId, templateRequest, userId);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in createTemplate controller", {
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
    getTemplate = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.ESTABLISHMENT_CONTEXT_REQUIRED,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const result = await this.classesService.getClassTemplate(establishmentId, id);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(404).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getTemplate controller", {
                error,
                templateId: req.params.id,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    getTemplates = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const filters = {
                classType: req.query.classType,
                skillLevel: req.query.skillLevel,
                instructorId: req.query.instructorId,
                isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            };
            const result = await this.classesService.getClassTemplates(establishmentId, filters);
            res.status(200).json(result);
        }
        catch (error) {
            this.logger.error("Error in getTemplates controller", {
                error,
                filters: req.query,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    updateTemplate = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const updates = req.body;
            const userId = req.user?.id || "";
            this.logger.info("Updating class template via API", {
                establishmentId,
                templateId: id,
                userId,
                updates: Object.keys(updates),
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.updateClassTemplate(establishmentId, id, updates, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in updateTemplate controller", {
                error,
                templateId: req.params.id,
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
    deleteTemplate = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
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
            const result = await this.classesService.deleteClassTemplate(establishmentId, id, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in deleteTemplate controller", {
                error,
                templateId: req.params.id,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    generateSessions = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const request = req.body;
            const userId = req.user?.id || "";
            this.logger.info("Generating sessions from template via API", {
                establishmentId,
                templateId: id,
                startDate: request.startDate,
                endDate: request.endDate,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.generateSessionsFromTemplate(establishmentId, id, request, userId);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in generateSessions controller", {
                error,
                templateId: req.params.id,
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
    createBulkSessions = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const sessions = req.body.sessions;
            const userId = req.user?.id || "";
            if (!Array.isArray(sessions) || sessions.length === 0) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.SESSIONS_ARRAY_REQUIRED,
                    code: "INVALID_SESSIONS_ARRAY",
                });
                return;
            }
            this.logger.info("Creating bulk class sessions via API", {
                establishmentId,
                sessionCount: sessions.length,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.createBulkClassSessions(establishmentId, sessions, userId);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in createBulkSessions controller", {
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
    bulkEnrollUsers = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const { userIds, isWaitlist = false } = req.body;
            const userId = req.user?.id || "";
            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.USERIDS_ARRAY_REQUIRED,
                    code: "INVALID_USER_IDS_ARRAY",
                });
                return;
            }
            this.logger.info("Bulk enrolling users in session via API", {
                establishmentId,
                sessionId: id,
                userCount: userIds.length,
                isWaitlist,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.bulkEnrollUsersInSession(establishmentId, id, userIds, userId, isWaitlist);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in bulkEnrollUsers controller", {
                error,
                sessionId: req.params.id,
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
    createSession = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const sessionRequest = req.body;
            const userId = req.user?.id || "";
            this.logger.info("Creating class session via API", {
                establishmentId,
                sessionDate: sessionRequest.sessionDate,
                cohortId: sessionRequest.cohortId,
                overrideInstructorId: sessionRequest.override_instructor_id,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.createClassSession(establishmentId, sessionRequest, userId);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in createSession controller", {
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
    getSession = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const result = await this.classesService.getClassSession(establishmentId, id);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(404).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getSession controller", {
                error,
                sessionId: req.params.id,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    getSessions = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                instructorId: req.query.instructorId,
                status: req.query.status,
                classTemplateId: req.query.classTemplateId,
                cohortId: req.query.cohortId,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            };
            const result = await this.classesService.getClassSessions(establishmentId, filters);
            res.status(200).json(result);
        }
        catch (error) {
            this.logger.error("Error in getSessions controller", {
                error,
                filters: req.query,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    getUpcomingSessions = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const daysAhead = req.query.days ? parseInt(req.query.days) : 7;
            const result = await this.classesService.getUpcomingSessions(establishmentId, daysAhead);
            res.status(200).json(result);
        }
        catch (error) {
            this.logger.error("Error in getUpcomingSessions controller", {
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
    updateSession = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const updates = req.body;
            const userId = req.user?.id || "";
            this.logger.info("Updating class session via API", {
                establishmentId,
                sessionId: id,
                userId,
                updates: Object.keys(updates),
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.updateClassSession(establishmentId, id, updates, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in updateSession controller", {
                error,
                sessionId: req.params.id,
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
    cancelSession = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
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
            const result = await this.classesService.cancelClassSession(establishmentId, id, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in cancelSession controller", {
                error,
                sessionId: req.params.id,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    enrollStudents = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const request = req.body;
            const userId = req.user?.id || "";
            this.logger.info("Enrolling students in session via API", {
                establishmentId,
                sessionId: id,
                studentCount: request.studentIds?.length || 0,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.classesService.enrollStudents(establishmentId, id, request, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in enrollStudents controller", {
                error,
                sessionId: req.params.id,
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
    removeStudent = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
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
            const result = await this.classesService.removeStudentFromSession(establishmentId, id, studentId, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in removeStudent controller", {
                error,
                sessionId: req.params.id,
                studentId: req.params.studentId,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    getSessionEnrollments = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { id } = req.params;
            const result = await this.classesService.getSessionEnrollments(establishmentId, id);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getSessionEnrollments controller", {
                error,
                sessionId: req.params.id,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    getStudentEnrolledSessions = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { studentId } = req.params;
            const includeCompleted = req.query.includeCompleted === 'true';
            const result = await this.classesService.getStudentEnrolledSessions(establishmentId, studentId, includeCompleted);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getStudentEnrolledSessions controller", {
                error,
                studentId: req.params.studentId,
                userId: req.user?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
    getStats = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const result = await this.classesService.getClassStats(establishmentId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getStats controller", {
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
    getCalendarEvents = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            if (!startDate || !endDate) {
                res.status(400).json({
                    success: false,
                    message: "Start date and end date are required",
                    code: "MISSING_DATE_RANGE",
                });
                return;
            }
            const result = await this.classesService.getCalendarEvents(establishmentId, startDate, endDate);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getCalendarEvents controller", {
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
    getDropdownData = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: "Establishment ID is required. Please provide X-Establishment-ID header.",
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const result = await this.classesService.getDropdownData(establishmentId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            this.logger.error("Error in getDropdownData controller", {
                error,
                userId: req.user?.id,
                establishmentId: req.establishment?.id,
            });
            res.status(500).json({
                success: false,
                message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
            });
        }
    };
}
