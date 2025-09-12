import { DatabaseService } from "../../services/DatabaseService.js";
import { PoolClient } from "pg";
import {
  ClassTemplate,
  CreateClassTemplateRequest,
  UpdateClassTemplateRequest,
  ClassTemplateFilters,
  ClassSession,
  CreateClassSessionRequest,
  UpdateClassSessionRequest,
  ClassSessionFilters,
  SessionEnrollment,
  StudentPackage,
  ClassStats,
  CalendarEvent,
  StudentEnrolledSession,
  SessionStatus,
  ClassType,
  SkillLevel,
  ActivityType,
} from "./classes.types.js";

export class ClassesRepository {
  private tableExistsCache: Map<string, boolean> = new Map();

  constructor(public db: DatabaseService) {}

  /**
   * Check if a table exists (with caching to avoid repeated queries)
   */
  private async tableExists(tableName: string): Promise<boolean> {
    if (this.tableExistsCache.has(tableName)) {
      return this.tableExistsCache.get(tableName)!;
    }

    const result = await this.db.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `,
      [tableName]
    );

    const exists = result.rows[0].exists;
    this.tableExistsCache.set(tableName, exists);
    return exists;
  }

  // CLASS TEMPLATE METHODS

  /**
   * Create a new class template
   */
  async createClassTemplate(
    establishmentId: string,
    template: CreateClassTemplateRequest
  ): Promise<ClassTemplate> {
    try {
      const result = await this.db.query(
        `
        INSERT INTO class_templates (
          establishment_id, title, class_type, skill_level, instructor_id,
          capacity, duration_minutes, price, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, establishment_id, title, class_type, skill_level, 
                  instructor_id, capacity, duration_minutes, price, 
                  description, is_active, created_at, updated_at
      `,
        [
          establishmentId,
          template.title,
          template.classType,
          template.skillLevel,
          template.instructorId || null,
          template.capacity,
          template.durationMinutes,
          template.price,
          template.description || null,
        ]
      );

      const row = result.rows[0];
      return this.mapClassTemplateRow(row);
    } catch (error) {
      console.log(error, "debug");
      throw error;
    }
  }

  /**
   * Get class template by ID
   */
  async getClassTemplate(
    establishmentId: string,
    templateId: string
  ): Promise<ClassTemplate | null> {
    try {
      const result = await this.db.query(
        `
       SELECT ct.id, ct.establishment_id, ct.title, ct.class_type, ct.skill_level,
       ct.instructor_id, ct.capacity, ct.duration_minutes, ct.price,
       ct.description, ct.is_active, ct.created_at, ct.updated_at,
       CONCAT(u.first_name, ' ', u.last_name) as instructor_name
FROM class_templates ct
LEFT JOIN users u ON ct.instructor_id = u.id
WHERE ct.establishment_id = $1 AND ct.id = $2
      `,
        [establishmentId, templateId]
      );
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapClassTemplateRow(result.rows[0]);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   *  all class templates with filters
   */
  async getClassTemplates(
    establishmentId: string,
    filters: ClassTemplateFilters = {}
  ): Promise<{ templates: ClassTemplate[]; total: number }> {
    let whereConditions = ["ct.establishment_id = $1"];
    let queryParams: any[] = [establishmentId];
    let paramIndex = 2;

    if (filters.classType) {
      whereConditions.push(`ct.class_type = $${paramIndex}`);
      queryParams.push(filters.classType);
      paramIndex++;
    }

    if (filters.skillLevel) {
      whereConditions.push(`ct.skill_level = $${paramIndex}`);
      queryParams.push(filters.skillLevel);
      paramIndex++;
    }

    if (filters.instructorId) {
      whereConditions.push(`ct.instructor_id = $${paramIndex}`);
      queryParams.push(filters.instructorId);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      whereConditions.push(`ct.is_active = $${paramIndex}`);
      queryParams.push(filters.isActive);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM class_templates ct WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get templates with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.db.query(
      `
  SELECT ct.id, ct.establishment_id, ct.title, ct.class_type, ct.skill_level,
         ct.instructor_id, ct.capacity, ct.duration_minutes, ct.price,
         ct.description, ct.is_active, ct.created_at, ct.updated_at,
         CONCAT(u.first_name, ' ', u.last_name) as instructor_name
  FROM class_templates ct
  LEFT JOIN users u ON ct.instructor_id = u.id
  WHERE ${whereClause}
  ORDER BY ct.created_at DESC
  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `,
      [...queryParams, limit, offset]
    );

    const templates = result.rows.map((row: any) =>
      this.mapClassTemplateRow(row)
    );

    return { templates, total };
  }

  /**
   * Update class template
   */
  async updateClassTemplate(
    establishmentId: string,
    templateId: string,
    updates: UpdateClassTemplateRequest
  ): Promise<ClassTemplate | null> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(updates.title);
      paramIndex++;
    }

    if (updates.classType !== undefined) {
      updateFields.push(`class_type = $${paramIndex}`);
      updateValues.push(updates.classType);
      paramIndex++;
    }

    if (updates.skillLevel !== undefined) {
      updateFields.push(`skill_level = $${paramIndex}`);
      updateValues.push(updates.skillLevel);
      paramIndex++;
    }

    if (updates.instructorId !== undefined) {
      updateFields.push(`instructor_id = $${paramIndex}`);
      updateValues.push(updates.instructorId);
      paramIndex++;
    }

    if (updates.capacity !== undefined) {
      updateFields.push(`capacity = $${paramIndex}`);
      updateValues.push(updates.capacity);
      paramIndex++;
    }

    if (updates.durationMinutes !== undefined) {
      updateFields.push(`duration_minutes = $${paramIndex}`);
      updateValues.push(updates.durationMinutes);
      paramIndex++;
    }

    if (updates.price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(updates.price);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(updates.description);
      paramIndex++;
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(updates.isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getClassTemplate(establishmentId, templateId);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");

    const result = await this.db.query(
      `
      UPDATE class_templates 
      SET ${updateFields.join(", ")}
      WHERE establishment_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING id, establishment_id, title, class_type, skill_level,
                instructor_id, capacity, duration_minutes, price,
                description, is_active, created_at, updated_at
    `,
      [...updateValues, establishmentId, templateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapClassTemplateRow(result.rows[0]);
  }

  /**
   * Soft delete class template (set is_active = false)
   */
  async deleteClassTemplate(
    establishmentId: string,
    templateId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      UPDATE class_templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE establishment_id = $1 AND id = $2
    `,
      [establishmentId, templateId]
    );

    return result.rowCount > 0;
  }

  // CLASS SESSION METHODS

  /**
   * Create a new class session
   */
  async createClassSession(
    establishmentId: string,
    session: CreateClassSessionRequest & {
      cohortId?: string;
      overrideInstructorId?: string;
      sessionType?: string;
    }
  ): Promise<ClassSession> {
    const result = await this.db.query(
      `
     INSERT INTO class_sessions (
  establishment_id, class_template_id, instructor_id, session_date,
  start_time, end_time, capacity, notes,
  cohort_id, override_instructor_id, session_type
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id, establishment_id, class_template_id, instructor_id,
  session_date, start_time, end_time, capacity, status,
  notes, parent_session_id, cohort_id, override_instructor_id, 
  session_type, created_at, updated_at
    `,
      [
        establishmentId,
        session.classTemplateId || null,
        session.instructorId || null,
        session.sessionDate,
        session.startTime,
        session.endTime || null,
        session.capacity || 12,
        session.notes || null,
        session.cohortId || null,
        session.overrideInstructorId || null,
        session.sessionType || "regular",
      ]
    );

    const row = result.rows[0];
    return await this.mapClassSessionRow(row);
  }

  /**
   * Get class session by ID with enrollment count
   */
  async getClassSession(
    establishmentId: string,
    sessionId: string
  ): Promise<ClassSession | null> {
    const result = await this.db.query(
      `
    SELECT cs.id, cs.establishment_id, cs.class_template_id, cs.instructor_id,
           cs.session_date, cs.start_time, cs.end_time, cs.capacity, cs.status,
           cs.notes, cs.parent_session_id,
           cs.cohort_id, cs.override_instructor_id, cs.session_type,
           cs.created_at, cs.updated_at,
           ct.title as template_title,
           c.name as cohort_name,
           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
           CONCAT(override_u.first_name, ' ', override_u.last_name) as override_instructor_name,
           COALESCE(enrollment_count.count, 0) as enrollment_count
    FROM class_sessions cs
    LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
    LEFT JOIN cohorts c ON cs.cohort_id = c.id
    LEFT JOIN users u ON cs.instructor_id = u.id
    LEFT JOIN users override_u ON cs.override_instructor_id = override_u.id
    LEFT JOIN (
      SELECT session_id, COUNT(*) as count
      FROM session_enrollments
      WHERE is_waitlist = false
      GROUP BY session_id
    ) enrollment_count ON cs.id = enrollment_count.session_id
    WHERE cs.establishment_id = $1 AND cs.id = $2
    `,
      [establishmentId, sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await this.mapClassSessionRow(result.rows[0]);
  }

  /**
   * Get class sessions with filters
   */
  async getClassSessions(
    establishmentId: string,
    filters: ClassSessionFilters & { cohortId?: string } = {}
  ): Promise<{ sessions: ClassSession[]; total: number }> {
    let whereConditions = ["cs.establishment_id = $1"];
    let queryParams: any[] = [establishmentId];
    let paramIndex = 2;

    if (filters.startDate) {
      whereConditions.push(`cs.session_date >= $${paramIndex}`);
      queryParams.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereConditions.push(`cs.session_date <= $${paramIndex}`);
      queryParams.push(filters.endDate);
      paramIndex++;
    }

    if (filters.instructorId) {
      whereConditions.push(
        `(cs.instructor_id = $${paramIndex} OR cs.override_instructor_id = $${paramIndex})`
      );
      queryParams.push(filters.instructorId);
      paramIndex++;
    }

    if (filters.status) {
      whereConditions.push(`cs.status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters.classTemplateId) {
      whereConditions.push(`cs.class_template_id = $${paramIndex}`);
      queryParams.push(filters.classTemplateId);
      paramIndex++;
    }

    if (filters.cohortId) {
      whereConditions.push(`cs.cohort_id = $${paramIndex}`);
      queryParams.push(filters.cohortId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM class_sessions cs WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get sessions with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.db.query(
      `
  SELECT cs.id, cs.establishment_id, cs.class_template_id, cs.instructor_id,
         cs.session_date, cs.start_time, cs.end_time, cs.capacity, cs.status,
         cs.notes, cs.parent_session_id,
         cs.cohort_id, cs.override_instructor_id, cs.session_type,
         cs.created_at, cs.updated_at,
         ct.title as template_title,
         c.name as cohort_name,
         CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
         CONCAT(override_u.first_name, ' ', override_u.last_name) as override_instructor_name,
         COALESCE(enrollment_count.count, 0) as enrollment_count
  FROM class_sessions cs
  LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
  LEFT JOIN cohorts c ON cs.cohort_id = c.id
  LEFT JOIN users u ON cs.instructor_id = u.id
  LEFT JOIN users override_u ON cs.override_instructor_id = override_u.id
  LEFT JOIN (
    SELECT session_id, COUNT(*) as count
    FROM session_enrollments
    WHERE is_waitlist = false
    GROUP BY session_id
  ) enrollment_count ON cs.id = enrollment_count.session_id
  WHERE ${whereClause}
  ORDER BY cs.session_date ASC, cs.start_time ASC
  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `,
      [...queryParams, limit, offset]
    );

    const sessions = await Promise.all(
      result.rows.map((row: any) => this.mapClassSessionRow(row))
    );

    return { sessions, total };
  }

  /**
   * Get upcoming sessions (next 7 days)
   */
  async getUpcomingSessions(
    establishmentId: string,
    daysAhead: number = 7
  ): Promise<ClassSession[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const result = await this.db.query(
      `
    SELECT cs.id, cs.establishment_id, cs.class_template_id, cs.instructor_id,
           cs.session_date, cs.start_time, cs.end_time, cs.capacity, cs.status,
           cs.notes, cs.is_recurring, cs.recurrence_frequency, 
           cs.recurrence_days_of_week, cs.recurrence_end_date, cs.parent_session_id,
           cs.cohort_id, cs.override_instructor_id, cs.session_type,
           cs.created_at, cs.updated_at,
           ct.title as template_title,
           c.name as cohort_name,
           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
           CONCAT(override_u.first_name, ' ', override_u.last_name) as override_instructor_name,
           COALESCE(enrollment_count.count, 0) as enrollment_count
    FROM class_sessions cs
    LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
    LEFT JOIN cohorts c ON cs.cohort_id = c.id
    LEFT JOIN users u ON cs.instructor_id = u.id
    LEFT JOIN users override_u ON cs.override_instructor_id = override_u.id
    LEFT JOIN (
      SELECT session_id, COUNT(*) as count
      FROM session_enrollments
      WHERE is_waitlist = false
      GROUP BY session_id
    ) enrollment_count ON cs.id = enrollment_count.session_id
    WHERE cs.establishment_id = $1 
      AND cs.session_date >= CURRENT_DATE 
      AND cs.session_date <= $2
      AND cs.status = 'scheduled'
    ORDER BY cs.session_date ASC, cs.start_time ASC
    `,
      [establishmentId, endDate.toISOString().split("T")[0]]
    );

    return await Promise.all(
      result.rows.map((row: any) => this.mapClassSessionRow(row))
    );
  }

  /**
   * Update class session
   */
  async updateClassSession(
    establishmentId: string,
    sessionId: string,
    updates: UpdateClassSessionRequest
  ): Promise<ClassSession | null> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.instructorId !== undefined) {
      updateFields.push(`instructor_id = $${paramIndex}`);
      updateValues.push(updates.instructorId);
      paramIndex++;
    }

    if (updates.sessionDate !== undefined) {
      updateFields.push(`session_date = $${paramIndex}`);
      updateValues.push(updates.sessionDate);
      paramIndex++;
    }

    if (updates.startTime !== undefined) {
      updateFields.push(`start_time = $${paramIndex}`);
      updateValues.push(updates.startTime);
      paramIndex++;
    }

    if (updates.endTime !== undefined) {
      updateFields.push(`end_time = $${paramIndex}`);
      updateValues.push(updates.endTime);
      paramIndex++;
    }

    if (updates.capacity !== undefined) {
      updateFields.push(`capacity = $${paramIndex}`);
      updateValues.push(updates.capacity);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(updates.status);
      paramIndex++;
    }

    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(updates.notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getClassSession(establishmentId, sessionId);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    const query = `
    UPDATE class_sessions 
    SET ${updateFields.join(", ")}
    WHERE establishment_id = $${paramIndex} AND id = $${paramIndex + 1}
    RETURNING id, establishment_id, class_template_id, instructor_id,
              session_date, start_time, end_time, capacity, status,
              notes, parent_session_id, created_at, updated_at, 
              cohort_id, override_instructor_id, session_type
  `;

    // Add this logging
    console.log("Executing query:", query);
    console.log("With values:", [...updateValues, establishmentId, sessionId]);
    const result = await this.db.query(query, [
      ...updateValues,
      establishmentId,
      sessionId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return await this.mapClassSessionRow(result.rows[0]);
  }

  // SESSION ENROLLMENT METHODS

  /**
   * Enroll student in session
   */
  async enrollStudent(
    establishmentId: string,
    sessionId: string,
    studentId: string, // This is actually a user_id
    isWaitlist: boolean = false
  ): Promise<SessionEnrollment> {
    const result = await this.db.query(
      `
    INSERT INTO session_enrollments (establishment_id, session_id, student_id, is_waitlist)
    VALUES ($1, $2, $3, $4)
    RETURNING id, establishment_id, session_id, student_id, enrollment_date, is_waitlist
    `,
      [establishmentId, sessionId, studentId, isWaitlist]
    );

    const enrollment = result.rows[0];

    // Get user details (assuming student_id is actually user_id)
    const userResult = await this.db.query(
      `SELECT CONCAT(first_name, ' ', last_name) as name, email 
     FROM users 
     WHERE id = $1`,
      [studentId]
    );

    const user = userResult.rows[0];

    return {
      id: enrollment.id,
      establishmentId: enrollment.establishment_id,
      sessionId: enrollment.session_id,
      studentId: enrollment.student_id,
      studentName: user.name,
      studentEmail: user.email,
      enrollmentDate: enrollment.enrollment_date,
      isWaitlist: enrollment.is_waitlist,
    };
  }

  /**
   * Remove student from session
   */
  async removeStudentFromSession(
    establishmentId: string,
    sessionId: string,
    studentId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      DELETE FROM session_enrollments
      WHERE establishment_id = $1 AND session_id = $2 AND student_id = $3
    `,
      [establishmentId, sessionId, studentId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get session enrollments
   */
  async getSessionEnrollments(
    establishmentId: string,
    sessionId: string
  ): Promise<SessionEnrollment[]> {
    const result = await this.db.query(
      `
    SELECT se.id, se.establishment_id, se.session_id, se.student_id,
           se.enrollment_date, se.is_waitlist,
           s.name as student_name, 
           s.email as student_email,
           s.phone as student_phone
    FROM session_enrollments se
    JOIN students s ON se.student_id = s.id
    WHERE se.establishment_id = $1 AND se.session_id = $2
    ORDER BY se.is_waitlist ASC, se.enrollment_date ASC
    `,
      [establishmentId, sessionId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      establishmentId: row.establishment_id,
      sessionId: row.session_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      studentPhone: row.student_phone,
      enrollmentDate: row.enrollment_date,
      isWaitlist: row.is_waitlist,
    }));
  }

  /**
   * Create multiple class sessions in bulk
   */
  async createBulkClassSessions(
    establishmentId: string,
    sessions: (CreateClassSessionRequest & {
      cohortId?: string;
      overrideInstructorId?: string;
      sessionType?: string;
    })[]
  ): Promise<ClassSession[]> {
    const client: PoolClient = await this.db.getClient();

    try {
      await client.query("BEGIN");

      const createdSessions: ClassSession[] = [];

      for (const session of sessions) {
        const result = await client.query(
          `
          INSERT INTO class_sessions (
            establishment_id, class_template_id, instructor_id, session_date,
            start_time, end_time, capacity, notes, is_recurring,
            recurrence_frequency, recurrence_days_of_week, recurrence_end_date,
            cohort_id, override_instructor_id, session_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id, establishment_id, class_template_id, instructor_id,
                    session_date, start_time, end_time, capacity, status,
                    notes, is_recurring, recurrence_frequency, recurrence_days_of_week,
                    recurrence_end_date, parent_session_id, cohort_id, override_instructor_id, 
                    session_type, created_at, updated_at
        `,
          [
            establishmentId,
            session.classTemplateId || null,
            session.instructorId || null,
            session.sessionDate,
            session.startTime,
            session.endTime || null,
            session.capacity || 12,
            session.notes || null,
            session.isRecurring || false,
            session.recurrenceFrequency || null,
            session.recurrenceDaysOfWeek || null,
            session.recurrenceEndDate || null,
            session.cohortId || null,
            session.overrideInstructorId || null,
            session.sessionType || "regular",
          ]
        );

        const mappedSession = await this.mapClassSessionRow(result.rows[0]);
        createdSessions.push(mappedSession);
      }

      await client.query("COMMIT");
      return createdSessions;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Enroll multiple users in a session (bulk enrollment)
   */
  async bulkEnrollUsersInSession(
    establishmentId: string,
    sessionId: string,
    userIds: string[],
    isWaitlist: boolean = false
  ): Promise<SessionEnrollment[]> {
    const client: PoolClient = await this.db.getClient();

    try {
      await client.query("BEGIN");

      const enrollments: SessionEnrollment[] = [];

      for (const userId of userIds) {
        // Check if already enrolled
        const existingResult = await client.query(
          "SELECT 1 FROM session_enrollments WHERE establishment_id = $1 AND session_id = $2 AND student_id = $3",
          [establishmentId, sessionId, userId]
        );

        if (existingResult.rows.length > 0) {
          continue; // Skip if already enrolled
        }

        const result = await client.query(
          `
          INSERT INTO session_enrollments (establishment_id, session_id, student_id, is_waitlist)
          VALUES ($1, $2, $3, $4)
          RETURNING id, establishment_id, session_id, student_id, enrollment_date, is_waitlist
          `,
          [establishmentId, sessionId, userId, isWaitlist]
        );

        const enrollment = result.rows[0];

        // Get user details
        const userResult = await client.query(
          "SELECT CONCAT(first_name, ' ', last_name) as name, email FROM users WHERE id = $1",
          [userId]
        );

        const user = userResult.rows[0];

        enrollments.push({
          id: enrollment.id,
          establishmentId: enrollment.establishment_id,
          sessionId: enrollment.session_id,
          studentId: enrollment.student_id,
          studentName: user.name,
          studentEmail: user.email,
          enrollmentDate: enrollment.enrollment_date,
          isWaitlist: enrollment.is_waitlist,
        });
      }

      await client.query("COMMIT");
      return enrollments;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get student's enrolled sessions
   */
  async getStudentEnrolledSessions(
    establishmentId: string,
    studentId: string, // This is actually a user_id
    includeCompleted: boolean = false
  ): Promise<StudentEnrolledSession[]> {
    let statusCondition = includeCompleted
      ? ""
      : "AND cs.status IN ('scheduled', 'in_progress')";

    const result = await this.db.query(
      `
    SELECT se.session_id, se.enrollment_date, se.is_waitlist,
           cs.session_date, cs.start_time, cs.end_time, cs.status, cs.cohort_id, cs.session_type,
           ct.title as template_title,
           c.name as cohort_name,
           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
           CONCAT(override_u.first_name, ' ', override_u.last_name) as override_instructor_name
    FROM session_enrollments se
    JOIN class_sessions cs ON se.session_id = cs.id
    LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
    LEFT JOIN cohorts c ON cs.cohort_id = c.id
    LEFT JOIN users u ON cs.instructor_id = u.id
    LEFT JOIN users override_u ON cs.override_instructor_id = override_u.id
    WHERE se.establishment_id = $1 AND se.student_id = $2 ${statusCondition}
    ORDER BY cs.session_date ASC, cs.start_time ASC
    `,
      [establishmentId, studentId]
    );

    return result.rows.map((row: any) => ({
      sessionId: row.session_id,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      templateTitle: row.template_title || "Custom Session",
      cohortName: row.cohort_name,
      cohortId: row.cohort_id,
      sessionType: row.session_type || "regular",
      instructorName: row.override_instructor_name || row.instructor_name,
      status: row.status,
      isWaitlist: row.is_waitlist,
      enrollmentDate: row.enrollment_date,
    }));
  }

  /**
   * Check if student is already enrolled in session
   */
  async isStudentEnrolled(
    establishmentId: string,
    sessionId: string,
    studentId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      SELECT 1 FROM session_enrollments
      WHERE establishment_id = $1 AND session_id = $2 AND student_id = $3
    `,
      [establishmentId, sessionId, studentId]
    );

    return result.rows.length > 0;
  }

  // STUDENT PACKAGE METHODS

  /**
   * Get active student package
   */
  async getActiveStudentPackage(
    establishmentId: string,
    studentId: string
  ): Promise<StudentPackage | null> {
    const result = await this.db.query(
      `
      SELECT id, establishment_id, student_id, package_type, remaining_classes,
             start_date, end_date, payment_status, last_payment_date, next_due_date,
             price, is_active, created_at, updated_at
      FROM student_packages
      WHERE establishment_id = $1 AND student_id = $2 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [establishmentId, studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapStudentPackageRow(result.rows[0]);
  }

  /**
   * Deduct package credit
   */
  async deductPackageCredit(
    establishmentId: string,
    packageId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      UPDATE student_packages
      SET remaining_classes = remaining_classes - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE establishment_id = $1 AND id = $2 AND remaining_classes > 0
    `,
      [establishmentId, packageId]
    );

    return result.rowCount > 0;
  }

  // STATISTICS AND REPORTING

  /**
   * Get class statistics
   */
  async getClassStats(establishmentId: string): Promise<ClassStats> {
    const results = await Promise.all([
      // Total and active templates
      this.db.query(
        `
        SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active
        FROM class_templates WHERE establishment_id = $1
      `,
        [establishmentId]
      ),
      // Total and upcoming sessions
      this.db.query(
        `
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN session_date >= CURRENT_DATE AND status = 'scheduled' THEN 1 END) as upcoming
        FROM class_sessions WHERE establishment_id = $1
      `,
        [establishmentId]
      ),
      // Total enrollments
      this.db.query(
        `SELECT COUNT(*) as total FROM session_enrollments WHERE establishment_id = $1`,
        [establishmentId]
      ),
      // Popular class types
      this.db.query(
        `
        SELECT ct.class_type, COUNT(cs.id) as count
        FROM class_templates ct
        LEFT JOIN class_sessions cs ON ct.id = cs.class_template_id
        WHERE ct.establishment_id = $1
        GROUP BY ct.class_type
        ORDER BY count DESC
        LIMIT 5
      `,
        [establishmentId]
      ),
    ]);

    const templateStats = results[0].rows[0];
    const sessionStats = results[1].rows[0];
    const enrollmentStats = results[2].rows[0];
    const classTypeStats = results[3].rows;

    return {
      totalTemplates: parseInt(templateStats.total),
      activeTemplates: parseInt(templateStats.active),
      totalSessions: parseInt(sessionStats.total),
      upcomingSessions: parseInt(sessionStats.upcoming),
      totalEnrollments: parseInt(enrollmentStats.total),
      averageEnrollmentRate: 0, // TODO: Calculate this properly
      popularClassTypes: classTypeStats.map((row: any) => ({
        classType: row.class_type,
        count: parseInt(row.count),
      })),
      monthlyRevenue: 0, // TODO: Calculate from payments
    };
  }

  /**
   * Get calendar events for date range
   */
  async getCalendarEvents(
    establishmentId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const result = await this.db.query(
      `
    SELECT cs.id, cs.session_date, cs.start_time, cs.end_time, cs.capacity, cs.status,
           cs.cohort_id, cs.session_type,
           ct.title, ct.class_type, ct.skill_level,
           c.name as cohort_name,
           CONCAT(override_u.first_name, ' ', override_u.last_name) as override_instructor_name,
           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
           COALESCE(enrollment_count.count, 0) as enrollment_count
    FROM class_sessions cs
    LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
    LEFT JOIN cohorts c ON cs.cohort_id = c.id
    LEFT JOIN users u ON cs.instructor_id = u.id
    LEFT JOIN users override_u ON cs.override_instructor_id = override_u.id
    LEFT JOIN (
      SELECT session_id, COUNT(*) as count
      FROM session_enrollments
      WHERE is_waitlist = false
      GROUP BY session_id
    ) enrollment_count ON cs.id = enrollment_count.session_id
    WHERE cs.establishment_id = $1
      AND cs.session_date >= $2
      AND cs.session_date <= $3
    ORDER BY cs.session_date ASC, cs.start_time ASC
    `,
      [establishmentId, startDate, endDate]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.cohort_name || row.title || "Custom Session",
      date: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      instructorName: row.override_instructor_name || row.instructor_name,
      enrollmentCount: parseInt(row.enrollment_count),
      capacity: row.capacity,
      status: row.status,
      classType: row.class_type || "ballet",
      skillLevel: row.skill_level || "all_levels",
      cohortId: row.cohort_id,
      cohortName: row.cohort_name,
      sessionType: row.session_type || "regular",
    }));
  }

  /**
   * Log activity
   */
  async logActivity(
    establishmentId: string,
    activityType: ActivityType,
    title: string,
    description?: string,
    studentId?: string,
    sessionId?: string,
    userId?: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<void> {
    const activityTableExists = await this.tableExists("activities");
    if (!activityTableExists) {
      return; // Skip logging if table doesn't exist
    }

    await this.db.query(
      `
      INSERT INTO activities (
        establishment_id, activity_type, title, description,
        student_id, session_id, user_id, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        establishmentId,
        activityType,
        title,
        description || null,
        studentId || null,
        sessionId || null,
        userId || null,
        priority,
      ]
    );
  }

  // PRIVATE HELPER METHODS

  /**
   * Map database row to ClassTemplate object
   */
  private mapClassTemplateRow(row: any): ClassTemplate {
    return {
      id: row.id,
      establishmentId: row.establishment_id,
      title: row.title,
      classType: row.class_type,
      skillLevel: row.skill_level,
      instructorId: row.instructor_id,
      instructorName: row.instructor_name,
      capacity: row.capacity,
      durationMinutes: row.duration_minutes,
      price: parseFloat(row.price),
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to ClassSession object
   */
  private async mapClassSessionRow(row: any): Promise<ClassSession> {
    return {
      id: row.id,
      establishmentId: row.establishment_id,
      classTemplateId: row.class_template_id,
      templateTitle: row.template_title,
      instructorId: row.instructor_id,
      instructorName: row.override_instructor_name || row.instructor_name,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      capacity: row.capacity,
      status: row.status,
      notes: row.notes,
      isRecurring: row.is_recurring,
      recurrenceFrequency: row.recurrence_frequency,
      recurrenceDaysOfWeek: row.recurrence_days_of_week,
      recurrenceEndDate: row.recurrence_end_date,
      parentSessionId: row.parent_session_id,
      cohortId: row.cohort_id,
      cohortName: row.cohort_name,
      overrideInstructorId: row.override_instructor_id,
      overrideInstructorName: row.override_instructor_name,
      sessionType: row.session_type || "regular",
      enrollmentCount: parseInt(row.enrollment_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to StudentPackage object
   */
  private mapStudentPackageRow(row: any): StudentPackage {
    return {
      id: row.id,
      establishmentId: row.establishment_id,
      studentId: row.student_id,
      packageType: row.package_type,
      remainingClasses: row.remaining_classes,
      startDate: row.start_date,
      endDate: row.end_date,
      paymentStatus: row.payment_status,
      lastPaymentDate: row.last_payment_date,
      nextDueDate: row.next_due_date,
      price: parseFloat(row.price),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get all dropdown data for classes
   */
  async getDropdownData(establishmentId: string): Promise<{
    instructors: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      role: string;
      isActive: boolean;
    }>;
    classTypes: Array<{
      id: number;
      nameTr: string;
      nameEn: string;
      isActive: boolean;
    }>;
    classLevels: Array<{
      id: number;
      nameTr: string;
      nameEn: string;
      isActive: boolean;
    }>;
  }> {
    // Get instructors and managers (both can teach classes)
    const instructorsResult = await this.db.query(
      `
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.email,
        u.phone,
        ue.role,
        CASE WHEN u.status = 'active' AND ue.status = 'active' THEN true ELSE false END as is_active
      FROM users u
      INNER JOIN user_establishments ue ON u.id = ue.user_id
      WHERE ue.establishment_id = $1 
        AND ue.role IN ('instructor', 'manager')
      ORDER BY 
        CASE ue.role 
          WHEN 'manager' THEN 1 
          WHEN 'instructor' THEN 2 
        END,
        u.first_name, u.last_name
    `,
      [establishmentId]
    );

    // Get class types
    const classTypesResult = await this.db.query(
      `
      SELECT id, name_tr, name_en, is_active
      FROM class_types
      WHERE is_active = true
      ORDER BY display_order
    `
    );

    // Get class levels
    const classLevelsResult = await this.db.query(
      `
      SELECT id, name_tr, name_en, is_active
      FROM class_levels
      WHERE is_active = true
      ORDER BY display_order
    `
    );

    return {
      instructors: instructorsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || undefined,
        role: row.role,
        isActive: row.is_active,
      })),
      classTypes: classTypesResult.rows.map((row: any) => ({
        id: row.id,
        nameTr: row.name_tr,
        nameEn: row.name_en,
        isActive: row.is_active,
      })),
      classLevels: classLevelsResult.rows.map((row: any) => ({
        id: row.id,
        nameTr: row.name_tr,
        nameEn: row.name_en,
        isActive: row.is_active,
      })),
    };
  }

  /**
   * Get cohort by ID
   */
  async getCohort(
    establishmentId: string,
    cohortId: string
  ): Promise<{
    id: string;
    name: string;
    templateId: string;
    instructorId: string;
    maxStudents: number;
    scheduleStartTime: string;
    termStartDate: string;
    termEndDate: string;
  } | null> {
    const result = await this.db.query(
      `
      SELECT id, name, template_id, instructor_id, max_students, 
             schedule_start_time, term_start_date, term_end_date
      FROM cohorts 
      WHERE establishment_id = $1 AND id = $2 AND is_active = true
    `,
      [establishmentId, cohortId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      templateId: row.template_id,
      instructorId: row.instructor_id,
      maxStudents: row.max_students,
      scheduleStartTime: row.schedule_start_time,
      termStartDate: row.term_start_date,
      termEndDate: row.term_end_date,
    };
  }

  /**
   * Get all members of a cohort
   */
  async getCohortMembers(
    establishmentId: string,
    cohortId: string
  ): Promise<string[]> {
    const result = await this.db.query(
      `
      SELECT student_id
      FROM cohort_memberships 
      WHERE establishment_id = $1 AND cohort_id = $2 AND is_active = true
    `,
      [establishmentId, cohortId]
    );

    return result.rows.map((row: any) => row.student_id);
  }
}
