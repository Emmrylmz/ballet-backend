import { Router } from 'express';
import { AuthMiddleware } from '../auth/middleware/AuthMiddleware.js';
import { EstablishmentMiddleware } from '../../middleware/EstablishmentMiddleware.js';
import { body, param, query, validationResult } from 'express-validator';
const validationMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
        return;
    }
    next();
};
export default function createAttendanceRoutes(db, logger, tokenService, authRepository, passwordService, cookieService) {
    const authMiddleware = new AuthMiddleware(tokenService, cookieService, authRepository, logger);
    const establishmentMiddleware = new EstablishmentMiddleware(logger, db);
    const sessionIdValidation = [
        param('sessionId').isUUID().withMessage('Session ID must be a valid UUID')
    ];
    const studentIdValidation = [
        param('studentId').isUUID().withMessage('Student ID must be a valid UUID')
    ];
    const attendanceIdValidation = [
        param('attendanceId').isUUID().withMessage('Attendance ID must be a valid UUID')
    ];
    const markAttendanceValidation = [
        body('status')
            .isIn(['present', 'late', 'absent', 'excused'])
            .withMessage('Status must be one of: present, late, absent, excused'),
        body('notes')
            .optional()
            .isString()
            .isLength({ max: 1000 })
            .withMessage('Notes must be a string with maximum 1000 characters')
    ];
    const bulkAttendanceValidation = [
        body('attendanceRecords')
            .isArray({ min: 1 })
            .withMessage('Attendance records must be a non-empty array'),
        body('attendanceRecords.*.studentId')
            .isUUID()
            .withMessage('Each record must have a valid student ID'),
        body('attendanceRecords.*.status')
            .isIn(['present', 'late', 'absent', 'excused'])
            .withMessage('Each record must have a valid status'),
        body('attendanceRecords.*.notes')
            .optional()
            .isString()
            .isLength({ max: 500 })
            .withMessage('Notes must be a string with maximum 500 characters')
    ];
    const updateAttendanceValidation = [
        body('status')
            .optional()
            .isIn(['present', 'late', 'absent', 'excused'])
            .withMessage('Status must be one of: present, late, absent, excused'),
        body('notes')
            .optional()
            .isString()
            .isLength({ max: 1000 })
            .withMessage('Notes must be a string with maximum 1000 characters')
    ];
    const attendanceFiltersValidation = [
        query('sessionId').optional().isUUID().withMessage('Session ID must be a valid UUID'),
        query('studentId').optional().isUUID().withMessage('Student ID must be a valid UUID'),
        query('instructorId').optional().isUUID().withMessage('Instructor ID must be a valid UUID'),
        query('cohortId').optional().isUUID().withMessage('Cohort ID must be a valid UUID'),
        query('status')
            .optional()
            .isIn(['present', 'late', 'absent', 'excused'])
            .withMessage('Status must be one of: present, late, absent, excused'),
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be in ISO 8601 format'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be in ISO 8601 format'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset must be non-negative')
    ];
    return (attendanceController) => {
        const router = Router();
        router.get('/sessions/:sessionId/roster', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), sessionIdValidation, validationMiddleware, attendanceController.getSessionRoster.bind(attendanceController));
        router.post('/sessions/:sessionId/student/:studentId', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), [...sessionIdValidation, ...studentIdValidation, ...markAttendanceValidation], validationMiddleware, attendanceController.markAttendance.bind(attendanceController));
        router.put('/sessions/:sessionId/bulk', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), [...sessionIdValidation, ...bulkAttendanceValidation], validationMiddleware, attendanceController.bulkMarkAttendance.bind(attendanceController));
        router.put('/:attendanceId', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), [...attendanceIdValidation, ...updateAttendanceValidation], validationMiddleware, attendanceController.updateAttendance.bind(attendanceController));
        router.get('/sessions/:sessionId', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), sessionIdValidation, validationMiddleware, (req, res) => {
            req.query.sessionId = req.params.sessionId;
            attendanceController.getAttendanceRecords.bind(attendanceController)(req, res);
        });
        router.get('/records', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), attendanceFiltersValidation, validationMiddleware, attendanceController.getAttendanceRecords.bind(attendanceController));
        router.get('/students/:studentId/history', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), studentIdValidation, validationMiddleware, attendanceController.getStudentAttendanceHistory.bind(attendanceController));
        router.get('/sessions/:sessionId/stats', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), sessionIdValidation, validationMiddleware, attendanceController.getSessionAttendanceStats.bind(attendanceController));
        router.get('/trends', authMiddleware.authenticate.bind(authMiddleware), establishmentMiddleware.validateEstablishmentAccess.bind(establishmentMiddleware), [
            query('startDate').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
            query('endDate').optional().isISO8601().withMessage('End date must be in ISO 8601 format'),
            query('cohortId').optional().isUUID().withMessage('Cohort ID must be a valid UUID'),
            query('instructorId').optional().isUUID().withMessage('Instructor ID must be a valid UUID')
        ], validationMiddleware, attendanceController.getAttendanceTrends.bind(attendanceController));
        return router;
    };
}
