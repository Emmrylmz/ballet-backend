import { ATTENDANCE_ERRORS, } from './attendance.types.js';
export class AttendanceController {
    attendanceService;
    logger;
    constructor(attendanceService, logger) {
        this.attendanceService = attendanceService;
        this.logger = logger;
    }
    async getSessionRoster(req, res) {
        try {
            const sessionId = req.params.sessionId;
            const establishmentId = req.establishment?.id;
            const instructorId = req.user?.id;
            if (!sessionId) {
                res.status(400).json({
                    success: false,
                    message: 'Session ID required',
                    error: {
                        code: 'MISSING_SESSION_ID',
                        message: 'Session ID parameter is required'
                    }
                });
                return;
            }
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment context required',
                    error: {
                        code: 'MISSING_ESTABLISHMENT',
                        message: 'No establishment context provided'
                    }
                });
                return;
            }
            const roster = await this.attendanceService.getSessionRoster(sessionId, establishmentId, instructorId);
            res.json({
                success: true,
                data: roster,
                message: 'Session roster retrieved successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in getSessionRoster controller', {
                error: error.message,
                sessionId: req.params.sessionId,
                userId: req.user?.id
            });
            const statusCode = this.getErrorStatusCode(error.message);
            res.status(statusCode).json({
                success: false,
                message: 'Failed to get session roster',
                error: {
                    code: error.message,
                    message: this.getErrorMessage(error.message)
                }
            });
        }
    }
    async markAttendance(req, res) {
        try {
            const sessionId = req.params.sessionId;
            const studentId = req.params.studentId;
            const establishmentId = req.establishment?.id;
            const markedBy = req.user?.id;
            const instructorId = req.user?.id;
            const request = req.body;
            if (!sessionId || !studentId || !establishmentId || !markedBy) {
                res.status(400).json({
                    success: false,
                    message: 'Authentication and establishment context required',
                    error: {
                        code: 'MISSING_CONTEXT',
                        message: 'Missing required authentication or establishment context'
                    }
                });
                return;
            }
            if (!request.status || !['present', 'late', 'absent', 'excused'].includes(request.status)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid attendance status required',
                    error: {
                        code: ATTENDANCE_ERRORS.INVALID_ATTENDANCE_STATUS,
                        message: 'Status must be one of: present, late, absent, excused'
                    }
                });
                return;
            }
            const attendanceRecord = await this.attendanceService.markAttendance(sessionId, studentId, establishmentId, request, markedBy, instructorId);
            res.json({
                success: true,
                data: attendanceRecord,
                message: 'Attendance marked successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in markAttendance controller', {
                error: error.message,
                sessionId: req.params.sessionId,
                studentId: req.params.studentId,
                userId: req.user?.id
            });
            const statusCode = this.getErrorStatusCode(error.message);
            res.status(statusCode).json({
                success: false,
                message: 'Failed to mark attendance',
                error: {
                    code: error.message,
                    message: this.getErrorMessage(error.message)
                }
            });
        }
    }
    async bulkMarkAttendance(req, res) {
        try {
            const sessionId = req.params.sessionId;
            const establishmentId = req.establishment?.id;
            const markedBy = req.user?.id;
            const instructorId = req.user?.id;
            const request = req.body;
            if (!sessionId || !establishmentId || !markedBy) {
                res.status(400).json({
                    success: false,
                    message: 'Authentication and establishment context required',
                    error: {
                        code: 'MISSING_CONTEXT',
                        message: 'Missing required authentication or establishment context'
                    }
                });
                return;
            }
            if (!request.attendanceRecords || !Array.isArray(request.attendanceRecords) || request.attendanceRecords.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Attendance records array required',
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'attendanceRecords must be a non-empty array'
                    }
                });
                return;
            }
            const validStatuses = ['present', 'late', 'absent', 'excused'];
            for (const record of request.attendanceRecords) {
                if (!record.studentId || !record.status || !validStatuses.includes(record.status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid attendance record format',
                        error: {
                            code: ATTENDANCE_ERRORS.INVALID_ATTENDANCE_STATUS,
                            message: 'Each record must have studentId and valid status'
                        }
                    });
                    return;
                }
            }
            const attendanceRecords = await this.attendanceService.bulkMarkAttendance(sessionId, establishmentId, request, markedBy, instructorId);
            res.json({
                success: true,
                data: attendanceRecords,
                message: `Bulk attendance marked for ${attendanceRecords.length} students`
            });
        }
        catch (error) {
            this.logger.error('Error in bulkMarkAttendance controller', {
                error: error.message,
                sessionId: req.params.sessionId,
                recordCount: req.body.attendanceRecords?.length,
                userId: req.user?.id
            });
            const statusCode = this.getErrorStatusCode(error.message);
            res.status(statusCode).json({
                success: false,
                message: 'Failed to bulk mark attendance',
                error: {
                    code: error.message,
                    message: this.getErrorMessage(error.message)
                }
            });
        }
    }
    async updateAttendance(req, res) {
        try {
            const attendanceId = req.params.attendanceId;
            const establishmentId = req.establishment?.id;
            const markedBy = req.user?.id;
            const instructorId = req.user?.id;
            const request = req.body;
            if (!attendanceId || !establishmentId || !markedBy) {
                res.status(400).json({
                    success: false,
                    message: 'Authentication and establishment context required',
                    error: {
                        code: 'MISSING_CONTEXT',
                        message: 'Missing required authentication or establishment context'
                    }
                });
                return;
            }
            if (request.status && !['present', 'late', 'absent', 'excused'].includes(request.status)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid attendance status required',
                    error: {
                        code: ATTENDANCE_ERRORS.INVALID_ATTENDANCE_STATUS,
                        message: 'Status must be one of: present, late, absent, excused'
                    }
                });
                return;
            }
            const updatedRecord = await this.attendanceService.updateAttendance(attendanceId, establishmentId, request, markedBy, instructorId);
            res.json({
                success: true,
                data: updatedRecord,
                message: 'Attendance updated successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in updateAttendance controller', {
                error: error.message,
                attendanceId: req.params.attendanceId,
                userId: req.user?.id
            });
            const statusCode = this.getErrorStatusCode(error.message);
            res.status(statusCode).json({
                success: false,
                message: 'Failed to update attendance',
                error: {
                    code: error.message,
                    message: this.getErrorMessage(error.message)
                }
            });
        }
    }
    async getAttendanceRecords(req, res) {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment context required',
                    error: {
                        code: 'MISSING_ESTABLISHMENT',
                        message: 'No establishment context provided'
                    }
                });
                return;
            }
            const filters = {
                sessionId: req.query.sessionId,
                studentId: req.query.studentId,
                instructorId: req.query.instructorId,
                cohortId: req.query.cohortId,
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined
            };
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const result = await this.attendanceService.getAttendanceRecords(establishmentId, filters);
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            const totalPages = Math.ceil(result.total / limit);
            const currentPage = Math.floor(offset / limit) + 1;
            res.json({
                success: true,
                data: result.records,
                pagination: {
                    total: result.total,
                    page: currentPage,
                    limit: limit,
                    totalPages: totalPages
                },
                message: 'Attendance records retrieved successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in getAttendanceRecords controller', {
                error: error.message,
                query: req.query,
                userId: req.user?.id
            });
            res.status(500).json({
                success: false,
                data: [],
                pagination: {
                    total: 0,
                    page: 1,
                    limit: 50,
                    totalPages: 0
                },
                message: 'Failed to get attendance records',
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An internal error occurred'
                }
            });
        }
    }
    async getStudentAttendanceHistory(req, res) {
        try {
            const studentId = req.params.studentId;
            const establishmentId = req.establishment?.id;
            if (!studentId || !establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment context required',
                    error: {
                        code: 'MISSING_ESTABLISHMENT',
                        message: 'No establishment context provided'
                    }
                });
                return;
            }
            const history = await this.attendanceService.getStudentAttendanceHistory(studentId, establishmentId);
            res.json({
                success: true,
                data: history,
                message: 'Student attendance history retrieved successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in getStudentAttendanceHistory controller', {
                error: error.message,
                studentId: req.params.studentId,
                userId: req.user?.id
            });
            const statusCode = this.getErrorStatusCode(error.message);
            res.status(statusCode).json({
                success: false,
                message: 'Failed to get student attendance history',
                error: {
                    code: error.message,
                    message: this.getErrorMessage(error.message)
                }
            });
        }
    }
    async getSessionAttendanceStats(req, res) {
        try {
            const sessionId = req.params.sessionId;
            const establishmentId = req.establishment?.id;
            if (!sessionId || !establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment context required',
                    error: {
                        code: 'MISSING_ESTABLISHMENT',
                        message: 'No establishment context provided'
                    }
                });
                return;
            }
            const stats = await this.attendanceService.getSessionAttendanceStats(sessionId, establishmentId);
            res.json({
                success: true,
                data: stats,
                message: 'Session attendance stats retrieved successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in getSessionAttendanceStats controller', {
                error: error.message,
                sessionId: req.params.sessionId,
                userId: req.user?.id
            });
            const statusCode = this.getErrorStatusCode(error.message);
            res.status(statusCode).json({
                success: false,
                message: 'Failed to get session attendance stats',
                error: {
                    code: error.message,
                    message: this.getErrorMessage(error.message)
                }
            });
        }
    }
    async getAttendanceTrends(req, res) {
        try {
            const establishmentId = req.establishment?.id;
            if (!establishmentId) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment context required',
                    error: {
                        code: 'MISSING_ESTABLISHMENT',
                        message: 'No establishment context provided'
                    }
                });
                return;
            }
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                cohortId: req.query.cohortId,
                instructorId: req.query.instructorId
            };
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const trends = await this.attendanceService.getAttendanceTrends(establishmentId, filters);
            res.json({
                success: true,
                data: trends,
                message: 'Attendance trends retrieved successfully'
            });
        }
        catch (error) {
            this.logger.error('Error in getAttendanceTrends controller', {
                error: error.message,
                query: req.query,
                userId: req.user?.id
            });
            res.status(500).json({
                success: false,
                message: 'Failed to get attendance trends',
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An internal error occurred'
                }
            });
        }
    }
    getErrorStatusCode(errorCode) {
        switch (errorCode) {
            case ATTENDANCE_ERRORS.SESSION_NOT_FOUND:
            case ATTENDANCE_ERRORS.ATTENDANCE_RECORD_NOT_FOUND:
                return 404;
            case ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR:
                return 403;
            case ATTENDANCE_ERRORS.STUDENT_NOT_ENROLLED:
            case ATTENDANCE_ERRORS.INVALID_ATTENDANCE_STATUS:
                return 400;
            case ATTENDANCE_ERRORS.BULK_ATTENDANCE_FAILED:
                return 422;
            default:
                return 500;
        }
    }
    getErrorMessage(errorCode) {
        switch (errorCode) {
            case ATTENDANCE_ERRORS.SESSION_NOT_FOUND:
                return 'Session not found or not accessible';
            case ATTENDANCE_ERRORS.STUDENT_NOT_ENROLLED:
                return 'Student is not enrolled in this session';
            case ATTENDANCE_ERRORS.ATTENDANCE_ALREADY_MARKED:
                return 'Attendance has already been marked for this student';
            case ATTENDANCE_ERRORS.SESSION_NOT_ACTIVE:
                return 'Cannot mark attendance for inactive session';
            case ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR:
                return 'You are not authorized to mark attendance for this session';
            case ATTENDANCE_ERRORS.INVALID_ATTENDANCE_STATUS:
                return 'Invalid attendance status provided';
            case ATTENDANCE_ERRORS.BULK_ATTENDANCE_FAILED:
                return 'Some attendance records could not be marked';
            case ATTENDANCE_ERRORS.ATTENDANCE_RECORD_NOT_FOUND:
                return 'Attendance record not found';
            default:
                return 'An internal error occurred';
        }
    }
}
