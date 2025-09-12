import { DatabaseService } from "../../services/DatabaseService.js";
import {
  Cohort,
  CohortMembership,
  CohortStats,
  CreateCohortRequest,
  UpdateCohortRequest,
  AddStudentToCohortRequest,
  RemoveStudentFromCohortRequest,
  CohortFilters,
  CohortMembershipFilters,
  CohortEnrollmentSummary,
  HolidayBreak,
} from "./cohorts.types.js";
import { ERROR_MESSAGES } from "../../utils/error-messages.js";

export class CohortsRepository {
  constructor(private db: DatabaseService) {}

  /**
   * Log activity to activities table
   */
  async logActivity(
    establishmentId: string,
    activityType: 'class' | 'enrollment',
    title: string,
    description: string,
    userId?: string,
    studentId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO activities (
        establishment_id, activity_type, title, description,
        user_id, student_id, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        establishmentId,
        activityType,
        title,
        description,
        userId || null,
        studentId || null,
        sessionId || null,
      ]
    );
  }

  // COHORT CRUD OPERATIONS

  /**
   * Create a new cohort
   */
  async createCohort(
    establishmentId: string,
    cohort: CreateCohortRequest
  ): Promise<Cohort> {
    const result = await this.db.query(
      `
    INSERT INTO cohorts (
      establishment_id, template_id, instructor_id, name, description,
      age_min, age_max, max_students, schedule_days, schedule_start_time,
      -- 'schedule_duration_minutes' has been REMOVED from this list
      term_start_date, term_end_date, holiday_breaks, makeup_policy
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) -- Placeholder count is now 14
    RETURNING *
  `,
      [
        establishmentId, // $1
        cohort.templateId, // $2
        cohort.instructorId, // $3
        cohort.name, // $4
        cohort.description || null, // $5
        cohort.ageMin || null, // $6
        cohort.ageMax || null, // $7
        cohort.maxStudents, // $8
        cohort.scheduleDays, // $9
        cohort.scheduleStartTime, // $10
        cohort.termStartDate, // $11
        cohort.termEndDate, // $12
        JSON.stringify(cohort.holidayBreaks || []), // $13
        cohort.makeupPolicy || null, // $14
      ]
    );

    return this.mapCohortRow(result.rows[0]);
  }

  /**
   * Get cohort by ID with template and instructor details
   */
  async getCohort(
    establishmentId: string,
    cohortId: string
  ): Promise<Cohort | null> {
    const result = await this.db.query(
      `
      SELECT c.*, 
             ct.title as template_title, ct.class_type, ct.skill_level,
             CONCAT(u.first_name, ' ', u.last_name) as instructor_name
      FROM cohorts c
      LEFT JOIN class_templates ct ON c.template_id = ct.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.establishment_id = $1 AND c.id = $2
    `,
      [establishmentId, cohortId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapCohortRowWithDetails(result.rows[0]);
  }

  /**
   * Get all cohorts with filters
   */
  async getCohorts(
    establishmentId: string,
    filters: CohortFilters = {}
  ): Promise<{ cohorts: Cohort[]; total: number }> {
    let whereConditions = ["c.establishment_id = $1"];
    let queryParams: any[] = [establishmentId];
    let paramIndex = 2;

    if (filters.instructorId) {
      whereConditions.push(`c.instructor_id = $${paramIndex}`);
      queryParams.push(filters.instructorId);
      paramIndex++;
    }

    if (filters.templateId) {
      whereConditions.push(`c.template_id = $${paramIndex}`);
      queryParams.push(filters.templateId);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      whereConditions.push(`c.is_active = $${paramIndex}`);
      queryParams.push(filters.isActive);
      paramIndex++;
    }

    if (filters.ageMin !== undefined) {
      whereConditions.push(
        `(c.age_min IS NULL OR c.age_min <= $${paramIndex})`
      );
      queryParams.push(filters.ageMin);
      paramIndex++;
    }

    if (filters.ageMax !== undefined) {
      whereConditions.push(
        `(c.age_max IS NULL OR c.age_max >= $${paramIndex})`
      );
      queryParams.push(filters.ageMax);
      paramIndex++;
    }

    if (filters.scheduleDays && filters.scheduleDays.length > 0) {
      whereConditions.push(`c.schedule_days && $${paramIndex}`);
      queryParams.push(filters.scheduleDays);
      paramIndex++;
    }

    if (filters.termActive) {
      whereConditions.push(
        `c.term_start_date <= CURRENT_DATE AND c.term_end_date >= CURRENT_DATE`
      );
    }

    if (filters.hasAvailableSpots) {
      whereConditions.push(`
        c.max_students > (
          SELECT COUNT(*) FROM cohort_memberships cm 
          WHERE cm.cohort_id = c.id AND cm.is_active = true
        )
      `);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM cohorts c WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get cohorts with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.db.query(
      `
      SELECT c.*, 
             ct.title as template_title, ct.class_type, ct.skill_level,
             CONCAT(u.first_name, ' ', u.last_name) as instructor_name
      FROM cohorts c
      LEFT JOIN class_templates ct ON c.template_id = ct.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE ${whereClause}
      ORDER BY c.term_start_date DESC, c.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
      [...queryParams, limit, offset]
    );

    const cohorts = result.rows.map((row: any) =>
      this.mapCohortRowWithDetails(row)
    );

    return { cohorts, total };
  }

  /**
   * Update cohort
   */
  async updateCohort(
    establishmentId: string,
    cohortId: string,
    updates: UpdateCohortRequest
  ): Promise<Cohort | null> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(updates.name);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(updates.description);
      paramIndex++;
    }

    if (updates.instructorId !== undefined) {
      updateFields.push(`instructor_id = $${paramIndex}`);
      updateValues.push(updates.instructorId);
      paramIndex++;
    }

    if (updates.ageMin !== undefined) {
      updateFields.push(`age_min = $${paramIndex}`);
      updateValues.push(updates.ageMin);
      paramIndex++;
    }

    if (updates.ageMax !== undefined) {
      updateFields.push(`age_max = $${paramIndex}`);
      updateValues.push(updates.ageMax);
      paramIndex++;
    }

    if (updates.maxStudents !== undefined) {
      updateFields.push(`max_students = $${paramIndex}`);
      updateValues.push(updates.maxStudents);
      paramIndex++;
    }

    if (updates.scheduleDays !== undefined) {
      updateFields.push(`schedule_days = $${paramIndex}`);
      updateValues.push(updates.scheduleDays);
      paramIndex++;
    }

    if (updates.scheduleStartTime !== undefined) {
      updateFields.push(`schedule_start_time = $${paramIndex}`);
      updateValues.push(updates.scheduleStartTime);
      paramIndex++;
    }

    if (updates.scheduleDurationMinutes !== undefined) {
      updateFields.push(`schedule_duration_minutes = $${paramIndex}`);
      updateValues.push(updates.scheduleDurationMinutes);
      paramIndex++;
    }

    if (updates.termStartDate !== undefined) {
      updateFields.push(`term_start_date = $${paramIndex}`);
      updateValues.push(updates.termStartDate);
      paramIndex++;
    }

    if (updates.termEndDate !== undefined) {
      updateFields.push(`term_end_date = $${paramIndex}`);
      updateValues.push(updates.termEndDate);
      paramIndex++;
    }

    if (updates.holidayBreaks !== undefined) {
      updateFields.push(`holiday_breaks = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.holidayBreaks));
      paramIndex++;
    }

    if (updates.makeupPolicy !== undefined) {
      updateFields.push(`makeup_policy = $${paramIndex}`);
      updateValues.push(updates.makeupPolicy);
      paramIndex++;
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(updates.isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getCohort(establishmentId, cohortId);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");

    const result = await this.db.query(
      `
      UPDATE cohorts 
      SET ${updateFields.join(", ")}
      WHERE establishment_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `,
      [...updateValues, establishmentId, cohortId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapCohortRow(result.rows[0]);
  }

  /**
   * Delete cohort (soft delete by setting inactive)
   */
  async deleteCohort(
    establishmentId: string,
    cohortId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      UPDATE cohorts 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE establishment_id = $1 AND id = $2
    `,
      [establishmentId, cohortId]
    );

    return result.rowCount > 0;
  }

  // COHORT MEMBERSHIP OPERATIONS

  /**
   * Add student to cohort
   */
  async addStudentToCohort(
    establishmentId: string,
    cohortId: string,
    request: AddStudentToCohortRequest
  ): Promise<CohortMembership> {
    // Verify cohort belongs to establishment
    const cohortCheck = await this.db.query(
      "SELECT 1 FROM cohorts WHERE id = $1 AND establishment_id = $2",
      [cohortId, establishmentId]
    );
    if (cohortCheck.rows.length === 0) {
      throw new Error(ERROR_MESSAGES.COHORT_NOT_FOUND_OR_ACCESS_DENIED);
    }

    // Check if student is already enrolled
    const existing = await this.isStudentEnrolled(cohortId, request.studentId);
    if (existing) {
      throw new Error(ERROR_MESSAGES.STUDENT_ALREADY_ENROLLED);
    }

    // Check cohort capacity
    const capacityCheck = await this.db.query(
      `
      SELECT c.max_students,
             COUNT(cm.id) FILTER (WHERE cm.is_active = true) as current_enrollment
      FROM cohorts c
      LEFT JOIN cohort_memberships cm ON c.id = cm.cohort_id
      WHERE c.id = $1
      GROUP BY c.id, c.max_students
    `,
      [cohortId]
    );

    if (capacityCheck.rows.length > 0) {
      const { max_students, current_enrollment } = capacityCheck.rows[0];
      if (parseInt(current_enrollment) >= max_students) {
        throw new Error(ERROR_MESSAGES.COHORT_AT_FULL_CAPACITY);
      }
    }

    const result = await this.db.query(
      `
      INSERT INTO cohort_memberships (
        cohort_id, student_id, payment_type, joined_date, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        cohortId,
        request.studentId,
        request.paymentType,
        request.joinedDate || new Date().toISOString().split("T")[0],
        request.notes || null,
      ]
    );

    return this.mapMembershipRow(result.rows[0]);
  }

  /**
   * Remove student from cohort
   */
  async removeStudentFromCohort(
    establishmentId: string,
    cohortId: string,
    studentId: string,
    request: RemoveStudentFromCohortRequest = {}
  ): Promise<CohortMembership | null> {
    // Verify cohort belongs to establishment
    const cohortCheck = await this.db.query(
      "SELECT 1 FROM cohorts WHERE id = $1 AND establishment_id = $2",
      [cohortId, establishmentId]
    );
    if (cohortCheck.rows.length === 0) {
      throw new Error(ERROR_MESSAGES.COHORT_NOT_FOUND_OR_ACCESS_DENIED);
    }

    const leftDate = request.leftDate || new Date().toISOString().split("T")[0];

    const result = await this.db.query(
      `
      UPDATE cohort_memberships 
      SET is_active = false, left_date = $1, notes = COALESCE($2, notes)
      WHERE cohort_id = $3 AND student_id = $4 AND is_active = true
      RETURNING *
    `,
      [leftDate, request.notes, cohortId, studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapMembershipRow(result.rows[0]);
  }

  /**
   * Get cohort memberships
   */
  async getCohortMemberships(
    establishmentId: string,
    filters: CohortMembershipFilters = {}
  ): Promise<{ memberships: CohortMembership[]; total: number }> {
    let whereConditions = ["c.establishment_id = $1"];
    let queryParams: any[] = [establishmentId];
    let paramIndex = 2;

    if (filters.cohortId) {
      whereConditions.push(`cm.cohort_id = $${paramIndex}`);
      queryParams.push(filters.cohortId);
      paramIndex++;
    }

    if (filters.studentId) {
      whereConditions.push(`cm.student_id = $${paramIndex}`);
      queryParams.push(filters.studentId);
      paramIndex++;
    }

    if (filters.paymentType) {
      whereConditions.push(`cm.payment_type = $${paramIndex}`);
      queryParams.push(filters.paymentType);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      whereConditions.push(`cm.is_active = $${paramIndex}`);
      queryParams.push(filters.isActive);
      paramIndex++;
    }

    if (filters.joinedAfter) {
      whereConditions.push(`cm.joined_date >= $${paramIndex}`);
      queryParams.push(filters.joinedAfter);
      paramIndex++;
    }

    if (filters.joinedBefore) {
      whereConditions.push(`cm.joined_date <= $${paramIndex}`);
      queryParams.push(filters.joinedBefore);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await this.db.query(
      `
      SELECT COUNT(*) 
      FROM cohort_memberships cm
      JOIN cohorts c ON cm.cohort_id = c.id
      WHERE ${whereClause}
    `,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get memberships with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.db.query(
      `
  SELECT cm.*, 
         CONCAT(u.first_name, ' ', u.last_name) as student_name,
         u.email as student_email,
         c.name as cohort_name
  FROM cohort_memberships cm
  JOIN cohorts c ON cm.cohort_id = c.id
  LEFT JOIN users u ON cm.student_id = u.id  -- student_id is actually user_id
  WHERE ${whereClause}
  ORDER BY cm.joined_date DESC
  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `,
      [...queryParams, limit, offset]
    );

    const memberships = result.rows.map((row: any) =>
      this.mapMembershipRowWithDetails(row)
    );

    return { memberships, total };
  }

  /**
   * Get cohort statistics
   */
  async getCohortStats(
    establishmentId: string,
    cohortId?: string
  ): Promise<CohortStats[]> {
    const whereClause = cohortId
      ? "WHERE establishment_id = $1 AND id = $2"
      : "WHERE establishment_id = $1";

    const params = cohortId ? [establishmentId, cohortId] : [establishmentId];

    const result = await this.db.query(
      `SELECT * FROM cohort_stats ${whereClause} ORDER BY name`,
      params
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      establishmentId: row.establishment_id,
      name: row.name,
      maxStudents: parseInt(row.max_students),
      currentEnrollment: parseInt(row.current_enrollment),
      availableSpots: parseInt(row.available_spots),
      enrollmentPercentage: parseFloat(row.enrollment_percentage),
      termStartDate: row.term_start_date,
      termEndDate: row.term_end_date,
      isActive: row.is_active,
    }));
  }

  /**
   * Get enrollment summary for cohort
   */
  async getCohortEnrollmentSummary(
    establishmentId: string,
    cohortId: string
  ): Promise<CohortEnrollmentSummary | null> {
    const result = await this.db.query(
      `
      SELECT 
        c.id as cohort_id,
        c.name as cohort_name,
        COUNT(cm.id) as total_students,
        COUNT(cm.id) FILTER (WHERE cm.is_active = true) as active_students,
        COUNT(cm.id) FILTER (WHERE cm.payment_type = 'package' AND cm.is_active = true) as package_count,
        COUNT(cm.id) FILTER (WHERE cm.payment_type = 'term_fee' AND cm.is_active = true) as term_fee_count,
        COUNT(cm.id) FILTER (WHERE cm.payment_type = 'drop_in' AND cm.is_active = true) as drop_in_count,
        COUNT(cm.id) FILTER (WHERE cm.joined_date >= date_trunc('month', CURRENT_DATE)) as joined_this_month,
        COUNT(cm.id) FILTER (WHERE cm.left_date >= date_trunc('month', CURRENT_DATE) AND cm.left_date IS NOT NULL) as left_this_month
      FROM cohorts c
      LEFT JOIN cohort_memberships cm ON c.id = cm.cohort_id
      WHERE c.establishment_id = $1 AND c.id = $2
      GROUP BY c.id, c.name
    `,
      [establishmentId, cohortId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      cohortId: row.cohort_id,
      cohortName: row.cohort_name,
      totalStudents: parseInt(row.total_students),
      activeStudents: parseInt(row.active_students),
      paymentBreakdown: {
        package: parseInt(row.package_count),
        termFee: parseInt(row.term_fee_count),
        dropIn: parseInt(row.drop_in_count),
      },
      joinedThisMonth: parseInt(row.joined_this_month),
      leftThisMonth: parseInt(row.left_this_month),
    };
  }

  /**
   * Check if student is enrolled in cohort
   */
  async isStudentEnrolled(
    cohortId: string,
    studentId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      SELECT 1 FROM cohort_memberships 
      WHERE cohort_id = $1 AND student_id = $2 AND is_active = true
    `,
      [cohortId, studentId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get active cohort members for session generation
   * @param cohortId - The cohort ID
   * @param beforeDate - Optional date to only include members who joined before this date
   */
  async getActiveCohortMembers(
    cohortId: string,
    beforeDate?: string
  ): Promise<string[]> {
    const dateCondition = beforeDate ? "AND joined_date <= $2" : "";
    const params = beforeDate ? [cohortId, beforeDate] : [cohortId];

    const result = await this.db.query(
      `
      SELECT student_id FROM cohort_memberships 
      WHERE cohort_id = $1 AND is_active = true ${dateCondition}
    `,
      params
    );

    return result.rows.map((row: any) => row.student_id);
  }

  // UTILITY METHODS

  private mapCohortRow(row: any): Cohort {
    return {
      id: row.id,
      establishmentId: row.establishment_id,
      templateId: row.template_id,
      instructorId: row.instructor_id,
      name: row.name,
      description: row.description,
      ageMin: row.age_min,
      ageMax: row.age_max,
      maxStudents: row.max_students,
      scheduleDays: row.schedule_days,
      scheduleStartTime: row.schedule_start_time,
      scheduleDurationMinutes: row.schedule_duration_minutes,
      termStartDate: row.term_start_date,
      termEndDate: row.term_end_date,
      holidayBreaks: (() => {
        try {
          return typeof row.holiday_breaks === "string"
            ? JSON.parse(row.holiday_breaks)
            : row.holiday_breaks || [];
        } catch {
          return [];
        }
      })(),
      makeupPolicy: row.makeup_policy,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCohortRowWithDetails(row: any): Cohort {
    return {
      ...this.mapCohortRow(row),
      templateTitle: row.template_title,
      instructorName: row.instructor_name,
      classType: row.class_type,
      skillLevel: row.skill_level,
    };
  }

  private mapMembershipRow(row: any): CohortMembership {
    return {
      id: row.id,
      cohortId: row.cohort_id,
      studentId: row.student_id,
      paymentType: row.payment_type,
      joinedDate: row.joined_date,
      leftDate: row.left_date,
      isActive: row.is_active,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  private mapMembershipRowWithDetails(row: any): CohortMembership {
    return {
      ...this.mapMembershipRow(row),
      studentName: row.student_name,
      studentEmail: row.student_email,
      cohortName: row.cohort_name,
    };
  }
}
