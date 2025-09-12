import { ATTENDANCE_ERRORS, } from './attendance.types.js';
export class AttendanceService {
    attendanceRepository;
    logger;
    constructor(attendanceRepository, logger) {
        this.attendanceRepository = attendanceRepository;
        this.logger = logger;
    }
    async getSessionRoster(sessionId, establishmentId, instructorId) {
        try {
            this.logger.info('Getting session roster', {
                sessionId,
                establishmentId,
                instructorId
            });
            if (instructorId) {
                const isAuthorized = await this.attendanceRepository.isInstructorAuthorized(sessionId, instructorId, establishmentId);
                if (!isAuthorized) {
                    this.logger.warn('Unauthorized instructor attempted to access session roster', {
                        sessionId,
                        instructorId,
                        establishmentId
                    });
                    throw new Error(ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR);
                }
            }
            const roster = await this.attendanceRepository.getSessionRoster(sessionId, establishmentId);
            if (!roster) {
                this.logger.warn('Session not found for roster', { sessionId, establishmentId });
                throw new Error(ATTENDANCE_ERRORS.SESSION_NOT_FOUND);
            }
            this.logger.info('Session roster retrieved successfully', {
                sessionId,
                enrollmentCount: roster.enrollments.length,
                attendanceRate: roster.attendanceStats.attendanceRate
            });
            return roster;
        }
        catch (error) {
            this.logger.error('Error getting session roster', {
                error: error.message,
                sessionId,
                establishmentId,
                instructorId
            });
            throw error;
        }
    }
    async markAttendance(sessionId, studentId, establishmentId, request, markedBy, instructorId) {
        try {
            this.logger.info('Marking attendance', {
                sessionId,
                studentId,
                status: request.status,
                markedBy,
                instructorId
            });
            const validation = await this.validateAttendanceMarking(sessionId, studentId, establishmentId, instructorId);
            if (!validation.canMarkAttendance) {
                this.logger.warn('Attendance marking validation failed', {
                    reason: validation.reason,
                    sessionId,
                    studentId,
                    instructorId
                });
                throw new Error(validation.reason);
            }
            if (validation.warnings && validation.warnings.length > 0) {
                this.logger.warn('Attendance marking warnings', {
                    warnings: validation.warnings,
                    sessionId,
                    studentId
                });
            }
            const attendanceRecord = await this.attendanceRepository.markAttendance(sessionId, studentId, establishmentId, request, markedBy);
            this.logger.info('Attendance marked successfully', {
                attendanceId: attendanceRecord.id,
                sessionId,
                studentId,
                status: attendanceRecord.status
            });
            return attendanceRecord;
        }
        catch (error) {
            this.logger.error('Error marking attendance', {
                error: error.message,
                sessionId,
                studentId,
                establishmentId,
                request
            });
            throw error;
        }
    }
    async bulkMarkAttendance(sessionId, establishmentId, request, markedBy, instructorId) {
        try {
            this.logger.info('Bulk marking attendance', {
                sessionId,
                establishmentId,
                recordCount: request.attendanceRecords.length,
                markedBy,
                instructorId
            });
            if (instructorId) {
                const isAuthorized = await this.attendanceRepository.isInstructorAuthorized(sessionId, instructorId, establishmentId);
                if (!isAuthorized) {
                    this.logger.warn('Unauthorized instructor attempted bulk attendance marking', {
                        sessionId,
                        instructorId,
                        establishmentId
                    });
                    throw new Error(ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR);
                }
            }
            const validationPromises = request.attendanceRecords.map(record => this.validateAttendanceMarking(sessionId, record.studentId, establishmentId));
            const validations = await Promise.all(validationPromises);
            const failedValidations = validations.filter(v => !v.canMarkAttendance);
            if (failedValidations.length > 0) {
                this.logger.warn('Bulk attendance marking validation failures', {
                    failedCount: failedValidations.length,
                    failures: failedValidations.map(f => f.reason)
                });
                throw new Error(ATTENDANCE_ERRORS.BULK_ATTENDANCE_FAILED);
            }
            const attendanceRecords = await this.attendanceRepository.bulkMarkAttendance(sessionId, establishmentId, request.attendanceRecords, markedBy);
            this.logger.info('Bulk attendance marked successfully', {
                sessionId,
                recordCount: attendanceRecords.length,
                statusBreakdown: this.getStatusBreakdown(attendanceRecords)
            });
            return attendanceRecords;
        }
        catch (error) {
            this.logger.error('Error bulk marking attendance', {
                error: error.message,
                sessionId,
                establishmentId,
                requestRecordCount: request.attendanceRecords.length
            });
            throw error;
        }
    }
    async updateAttendance(attendanceId, establishmentId, request, markedBy, instructorId) {
        try {
            this.logger.info('Updating attendance', {
                attendanceId,
                establishmentId,
                request,
                markedBy,
                instructorId
            });
            const updatedRecord = await this.attendanceRepository.updateAttendance(attendanceId, establishmentId, request, markedBy);
            if (!updatedRecord) {
                this.logger.warn('Attendance record not found for update', {
                    attendanceId,
                    establishmentId
                });
                throw new Error(ATTENDANCE_ERRORS.ATTENDANCE_RECORD_NOT_FOUND);
            }
            this.logger.info('Attendance updated successfully', {
                attendanceId,
                newStatus: updatedRecord.status
            });
            return updatedRecord;
        }
        catch (error) {
            this.logger.error('Error updating attendance', {
                error: error.message,
                attendanceId,
                establishmentId,
                request
            });
            throw error;
        }
    }
    async getAttendanceRecords(establishmentId, filters) {
        try {
            this.logger.info('Getting attendance records', {
                establishmentId,
                filters
            });
            const result = await this.attendanceRepository.getAttendanceRecords(establishmentId, filters);
            this.logger.info('Attendance records retrieved successfully', {
                recordCount: result.records.length,
                total: result.total,
                filters
            });
            return result;
        }
        catch (error) {
            this.logger.error('Error getting attendance records', {
                error: error.message,
                establishmentId,
                filters
            });
            throw error;
        }
    }
    async getStudentAttendanceHistory(studentId, establishmentId) {
        try {
            this.logger.info('Getting student attendance history', {
                studentId,
                establishmentId
            });
            const history = await this.attendanceRepository.getStudentAttendanceHistory(studentId, establishmentId);
            if (!history) {
                this.logger.warn('Student not found for attendance history', {
                    studentId,
                    establishmentId
                });
                throw new Error('Student not found');
            }
            this.logger.info('Student attendance history retrieved successfully', {
                studentId,
                totalSessions: history.totalSessions,
                attendanceRate: history.attendanceRate
            });
            return history;
        }
        catch (error) {
            this.logger.error('Error getting student attendance history', {
                error: error.message,
                studentId,
                establishmentId
            });
            throw error;
        }
    }
    async getSessionAttendanceStats(sessionId, establishmentId) {
        try {
            this.logger.info('Getting session attendance stats', {
                sessionId,
                establishmentId
            });
            const stats = await this.attendanceRepository.getSessionAttendanceStats(sessionId, establishmentId);
            if (!stats) {
                this.logger.warn('Session not found for attendance stats', {
                    sessionId,
                    establishmentId
                });
                throw new Error(ATTENDANCE_ERRORS.SESSION_NOT_FOUND);
            }
            this.logger.info('Session attendance stats retrieved successfully', {
                sessionId,
                attendanceRate: stats.attendanceRate,
                totalEnrolled: stats.totalEnrolled
            });
            return stats;
        }
        catch (error) {
            this.logger.error('Error getting session attendance stats', {
                error: error.message,
                sessionId,
                establishmentId
            });
            throw error;
        }
    }
    async validateAttendanceMarking(sessionId, studentId, establishmentId, instructorId) {
        const validation = {
            canMarkAttendance: false,
            warnings: []
        };
        try {
            const canMark = await this.attendanceRepository.canMarkAttendance(sessionId, studentId, establishmentId);
            if (!canMark) {
                validation.reason = ATTENDANCE_ERRORS.STUDENT_NOT_ENROLLED;
                return validation;
            }
            if (instructorId) {
                const isAuthorized = await this.attendanceRepository.isInstructorAuthorized(sessionId, instructorId, establishmentId);
                if (!isAuthorized) {
                    validation.reason = ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR;
                    return validation;
                }
            }
            validation.canMarkAttendance = true;
            return validation;
        }
        catch (error) {
            this.logger.error('Error validating attendance marking', {
                error: error.message,
                sessionId,
                studentId,
                establishmentId
            });
            validation.reason = 'Validation error occurred';
            return validation;
        }
    }
    getStatusBreakdown(records) {
        return records.reduce((breakdown, record) => {
            breakdown[record.status] = (breakdown[record.status] || 0) + 1;
            return breakdown;
        }, {});
    }
    calculateAttendanceRate(present, late, total) {
        if (total === 0)
            return 0;
        return Math.round(((present + late) / total) * 100 * 100) / 100;
    }
    categorizeAttendanceRate(rate) {
        if (rate >= 90)
            return 'excellent';
        if (rate >= 75)
            return 'good';
        if (rate >= 60)
            return 'needs_improvement';
        return 'concerning';
    }
    async getAttendanceTrends(establishmentId, filters) {
        try {
            this.logger.info('Getting attendance trends', { establishmentId, filters });
            const records = await this.attendanceRepository.getAttendanceRecords(establishmentId, {
                ...filters,
                limit: 1000
            });
            const totalRecords = records.records.length;
            const attendedCount = records.records.filter(r => r.status === 'present' || r.status === 'late').length;
            const overallRate = this.calculateAttendanceRate(records.records.filter(r => r.status === 'present').length, records.records.filter(r => r.status === 'late').length, totalRecords);
            const statusDistribution = records.records.reduce((dist, record) => {
                dist[record.status] = (dist[record.status] || 0) + 1;
                return dist;
            }, {});
            return {
                overallRate,
                monthlyTrends: [],
                statusDistribution
            };
        }
        catch (error) {
            this.logger.error('Error getting attendance trends', {
                error: error.message,
                establishmentId,
                filters
            });
            throw error;
        }
    }
}
