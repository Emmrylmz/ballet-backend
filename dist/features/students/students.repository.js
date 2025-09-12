export class StudentsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async searchStudents(establishmentId, filters) {
        const conditions = ["s.establishment_id = $1"];
        const values = [establishmentId];
        let paramIndex = 2;
        if (filters.q) {
            conditions.push(`(
        s.name ILIKE $${paramIndex} OR 
        s.email ILIKE $${paramIndex} OR 
        s.phone ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex}
      )`);
            values.push(`%${filters.q}%`);
            paramIndex++;
        }
        if (filters.status === 'active') {
            conditions.push("s.is_active = true");
        }
        else if (filters.status === 'inactive') {
            conditions.push("s.is_active = false");
        }
        if (filters.cohortId) {
            conditions.push(`EXISTS (
        SELECT 1 FROM cohort_memberships cm 
        WHERE cm.student_id = s.id 
          AND cm.cohort_id = $${paramIndex}
          AND cm.is_active = true
      )`);
            values.push(filters.cohortId);
            paramIndex++;
        }
        if (filters.available === true) {
            conditions.push(`NOT EXISTS (
        SELECT 1 FROM cohort_memberships cm 
        WHERE cm.student_id = s.id AND cm.is_active = true
      )`);
        }
        if (filters.ageMin || filters.ageMax) {
            if (filters.ageMin) {
                conditions.push(`(
          s.birth_date IS NULL OR 
          EXTRACT(year FROM AGE(s.birth_date)) >= $${paramIndex}
        )`);
                values.push(filters.ageMin);
                paramIndex++;
            }
            if (filters.ageMax) {
                conditions.push(`(
          s.birth_date IS NULL OR 
          EXTRACT(year FROM AGE(s.birth_date)) <= $${paramIndex}
        )`);
                values.push(filters.ageMax);
                paramIndex++;
            }
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ${whereClause}
    `;
        const query = `
      SELECT s.id, s.name, s.email, s.phone, s.is_active, s.registration_date,
             u.email as user_email,
             COUNT(DISTINCT cm.cohort_id) FILTER (WHERE cm.is_active = true) as active_cohorts,
             STRING_AGG(DISTINCT c.name, ', ') FILTER (WHERE cm.is_active = true) as cohort_names
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN cohort_memberships cm ON s.id = cm.student_id
      LEFT JOIN cohorts c ON cm.cohort_id = c.id
      ${whereClause}
      GROUP BY s.id, s.name, s.email, s.phone, s.is_active, s.registration_date, u.email
      ORDER BY s.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        values.push(limit, offset);
        const [countResult, searchResult] = await Promise.all([
            this.db.query(countQuery, values.slice(0, -2)),
            this.db.query(query, values),
        ]);
        const students = searchResult.rows.map(this.mapSearchResultRow);
        const total = parseInt(countResult.rows[0]?.total || "0");
        return { students, total };
    }
    async getStudentProfile(establishmentId, studentId) {
        const query = `
      SELECT s.*, 
             u.email as user_email,
             COUNT(DISTINCT cm.cohort_id) FILTER (WHERE cm.is_active = true) as active_cohorts,
             COUNT(DISTINCT se.id) as total_sessions,
             STRING_AGG(DISTINCT c.name, ', ') FILTER (WHERE cm.is_active = true) as cohort_names,
             MAX(ar.session_date) as last_attendance,
             ROUND(
               COUNT(DISTINCT ar.id) * 100.0 / NULLIF(COUNT(DISTINCT se.id), 0), 2
             ) as attendance_rate
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN cohort_memberships cm ON s.id = cm.student_id
      LEFT JOIN cohorts c ON cm.cohort_id = c.id
      LEFT JOIN session_enrollments se ON s.id = se.student_id
      LEFT JOIN attendance_records ar ON se.id = ar.enrollment_id AND ar.status = 'present'
      WHERE s.establishment_id = $1 AND s.id = $2
      GROUP BY s.id, u.email
    `;
        const result = await this.db.query(query, [establishmentId, studentId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapProfileRow(result.rows[0]);
    }
    async createStudent(establishmentId, studentData, userId) {
        const query = `
      INSERT INTO students (
        establishment_id, user_id, name, email, phone, emergency_contact,
        emergency_contact_name, parent_name, parent_phone, parent_email,
        birth_date, medical_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            establishmentId,
            userId || null,
            studentData.name,
            studentData.email || null,
            studentData.phone,
            studentData.emergencyContact,
            studentData.emergencyContactName || null,
            studentData.parentName || null,
            studentData.parentPhone || null,
            studentData.parentEmail || null,
            studentData.birthDate || null,
            studentData.medicalNotes || null,
        ];
        const result = await this.db.query(query, values);
        return this.mapStudentRow(result.rows[0]);
    }
    async updateStudent(establishmentId, studentId, updates) {
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        if (updates.name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            updateValues.push(updates.name);
            paramIndex++;
        }
        if (updates.email !== undefined) {
            updateFields.push(`email = $${paramIndex}`);
            updateValues.push(updates.email);
            paramIndex++;
        }
        if (updates.phone !== undefined) {
            updateFields.push(`phone = $${paramIndex}`);
            updateValues.push(updates.phone);
            paramIndex++;
        }
        if (updates.emergencyContact !== undefined) {
            updateFields.push(`emergency_contact = $${paramIndex}`);
            updateValues.push(updates.emergencyContact);
            paramIndex++;
        }
        if (updates.emergencyContactName !== undefined) {
            updateFields.push(`emergency_contact_name = $${paramIndex}`);
            updateValues.push(updates.emergencyContactName);
            paramIndex++;
        }
        if (updates.parentName !== undefined) {
            updateFields.push(`parent_name = $${paramIndex}`);
            updateValues.push(updates.parentName);
            paramIndex++;
        }
        if (updates.parentPhone !== undefined) {
            updateFields.push(`parent_phone = $${paramIndex}`);
            updateValues.push(updates.parentPhone);
            paramIndex++;
        }
        if (updates.parentEmail !== undefined) {
            updateFields.push(`parent_email = $${paramIndex}`);
            updateValues.push(updates.parentEmail);
            paramIndex++;
        }
        if (updates.birthDate !== undefined) {
            updateFields.push(`birth_date = $${paramIndex}`);
            updateValues.push(updates.birthDate);
            paramIndex++;
        }
        if (updates.medicalNotes !== undefined) {
            updateFields.push(`medical_notes = $${paramIndex}`);
            updateValues.push(updates.medicalNotes);
            paramIndex++;
        }
        if (updates.isActive !== undefined) {
            updateFields.push(`is_active = $${paramIndex}`);
            updateValues.push(updates.isActive);
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.getStudentById(establishmentId, studentId);
        }
        updateFields.push("updated_at = CURRENT_TIMESTAMP");
        const query = `
      UPDATE students 
      SET ${updateFields.join(", ")}
      WHERE establishment_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;
        updateValues.push(establishmentId, studentId);
        const result = await this.db.query(query, updateValues);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapStudentRow(result.rows[0]);
    }
    async getStudentById(establishmentId, studentId) {
        const query = `
      SELECT * FROM students 
      WHERE establishment_id = $1 AND id = $2
    `;
        const result = await this.db.query(query, [establishmentId, studentId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapStudentRow(result.rows[0]);
    }
    async getSessionRoster(establishmentId, sessionId) {
        const query = `
      SELECT s.id, s.name, s.phone, s.emergency_contact, s.medical_notes
      FROM students s
      JOIN session_enrollments se ON s.id = se.student_id
      WHERE se.establishment_id = $1 
        AND se.session_id = $2 
        AND se.is_waitlist = false
      ORDER BY s.name
    `;
        const result = await this.db.query(query, [establishmentId, sessionId]);
        return result.rows.map(this.mapRosterRow);
    }
    async getStudentsStats(establishmentId) {
        const queries = [
            `SELECT 
         COUNT(*) as total_students,
         COUNT(*) FILTER (WHERE is_active = true) as active_students,
         COUNT(*) FILTER (WHERE is_active = false) as inactive_students,
         COUNT(*) FILTER (WHERE registration_date >= CURRENT_DATE - INTERVAL '1 month') as new_this_month
       FROM students WHERE establishment_id = $1`,
            `SELECT ROUND(AVG(cohort_count), 2) as average_cohorts_per_student
       FROM (
         SELECT COUNT(cm.cohort_id) as cohort_count
         FROM students s
         LEFT JOIN cohort_memberships cm ON s.id = cm.student_id AND cm.is_active = true
         WHERE s.establishment_id = $1 AND s.is_active = true
         GROUP BY s.id
       ) counts`,
            `SELECT c.id as cohort_id, c.name as cohort_name, COUNT(cm.student_id) as student_count
       FROM cohorts c
       JOIN cohort_memberships cm ON c.id = cm.cohort_id AND cm.is_active = true
       WHERE c.establishment_id = $1
       GROUP BY c.id, c.name
       ORDER BY student_count DESC
       LIMIT 5`,
        ];
        const [statsResult, avgResult, topCohortsResult] = await Promise.all([
            this.db.query(queries[0], [establishmentId]),
            this.db.query(queries[1], [establishmentId]),
            this.db.query(queries[2], [establishmentId]),
        ]);
        const stats = statsResult.rows[0];
        const avgCohorts = avgResult.rows[0]?.average_cohorts_per_student || 0;
        return {
            totalStudents: parseInt(stats.total_students),
            activeStudents: parseInt(stats.active_students),
            inactiveStudents: parseInt(stats.inactive_students),
            newThisMonth: parseInt(stats.new_this_month),
            averageCohortsPerStudent: parseFloat(avgCohorts),
            topCohorts: topCohortsResult.rows.map((row) => ({
                cohortId: row.cohort_id,
                cohortName: row.cohort_name,
                studentCount: parseInt(row.student_count),
            })),
        };
    }
    mapStudentRow(row) {
        return {
            id: row.id,
            establishmentId: row.establishment_id,
            userId: row.user_id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            emergencyContact: row.emergency_contact,
            emergencyContactName: row.emergency_contact_name,
            parentName: row.parent_name,
            parentPhone: row.parent_phone,
            parentEmail: row.parent_email,
            birthDate: row.birth_date,
            medicalNotes: row.medical_notes,
            registrationDate: row.registration_date,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapProfileRow(row) {
        const student = this.mapStudentRow(row);
        return {
            ...student,
            userEmail: row.user_email,
            activeCohorts: parseInt(row.active_cohorts || 0),
            totalSessions: parseInt(row.total_sessions || 0),
            cohortNames: row.cohort_names ? row.cohort_names.split(', ') : [],
            lastAttendance: row.last_attendance,
            attendanceRate: row.attendance_rate ? parseFloat(row.attendance_rate) : 0,
        };
    }
    mapSearchResultRow(row) {
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            userEmail: row.user_email,
            isActive: row.is_active,
            activeCohorts: parseInt(row.active_cohorts || 0),
            cohortNames: row.cohort_names ? row.cohort_names.split(', ') : [],
            registrationDate: row.registration_date,
        };
    }
    mapRosterRow(row) {
        return {
            id: row.id,
            name: row.name,
            phone: row.phone,
            emergencyContact: row.emergency_contact,
            medicalNotes: row.medical_notes,
        };
    }
}
