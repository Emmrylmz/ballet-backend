import { ERROR_MESSAGES } from "../../utils/error-messages.js";
export class StudentsController {
    studentsService;
    logger;
    constructor(studentsService, logger) {
        this.studentsService = studentsService;
        this.logger = logger;
    }
    searchStudents = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const { q, status = "active", cohortId, available, ageMin, ageMax, limit = 20, page = 1, } = req.query;
            const filters = {
                q: q,
                status: status,
                cohortId: cohortId,
                available: available === "true",
                ageMin: ageMin ? parseInt(ageMin) : undefined,
                ageMax: ageMax ? parseInt(ageMax) : undefined,
                limit: Math.min(parseInt(limit) || 20, 100),
                offset: (parseInt(page) - 1 || 0) *
                    (parseInt(limit) || 20),
            };
            this.logger.info("Searching students via API", {
                establishmentId,
                filters: { ...filters, q: filters.q ? `"${filters.q}"` : undefined },
                userId: req.user?.id,
                ip: this.getClientIp(req),
            });
            const result = await this.studentsService.searchStudents(establishmentId, filters);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    getStudentProfile = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
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
            const result = await this.studentsService.getStudentProfile(establishmentId, id);
            if (result.success) {
                res.status(200).json(result);
            }
            else if (result.error?.code === "STUDENT_NOT_FOUND") {
                res.status(404).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    createStudent = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_ESTABLISHMENT_ACCESS,
                    code: "ESTABLISHMENT_ACCESS_ERROR",
                });
                return;
            }
            const studentData = req.body;
            const userId = req.user?.id;
            this.logger.info("Creating student via API", {
                establishmentId,
                studentName: studentData.name,
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.studentsService.createStudent(establishmentId, studentData, undefined);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    updateStudent = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
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
            const updates = req.body;
            const userId = req.user?.id;
            this.logger.info("Updating student via API", {
                establishmentId,
                studentId: id,
                updates: Object.keys(updates),
                userId,
                ip: this.getClientIp(req),
            });
            const result = await this.studentsService.updateStudent(establishmentId, id, updates);
            if (result.success) {
                res.status(200).json(result);
            }
            else if (result.error?.code === "STUDENT_NOT_FOUND") {
                res.status(404).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    getSessionRoster = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
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
            const result = await this.studentsService.getSessionRoster(establishmentId, sessionId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    getStudentsStats = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
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
            const result = await this.studentsService.getStudentsStats(establishmentId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    deactivateStudent = async (req, res) => {
        try {
            const establishmentId = req.establishment?.id || "0a9edc36-9a58-4f0b-a007-3f1ae8ad050d";
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
            const result = await this.studentsService.deactivateStudent(establishmentId, id);
            if (result.success) {
                res.status(200).json({
                    ...result,
                    message: "Student deactivated successfully",
                });
            }
            else if (result.error?.code === "STUDENT_NOT_FOUND") {
                res.status(404).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
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
    getClientIp(req) {
        return (req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            "unknown");
    }
}
