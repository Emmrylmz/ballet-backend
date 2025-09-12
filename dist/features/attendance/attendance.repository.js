export class AttendanceRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async getSessionRoster(sessionId, establishmentId) {
        const query = `
      WITH session_info AS (
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
      ),
      enrollments_with_attendance AS (
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
      ),
      attendance_stats AS (
        SELECT 
          COUNT(*) as total_enrolled,
          COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as total_present,
          COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as total_late,
          COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as total_absent,
          COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as total_excused
        FROM session_enrollments se
        LEFT JOIN attendance_records ar ON se.session_id = ar.session_id AND se.student_id = ar.student_id
        WHERE se.session_id = $1 AND se.establishment_id = $2
      )
      SELECT 
        si.*,
        json_agg(
          json_build_object(
            'enrollmentId', ewa.enrollment_id,
            'studentId', ewa.student_id,
            'studentName', ewa.student_name,
            'studentPhone', ewa.student_phone,
            'studentEmail', ewa.student_email,
            'medicalNotes', ewa.medical_notes,
            'emergencyContact', ewa.emergency_contact,
            'emergencyContactName', ewa.emergency_contact_name,
            'isWaitlist', ewa.is_waitlist,
            'enrollmentDate', ewa.enrollment_date,
            'hasAttendance', ewa.attendance_id IS NOT NULL,
            'attendanceStatus', ewa.attendance_status,
            'attendanceNotes', ewa.attendance_notes,
            'attendanceRecord', 
              CASE 
                WHEN ewa.attendance_id IS NOT NULL THEN
                  json_build_object(
                    'id', ewa.attendance_id,
                    'establishmentId', $2,
                    'sessionId', $1,
                    'studentId', ewa.student_id,
                    'status', ewa.attendance_status,
                    'notes', ewa.attendance_notes,
                    'markedAt', ewa.marked_at,
                    'markedBy', ewa.marked_by,
                    'markedByName', ewa.marked_by_name
                  )
                ELSE NULL
              END
          ) ORDER BY ewa.student_name
        ) as enrollments,
        json_build_object(
          'totalEnrolled', ast.total_enrolled,
          'totalPresent', ast.total_present,
          'totalLate', ast.total_late,
          'totalAbsent', ast.total_absent,
          'totalExcused', ast.total_excused,
          'attendanceRate', 
            CASE 
              WHEN ast.total_enrolled > 0 THEN 
                ROUND(
                  ((ast.total_present + ast.total_late)::DECIMAL / ast.total_enrolled::DECIMAL) * 100, 
                  2
                )
              ELSE 0 
            END
        ) as attendance_stats
      FROM session_info si
      CROSS JOIN enrollments_with_attendance ewa
      CROSS JOIN attendance_stats ast
      GROUP BY si.id, si.session_date, si.start_time, si.end_time, si.capacity, 
               si.status, si.session_title, si.cohort_name, si.instructor_name,
               ast.total_enrolled, ast.total_present, ast.total_late, 
               ast.total_absent, ast.total_excused
    `;
        const result = await this.db.query(query, [sessionId, establishmentId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            sessionId: sessionId,
            sessionDate: row.session_date,
            startTime: row.start_time,
            endTime: row.end_time,
            sessionTitle: row.session_title,
            cohortName: row.cohort_name,
            instructorName: row.instructor_name,
            capacity: row.capacity,
            status: row.status,
            enrollments: row.enrollments || [],
            attendanceStats: row.attendance_stats
        };
    }
    async markAttendance(sessionId, studentId, establishmentId, request, markedBy) {
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
    async bulkMarkAttendance(sessionId, establishmentId, attendanceRecords, markedBy) {
        const client = await this.db.getClient();
        try {
            await client.query('BEGIN');
            const results = [];
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async updateAttendance(attendanceId, establishmentId, request, markedBy) {
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
    async getAttendanceRecords(establishmentId, filters) {
        let whereConditions = ['ar.establishment_id = $1'];
        let queryParams = [establishmentId];
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
        const countQuery = `
      SELECT COUNT(*) as total
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ${whereClause}
    `;
        const countResult = await this.db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
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
        const records = result.rows.map((row) => ({
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
    async getStudentAttendanceHistory(studentId, establishmentId) {
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
    async getSessionAttendanceStats(sessionId, establishmentId) {
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
    async canMarkAttendance(sessionId, studentId, establishmentId) {
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
    async isInstructorAuthorized(sessionId, instructorId, establishmentId) {
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
