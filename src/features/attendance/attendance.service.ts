import { LoggerService } from "../../services/LoggerService.js";
import { AttendanceRepository } from "./attendance.repository.js";
import {
  AttendanceRecord,
  SessionRoster,
  AttendanceFilters,
  StudentAttendanceHistory,
  SessionAttendanceStats,
  MarkAttendanceRequest,
  UpdateAttendanceRequest,
  BulkAttendanceRequest,
  AttendanceValidation,
  AttendanceStatus,
  ATTENDANCE_ERRORS,
} from "./attendance.types.js";

export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private logger: LoggerService
  ) {}

  async getSessionRoster(
    sessionId: string,
    establishmentId: string,
    instructorId?: string
  ): Promise<SessionRoster> {
    try {
      this.logger.info("Getting session roster", {
        sessionId,
        establishmentId,
        instructorId,
      });

      const roster = await this.attendanceRepository.getSessionRoster(
        sessionId,
        establishmentId
      );

      if (!roster) {
        this.logger.warn("Session not found for roster", {
          sessionId,
          establishmentId,
        });
        throw new Error(ATTENDANCE_ERRORS.SESSION_NOT_FOUND);
      }

      this.logger.info("Session roster retrieved successfully", {
        sessionId,
        enrollmentCount: roster.enrollments.length,
        attendanceRate: roster.attendanceStats.attendanceRate,
      });

      return roster;
    } catch (error: any) {
      this.logger.error("Error getting session roster", {
        error: error.message,
        sessionId,
        establishmentId,
        instructorId,
      });
      throw error;
    }
  }

  async markAttendance(
    sessionId: string,
    studentId: string,
    establishmentId: string,
    request: MarkAttendanceRequest,
    markedBy: string,
    instructorId?: string
  ): Promise<AttendanceRecord> {
    try {
      this.logger.info("Marking attendance", {
        sessionId,
        studentId,
        status: request.status,
        markedBy,
        instructorId,
      });

      // Validate attendance can be marked
      const validation = await this.validateAttendanceMarking(
        sessionId,
        studentId,
        establishmentId,
        instructorId
      );

      if (!validation.canMarkAttendance) {
        this.logger.warn("Attendance marking validation failed", {
          reason: validation.reason,
          sessionId,
          studentId,
          instructorId,
        });
        throw new Error(validation.reason);
      }

      // Log any warnings
      if (validation.warnings && validation.warnings.length > 0) {
        this.logger.warn("Attendance marking warnings", {
          warnings: validation.warnings,
          sessionId,
          studentId,
        });
      }

      const attendanceRecord = await this.attendanceRepository.markAttendance(
        sessionId,
        studentId,
        establishmentId,
        request,
        markedBy
      );

      this.logger.info("Attendance marked successfully", {
        attendanceId: attendanceRecord.id,
        sessionId,
        studentId,
        status: attendanceRecord.status,
      });

      return attendanceRecord;
    } catch (error: any) {
      this.logger.error("Error marking attendance", {
        error: error.message,
        sessionId,
        studentId,
        establishmentId,
        request,
      });
      throw error;
    }
  }

  async bulkMarkAttendance(
    sessionId: string,
    establishmentId: string,
    request: BulkAttendanceRequest,
    markedBy: string,
    instructorId?: string
  ): Promise<AttendanceRecord[]> {
    try {
      this.logger.info("Bulk marking attendance", {
        sessionId,
        establishmentId,
        recordCount: request.attendanceRecords.length,
        markedBy,
        instructorId,
      });

      // Validate instructor authorization if provided
      if (instructorId) {
        const isAuthorized =
          await this.attendanceRepository.isInstructorAuthorized(
            sessionId,
            instructorId,
            establishmentId
          );

        if (!isAuthorized) {
          this.logger.warn(
            "Unauthorized instructor attempted bulk attendance marking",
            {
              sessionId,
              instructorId,
              establishmentId,
            }
          );
          throw new Error(ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR);
        }
      }

      // Validate all students can have attendance marked
      const validationPromises = request.attendanceRecords.map((record) =>
        this.validateAttendanceMarking(
          sessionId,
          record.studentId,
          establishmentId
        )
      );

      const validations = await Promise.all(validationPromises);
      const failedValidations = validations.filter((v) => !v.canMarkAttendance);

      if (failedValidations.length > 0) {
        this.logger.warn("Bulk attendance marking validation failures", {
          failedCount: failedValidations.length,
          failures: failedValidations.map((f) => f.reason),
        });
        throw new Error(ATTENDANCE_ERRORS.BULK_ATTENDANCE_FAILED);
      }

      const attendanceRecords =
        await this.attendanceRepository.bulkMarkAttendance(
          sessionId,
          establishmentId,
          request.attendanceRecords,
          markedBy
        );

      this.logger.info("Bulk attendance marked successfully", {
        sessionId,
        recordCount: attendanceRecords.length,
        statusBreakdown: this.getStatusBreakdown(attendanceRecords),
      });

      return attendanceRecords;
    } catch (error: any) {
      this.logger.error("Error bulk marking attendance", {
        error: error.message,
        sessionId,
        establishmentId,
        requestRecordCount: request.attendanceRecords.length,
      });
      throw error;
    }
  }

  async updateAttendance(
    attendanceId: string,
    establishmentId: string,
    request: UpdateAttendanceRequest,
    markedBy: string,
    instructorId?: string
  ): Promise<AttendanceRecord> {
    try {
      this.logger.info("Updating attendance", {
        attendanceId,
        establishmentId,
        request,
        markedBy,
        instructorId,
      });

      // TODO: Add authorization check for updating specific attendance record
      // This would require getting the session ID from the attendance record first

      const updatedRecord = await this.attendanceRepository.updateAttendance(
        attendanceId,
        establishmentId,
        request,
        markedBy
      );

      if (!updatedRecord) {
        this.logger.warn("Attendance record not found for update", {
          attendanceId,
          establishmentId,
        });
        throw new Error(ATTENDANCE_ERRORS.ATTENDANCE_RECORD_NOT_FOUND);
      }

      this.logger.info("Attendance updated successfully", {
        attendanceId,
        newStatus: updatedRecord.status,
      });

      return updatedRecord;
    } catch (error: any) {
      this.logger.error("Error updating attendance", {
        error: error.message,
        attendanceId,
        establishmentId,
        request,
      });
      throw error;
    }
  }

  async getAttendanceRecords(
    establishmentId: string,
    filters: AttendanceFilters
  ): Promise<{ records: AttendanceRecord[]; total: number }> {
    try {
      this.logger.info("Getting attendance records", {
        establishmentId,
        filters,
      });

      const result = await this.attendanceRepository.getAttendanceRecords(
        establishmentId,
        filters
      );

      this.logger.info("Attendance records retrieved successfully", {
        recordCount: result.records.length,
        total: result.total,
        filters,
      });

      return result;
    } catch (error: any) {
      this.logger.error("Error getting attendance records", {
        error: error.message,
        establishmentId,
        filters,
      });
      throw error;
    }
  }

  async getStudentAttendanceHistory(
    studentId: string,
    establishmentId: string
  ): Promise<StudentAttendanceHistory> {
    try {
      this.logger.info("Getting student attendance history", {
        studentId,
        establishmentId,
      });

      const history =
        await this.attendanceRepository.getStudentAttendanceHistory(
          studentId,
          establishmentId
        );

      if (!history) {
        this.logger.warn("Student not found for attendance history", {
          studentId,
          establishmentId,
        });
        throw new Error("Student not found");
      }

      this.logger.info("Student attendance history retrieved successfully", {
        studentId,
        totalSessions: history.totalSessions,
        attendanceRate: history.attendanceRate,
      });

      return history;
    } catch (error: any) {
      this.logger.error("Error getting student attendance history", {
        error: error.message,
        studentId,
        establishmentId,
      });
      throw error;
    }
  }

  async getSessionAttendanceStats(
    sessionId: string,
    establishmentId: string
  ): Promise<SessionAttendanceStats> {
    try {
      this.logger.info("Getting session attendance stats", {
        sessionId,
        establishmentId,
      });

      const stats = await this.attendanceRepository.getSessionAttendanceStats(
        sessionId,
        establishmentId
      );

      if (!stats) {
        this.logger.warn("Session not found for attendance stats", {
          sessionId,
          establishmentId,
        });
        throw new Error(ATTENDANCE_ERRORS.SESSION_NOT_FOUND);
      }

      this.logger.info("Session attendance stats retrieved successfully", {
        sessionId,
        attendanceRate: stats.attendanceRate,
        totalEnrolled: stats.totalEnrolled,
      });

      return stats;
    } catch (error: any) {
      this.logger.error("Error getting session attendance stats", {
        error: error.message,
        sessionId,
        establishmentId,
      });
      throw error;
    }
  }

  // Private validation methods
  private async validateAttendanceMarking(
    sessionId: string,
    studentId: string,
    establishmentId: string,
    instructorId?: string
  ): Promise<AttendanceValidation> {
    const validation: AttendanceValidation = {
      canMarkAttendance: false,
      warnings: [],
    };

    try {
      // Check if student is enrolled in session
      const canMark = await this.attendanceRepository.canMarkAttendance(
        sessionId,
        studentId,
        establishmentId
      );

      if (!canMark) {
        validation.reason = ATTENDANCE_ERRORS.STUDENT_NOT_ENROLLED;
        return validation;
      }

      // Check instructor authorization if provided
      if (instructorId) {
        const isAuthorized =
          await this.attendanceRepository.isInstructorAuthorized(
            sessionId,
            instructorId,
            establishmentId
          );

        if (!isAuthorized) {
          validation.reason = ATTENDANCE_ERRORS.UNAUTHORIZED_INSTRUCTOR;
          return validation;
        }
      }

      // All validations passed
      validation.canMarkAttendance = true;
      return validation;
    } catch (error: any) {
      this.logger.error("Error validating attendance marking", {
        error: error.message,
        sessionId,
        studentId,
        establishmentId,
      });
      validation.reason = "Validation error occurred";
      return validation;
    }
  }

  private getStatusBreakdown(
    records: AttendanceRecord[]
  ): Record<AttendanceStatus, number> {
    return records.reduce((breakdown, record) => {
      breakdown[record.status] = (breakdown[record.status] || 0) + 1;
      return breakdown;
    }, {} as Record<AttendanceStatus, number>);
  }

  // Utility methods for attendance analytics
  calculateAttendanceRate(
    present: number,
    late: number,
    total: number
  ): number {
    if (total === 0) return 0;
    return Math.round(((present + late) / total) * 100 * 100) / 100; // Round to 2 decimal places
  }

  categorizeAttendanceRate(
    rate: number
  ): "excellent" | "good" | "needs_improvement" | "concerning" {
    if (rate >= 90) return "excellent";
    if (rate >= 75) return "good";
    if (rate >= 60) return "needs_improvement";
    return "concerning";
  }

  // Method to get attendance trends for reporting
  async getAttendanceTrends(
    establishmentId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      cohortId?: string;
      instructorId?: string;
    }
  ): Promise<{
    overallRate: number;
    monthlyTrends: Array<{
      month: string;
      attendanceRate: number;
      totalSessions: number;
    }>;
    statusDistribution: Record<AttendanceStatus, number>;
  }> {
    try {
      this.logger.info("Getting attendance trends", {
        establishmentId,
        filters,
      });

      const records = await this.attendanceRepository.getAttendanceRecords(
        establishmentId,
        {
          ...filters,
          limit: 1000, // Get a large sample for trends
        }
      );

      // Calculate overall rate
      const totalRecords = records.records.length;
      const attendedCount = records.records.filter(
        (r) => r.status === "present" || r.status === "late"
      ).length;

      const overallRate = this.calculateAttendanceRate(
        records.records.filter((r) => r.status === "present").length,
        records.records.filter((r) => r.status === "late").length,
        totalRecords
      );

      // Calculate status distribution
      const statusDistribution = records.records.reduce((dist, record) => {
        dist[record.status] = (dist[record.status] || 0) + 1;
        return dist;
      }, {} as Record<AttendanceStatus, number>);

      // For now, return basic trends - monthly trends would require more complex queries
      return {
        overallRate,
        monthlyTrends: [], // TODO: Implement monthly trend calculation
        statusDistribution,
      };
    } catch (error: any) {
      this.logger.error("Error getting attendance trends", {
        error: error.message,
        establishmentId,
        filters,
      });
      throw error;
    }
  }
}
