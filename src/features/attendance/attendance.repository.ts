import { DatabaseService } from '../../services/DatabaseService.js';
import {
  AttendanceRecord,
  SessionRoster,
  SessionEnrollmentWithAttendance,
  AttendanceFilters,
  StudentAttendanceHistory,
  SessionAttendanceStats,
  CohortAttendanceReport,
  AttendanceStatus,
  MarkAttendanceRequest,
  UpdateAttendanceRequest,
} from './attendance.types.js';

export class AttendanceRepository {
  constructor(private db: DatabaseService) {}

  async getSessionRoster(sessionId: string, establishmentId: string): Promise<SessionRoster | null> {
    // First, get the session info
    const sessionQuery = `
      SELECT 
        cs.id,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.capacity,
        cs.status,
        ct.title as session_title,
        c.name as cohort_name,
        COALESCE(
          CONCAT(override_u.first_name, ' ', override_u.last_name),
          CONCAT(instructor_u.first_name, ' ', instructor_u.last_name)
        ) as instructor_name
      FROM class_sessions cs
      LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
      LEFT JOIN cohorts c ON cs.cohort_id = c.id
      LEFT JOIN users instructor_u ON cs.instructor_id = instructor_u.id
      LEFT JOIN users override_u ON cs.override_instructor_id = override_u.id
      WHERE cs.id = $1 AND cs.establishment_id = $2
    `;

    const sessionResult = await this.db.query(sessionQuery, [sessionId, establishmentId]);
    
    if (sessionResult.rows.length === 0) {
      return null;
    }

    const sessionInfo = sessionResult.rows[0];

    // Get enrollments with attendance
    const enrollmentsQuery = `
      SELECT 
        se.id as enrollment_id,
        se.student_id,
        s.name as student_name,
        s.phone as student_phone,
        s.email as student_email,
        s.medical_notes,
        s.emergency_contact,
        s.emergency_contact_name,
        se.is_waitlist,
        se.enrollment_date,
        ar.id as attendance_id,
        ar.status as attendance_status,
        ar.notes as attendance_notes,
        ar.marked_at,
        ar.marked_by,
        CONCAT(marker.first_name, ' ', marker.last_name) as marked_by_name
      FROM session_enrollments se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN attendance_records ar ON se.session_id = ar.session_id AND se.student_id = ar.student_id
      LEFT JOIN users marker ON ar.marked_by = marker.id
      WHERE se.session_id = $1 AND se.establishment_id = $2
      ORDER BY s.name
    `;

    const enrollmentsResult = await this.db.query(enrollmentsQuery, [sessionId, establishmentId]);

    // Get attendance stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_enrolled,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as total_present,
        COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as total_late,
        COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as total_absent,
        COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as total_excused
      FROM session_enrollments se
      LEFT JOIN attendance_records ar ON se.session_id = ar.session_id AND se.student_id = ar.student_id
      WHERE se.session_id = $1 AND se.establishment_id = $2
    `;

    const statsResult = await this.db.query(statsQuery, [sessionId, establishmentId]);
    const stats = statsResult.rows[0];

    // Format enrollments data
    const enrollments = enrollmentsResult.rows.map(row => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentPhone: row.student_phone,
      studentEmail: row.student_email,
      medicalNotes: row.medical_notes,
      emergencyContact: row.emergency_contact,
      emergencyContactName: row.emergency_contact_name,
      isWaitlist: row.is_waitlist,
      enrollmentDate: row.enrollment_date,
      hasAttendance: row.attendance_id !== null,
      attendanceStatus: row.attendance_status,
      attendanceNotes: row.attendance_notes,
      attendanceRecord: row.attendance_id ? {
        id: row.attendance_id,
        establishmentId,
        sessionId,
        studentId: row.student_id,
        status: row.attendance_status,
        notes: row.attendance_notes,
        markedAt: row.marked_at,
        markedBy: row.marked_by,
        markedByName: row.marked_by_name
      } : null
    }));

    // Calculate attendance rate
    const attendanceRate = stats.total_enrolled > 0 
      ? Math.round(((parseInt(stats.total_present) + parseInt(stats.total_late)) / parseInt(stats.total_enrolled)) * 100 * 100) / 100
      : 0;

    return {
      sessionId: sessionId,
      sessionDate: sessionInfo.session_date,
      startTime: sessionInfo.start_time,
      endTime: sessionInfo.end_time,
      sessionTitle: sessionInfo.session_title,
      cohortName: sessionInfo.cohort_name,
      instructorName: sessionInfo.instructor_name,
      capacity: sessionInfo.capacity,
      status: sessionInfo.status,
      enrollments: enrollments,
      attendanceStats: {
        totalEnrolled: parseInt(stats.total_enrolled),
        totalPresent: parseInt(stats.total_present),
        totalLate: parseInt(stats.total_late),
        totalAbsent: parseInt(stats.total_absent),
        totalExcused: parseInt(stats.total_excused),
        attendanceRate: attendanceRate
      }
    };
  }

  async markAttendance(
    sessionId: string,
    studentId: string,
    establishmentId: string,
    request: MarkAttendanceRequest,
    markedBy: string
  ): Promise<AttendanceRecord> {
    const query = `
      INSERT INTO attendance_records (
        establishment_id, session_id, student_id, status, notes, marked_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id, student_id) 
      DO UPDATE SET 
        status = $4,
        notes = $5,
        marked_by = $6,
        marked_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      establishmentId,
      sessionId,
      studentId,
      request.status,
      request.notes || null,
      markedBy
    ]);

    return {
      id: result.rows[0].id,
      establishmentId: result.rows[0].establishment_id,
      sessionId: result.rows[0].session_id,
      studentId: result.rows[0].student_id,
      status: result.rows[0].status,
      notes: result.rows[0].notes,
      markedAt: result.rows[0].marked_at,
      markedBy: result.rows[0].marked_by
    };
  }

  async bulkMarkAttendance(
    sessionId: string,
    establishmentId: string,
    attendanceRecords: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>,
    markedBy: string
  ): Promise<AttendanceRecord[]> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const results: AttendanceRecord[] = [];
      
      for (const record of attendanceRecords) {
        const query = `
          INSERT INTO attendance_records (
            establishment_id, session_id, student_id, status, notes, marked_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (session_id, student_id) 
          DO UPDATE SET 
            status = $4,
            notes = $5,
            marked_by = $6,
            marked_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await client.query(query, [
          establishmentId,
          sessionId,
          record.studentId,
          record.status,
          record.notes || null,
          markedBy
        ]);

        results.push({
          id: result.rows[0].id,
          establishmentId: result.rows[0].establishment_id,
          sessionId: result.rows[0].session_id,
          studentId: result.rows[0].student_id,
          status: result.rows[0].status,
          notes: result.rows[0].notes,
          markedAt: result.rows[0].marked_at,
          markedBy: result.rows[0].marked_by
        });
      }

      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateAttendance(
    attendanceId: string,
    establishmentId: string,
    request: UpdateAttendanceRequest,
    markedBy: string
  ): Promise<AttendanceRecord | null> {
    const query = `
      UPDATE attendance_records 
      SET 
        status = COALESCE($3, status),
        notes = COALESCE($4, notes),
        marked_by = $5,
        marked_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND establishment_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [
      attendanceId,
      establishmentId,
      request.status,
      request.notes,
      markedBy
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      establishmentId: result.rows[0].establishment_id,
      sessionId: result.rows[0].session_id,
      studentId: result.rows[0].student_id,
      status: result.rows[0].status,
      notes: result.rows[0].notes,
      markedAt: result.rows[0].marked_at,
      markedBy: result.rows[0].marked_by
    };
  }

  async getAttendanceRecords(
    establishmentId: string,
    filters: AttendanceFilters
  ): Promise<{ records: AttendanceRecord[]; total: number }> {
    let whereConditions = ['ar.establishment_id = $1'];
    let queryParams: any[] = [establishmentId];
    let paramCount = 1;

    if (filters.sessionId) {
      paramCount++;
      whereConditions.push(`ar.session_id = $${paramCount}`);
      queryParams.push(filters.sessionId);
    }

    if (filters.studentId) {
      paramCount++;
      whereConditions.push(`ar.student_id = $${paramCount}`);
      queryParams.push(filters.studentId);
    }

    if (filters.status) {
      paramCount++;
      whereConditions.push(`ar.status = $${paramCount}`);
      queryParams.push(filters.status);
    }

    if (filters.startDate) {
      paramCount++;
      whereConditions.push(`cs.session_date >= $${paramCount}`);
      queryParams.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      whereConditions.push(`cs.session_date <= $${paramCount}`);
      queryParams.push(filters.endDate);
    }

    if (filters.instructorId) {
      paramCount++;
      whereConditions.push(`(cs.instructor_id = $${paramCount} OR cs.override_instructor_id = $${paramCount})`);
      queryParams.push(filters.instructorId);
    }

    if (filters.cohortId) {
      paramCount++;
      whereConditions.push(`cs.cohort_id = $${paramCount}`);
      queryParams.push(filters.cohortId);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ${whereClause}
    `;

    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated records
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT 
        ar.*,
        s.name as student_name,
        s.phone as student_phone,
        s.email as student_email,
        cs.session_date,
        CONCAT(cs.start_time, '-', cs.end_time) as session_time,
        CONCAT(marker.first_name, ' ', marker.last_name) as marked_by_name
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN students s ON ar.student_id = s.id
      LEFT JOIN users marker ON ar.marked_by = marker.id
      WHERE ${whereClause}
      ORDER BY cs.session_date DESC, ar.marked_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await this.db.query(query, queryParams);

    const records: AttendanceRecord[] = result.rows.map((row: any) => ({
      id: row.id,
      establishmentId: row.establishment_id,
      sessionId: row.session_id,
      studentId: row.student_id,
      status: row.status,
      notes: row.notes,
      markedAt: row.marked_at,
      markedBy: row.marked_by,
      studentName: row.student_name,
      studentPhone: row.student_phone,
      studentEmail: row.student_email,
      sessionDate: row.session_date,
      sessionTime: row.session_time,
      markedByName: row.marked_by_name
    }));

    return { records, total };
  }

  async getStudentAttendanceHistory(
    studentId: string,
    establishmentId: string
  ): Promise<StudentAttendanceHistory | null> {
    const query = `
      WITH student_info AS (
        SELECT name FROM students WHERE id = $1 AND establishment_id = $2
      ),
      attendance_summary AS (
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as attended_sessions,
          COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
          COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_count
        FROM attendance_records ar
        WHERE ar.student_id = $1 AND ar.establishment_id = $2
      ),
      recent_records AS (
        SELECT 
          ar.*,
          cs.session_date,
          CONCAT(cs.start_time, '-', cs.end_time) as session_time,
          ct.title as session_title,
          CONCAT(marker.first_name, ' ', marker.last_name) as marked_by_name
        FROM attendance_records ar
        JOIN class_sessions cs ON ar.session_id = cs.id
        LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
        LEFT JOIN users marker ON ar.marked_by = marker.id
        WHERE ar.student_id = $1 AND ar.establishment_id = $2
        ORDER BY cs.session_date DESC
        LIMIT 10
      ),
      monthly_stats AS (
        SELECT 
          TO_CHAR(cs.session_date, 'YYYY-MM') as month,
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as attended_sessions
        FROM attendance_records ar
        JOIN class_sessions cs ON ar.session_id = cs.id
        WHERE ar.student_id = $1 AND ar.establishment_id = $2
          AND cs.session_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(cs.session_date, 'YYYY-MM')
        ORDER BY month DESC
      )
      SELECT 
        si.name as student_name,
        asm.total_sessions,
        asm.attended_sessions,
        asm.late_count,
        asm.absent_count,
        asm.excused_count,
        CASE 
          WHEN asm.total_sessions > 0 THEN 
            ROUND((asm.attended_sessions::DECIMAL / asm.total_sessions::DECIMAL) * 100, 2)
          ELSE 0 
        END as attendance_rate,
        json_agg(
          json_build_object(
            'id', rr.id,
            'sessionId', rr.session_id,
            'status', rr.status,
            'notes', rr.notes,
            'markedAt', rr.marked_at,
            'sessionDate', rr.session_date,
            'sessionTime', rr.session_time,
            'sessionTitle', rr.session_title,
            'markedByName', rr.marked_by_name
          ) ORDER BY rr.session_date DESC
        ) as recent_records,
        (
          SELECT json_agg(
            json_build_object(
              'month', ms.month,
              'totalSessions', ms.total_sessions,
              'attendanceRate', 
                CASE 
                  WHEN ms.total_sessions > 0 THEN 
                    ROUND((ms.attended_sessions::DECIMAL / ms.total_sessions::DECIMAL) * 100, 2)
                  ELSE 0 
                END
            ) ORDER BY ms.month DESC
          )
          FROM monthly_stats ms
        ) as monthly_stats
      FROM student_info si
      CROSS JOIN attendance_summary asm
      CROSS JOIN recent_records rr
      GROUP BY si.name, asm.total_sessions, asm.attended_sessions, 
               asm.late_count, asm.absent_count, asm.excused_count
    `;

    const result = await this.db.query(query, [studentId, establishmentId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      studentId,
      studentName: row.student_name,
      totalSessions: parseInt(row.total_sessions),
      attendedSessions: parseInt(row.attended_sessions),
      lateCount: parseInt(row.late_count),
      absentCount: parseInt(row.absent_count),
      excusedCount: parseInt(row.excused_count),
      attendanceRate: parseFloat(row.attendance_rate),
      recentRecords: row.recent_records || [],
      monthlyStats: row.monthly_stats || []
    };
  }

  async getSessionAttendanceStats(
    sessionId: string,
    establishmentId: string
  ): Promise<SessionAttendanceStats | null> {
    const query = `
      WITH session_info AS (
        SELECT 
          cs.session_date,
          cs.capacity,
          ct.title as session_title,
          cs.cohort_id,
          cs.instructor_id,
          cs.override_instructor_id
        FROM class_sessions cs
        LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
        WHERE cs.id = $1 AND cs.establishment_id = $2
      ),
      enrollment_stats AS (
        SELECT COUNT(*) as total_enrolled
        FROM session_enrollments se
        WHERE se.session_id = $1 AND se.establishment_id = $2
      ),
      attendance_breakdown AS (
        SELECT 
          COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
          COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_count,
          COUNT(CASE WHEN ar.id IS NULL THEN 1 END) as not_marked_count,
          COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as total_attended
        FROM session_enrollments se
        LEFT JOIN attendance_records ar ON se.session_id = ar.session_id AND se.student_id = ar.student_id
        WHERE se.session_id = $1 AND se.establishment_id = $2
      )
      SELECT 
        si.session_date,
        si.capacity,
        si.session_title,
        es.total_enrolled,
        ab.total_attended,
        ab.present_count,
        ab.late_count,
        ab.absent_count,
        ab.excused_count,
        ab.not_marked_count,
        CASE 
          WHEN es.total_enrolled > 0 THEN 
            ROUND((ab.total_attended::DECIMAL / es.total_enrolled::DECIMAL) * 100, 2)
          ELSE 0 
        END as attendance_rate
      FROM session_info si
      CROSS JOIN enrollment_stats es
      CROSS JOIN attendance_breakdown ab
    `;

    const result = await this.db.query(query, [sessionId, establishmentId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      sessionId,
      sessionDate: row.session_date,
      sessionTitle: row.session_title,
      totalCapacity: parseInt(row.capacity),
      totalEnrolled: parseInt(row.total_enrolled),
      totalAttended: parseInt(row.total_attended),
      statusBreakdown: {
        present: parseInt(row.present_count),
        late: parseInt(row.late_count),
        absent: parseInt(row.absent_count),
        excused: parseInt(row.excused_count),
        notMarked: parseInt(row.not_marked_count)
      },
      attendanceRate: parseFloat(row.attendance_rate)
    };
  }

  // Validation methods
  async canMarkAttendance(sessionId: string, studentId: string, establishmentId: string): Promise<boolean> {
    const query = `
      SELECT 1 
      FROM session_enrollments se
      JOIN class_sessions cs ON se.session_id = cs.id
      WHERE se.session_id = $1 
        AND se.student_id = $2 
        AND se.establishment_id = $3
        AND cs.status IN ('scheduled', 'in_progress', 'completed')
    `;

    const result = await this.db.query(query, [sessionId, studentId, establishmentId]);
    return result.rows.length > 0;
  }

  async isInstructorAuthorized(sessionId: string, instructorId: string, establishmentId: string): Promise<boolean> {
    const query = `
      SELECT 1 
      FROM class_sessions cs
      WHERE cs.id = $1 
        AND cs.establishment_id = $3
        AND (cs.instructor_id = $2 OR cs.override_instructor_id = $2)
    `;

    const result = await this.db.query(query, [sessionId, instructorId, establishmentId]);
    return result.rows.length > 0;
  }
}