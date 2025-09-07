import { COHORT_ERRORS, } from "./cohorts.types.js";
export class CohortsService {
    cohortsRepository;
    db;
    logger;
    constructor(cohortsRepository, db, logger) {
        this.cohortsRepository = cohortsRepository;
        this.db = db;
        this.logger = logger;
    }
    async createCohort(establishmentId, cohort, userId) {
        try {
            const termValidation = this.validateTermDates(cohort.termStartDate, cohort.termEndDate);
            if (!termValidation.isValid) {
                return {
                    success: false,
                    message: termValidation.error,
                    error: {
                        code: COHORT_ERRORS.INVALID_TERM_DATES,
                        message: termValidation.error,
                    },
                };
            }
            const scheduleValidation = this.validateSchedule(cohort.scheduleDays, cohort.scheduleStartTime, cohort.scheduleDurationMinutes);
            if (!scheduleValidation.isValid) {
                return {
                    success: false,
                    message: scheduleValidation.error,
                    error: {
                        code: COHORT_ERRORS.INVALID_SCHEDULE,
                        message: scheduleValidation.error,
                    },
                };
            }
            if (cohort.ageMin && cohort.ageMax && cohort.ageMin > cohort.ageMax) {
                return {
                    success: false,
                    message: "Minimum age cannot be greater than maximum age",
                    error: {
                        code: COHORT_ERRORS.INVALID_AGE_RANGE,
                        message: "Minimum age cannot be greater than maximum age",
                    },
                };
            }
            const conflictCheck = await this.checkInstructorAvailability(establishmentId, cohort.instructorId, cohort.scheduleDays, cohort.scheduleStartTime, cohort.scheduleDurationMinutes, cohort.termStartDate, cohort.termEndDate);
            if (!conflictCheck.isAvailable) {
                return {
                    success: false,
                    message: conflictCheck.reason,
                    error: {
                        code: COHORT_ERRORS.INSTRUCTOR_NOT_AVAILABLE,
                        message: conflictCheck.reason,
                    },
                };
            }
            const createdCohort = await this.cohortsRepository.createCohort(establishmentId, cohort);
            this.logger.info("Cohort created successfully", {
                cohortId: createdCohort.id,
                establishmentId,
                userId,
            });
            return {
                success: true,
                data: createdCohort,
                message: "Cohort created successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to create cohort", {
                error,
                establishmentId,
                userId,
            });
            return {
                success: false,
                message: "Failed to create cohort",
                error: {
                    code: COHORT_ERRORS.COHORT_CREATION_FAILED,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
    async generateCohortSessions(establishmentId, cohortId, options = {}, userId) {
        try {
            const cohort = await this.cohortsRepository.getCohort(establishmentId, cohortId);
            if (!cohort) {
                return {
                    success: false,
                    message: "Cohort not found",
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: "Cohort not found",
                    },
                };
            }
            const generateFromDate = options.generateFromDate || cohort.termStartDate;
            const generateToDate = options.generateToDate || cohort.termEndDate;
            const sessionDates = this.calculateSessionDates(cohort.scheduleDays, generateFromDate, generateToDate, options.includeHolidays ? [] : cohort.holidayBreaks);
            if (sessionDates.length === 0) {
                return {
                    success: false,
                    message: "No valid session dates found in the specified range",
                    error: {
                        code: COHORT_ERRORS.INVALID_SCHEDULE,
                        message: "No valid session dates found",
                    },
                };
            }
            const cohortMembers = await this.cohortsRepository.getActiveCohortMembers(cohortId, generateFromDate);
            let sessionsCreated = 0;
            let enrollmentsCreated = 0;
            const skippedDates = [];
            await this.db.transaction(async (client) => {
                for (const sessionDate of sessionDates) {
                    try {
                        const startTime = cohort.scheduleStartTime;
                        const endTime = this.calculateEndTime(startTime, cohort.scheduleDurationMinutes);
                        const sessionResult = await client.query(`
              INSERT INTO class_sessions (
                establishment_id, cohort_id, class_template_id, instructor_id,
                session_date, start_time, end_time, capacity, status, session_type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING id
            `, [
                            establishmentId,
                            cohortId,
                            cohort.templateId,
                            cohort.instructorId,
                            sessionDate,
                            startTime,
                            endTime,
                            cohort.maxStudents,
                            "scheduled",
                            "regular",
                        ]);
                        const sessionId = sessionResult.rows[0].id;
                        sessionsCreated++;
                        if (cohortMembers.length > 0 && !options.skipEnrollment) {
                            for (const studentId of cohortMembers) {
                                try {
                                    await client.query(`
                    INSERT INTO session_enrollments (
                      establishment_id, session_id, student_id, is_waitlist
                    ) VALUES ($1, $2, $3, $4)
                  `, [establishmentId, sessionId, studentId, false]);
                                    enrollmentsCreated++;
                                }
                                catch (enrollError) {
                                    this.logger.warn("Failed to enroll student in session", {
                                        studentId,
                                        sessionId,
                                        error: enrollError,
                                    });
                                }
                            }
                        }
                    }
                    catch (sessionError) {
                        this.logger.warn("Failed to create session", {
                            sessionDate,
                            cohortId,
                            error: sessionError,
                        });
                        skippedDates.push(sessionDate);
                    }
                }
            });
            this.logger.info("Sessions generated for cohort", {
                cohortId,
                sessionsCreated,
                enrollmentsCreated,
                establishmentId,
                userId,
            });
            return {
                success: true,
                data: {
                    cohortId,
                    sessionsGenerated: sessionsCreated,
                    enrollmentsCreated,
                    startDate: generateFromDate,
                    endDate: generateToDate,
                    skippedDates,
                },
                message: `Generated ${sessionsCreated} sessions with ${enrollmentsCreated} enrollments`,
            };
        }
        catch (error) {
            this.logger.error("Failed to generate cohort sessions", {
                error,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: false,
                message: "Failed to generate sessions",
                error: {
                    code: COHORT_ERRORS.SESSIONS_ALREADY_GENERATED,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
    async bulkEnrollStudents(establishmentId, cohortId, studentIds, paymentType, userId) {
        try {
            const cohort = await this.cohortsRepository.getCohort(establishmentId, cohortId);
            if (!cohort) {
                return {
                    success: false,
                    message: "Cohort not found",
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: "Cohort not found",
                    },
                };
            }
            let enrolled = 0;
            const failed = [];
            for (const studentId of studentIds) {
                try {
                    const isEnrolled = await this.cohortsRepository.isStudentEnrolled(cohortId, studentId);
                    if (isEnrolled) {
                        failed.push(studentId);
                        continue;
                    }
                    await this.cohortsRepository.addStudentToCohort(establishmentId, cohortId, {
                        studentId,
                        paymentType: paymentType,
                        notes: `Bulk enrolled by ${userId}`,
                    });
                    await this.enrollInFutureSessions(establishmentId, cohortId, studentId);
                    enrolled++;
                }
                catch (error) {
                    this.logger.warn("Failed to enroll student in cohort", {
                        studentId,
                        cohortId,
                        error,
                    });
                    failed.push(studentId);
                }
            }
            return {
                success: true,
                data: { enrolled, failed },
                message: `Enrolled ${enrolled} students successfully`,
            };
        }
        catch (error) {
            this.logger.error("Failed to bulk enroll students", {
                error,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: false,
                message: "Failed to enroll students",
                error: {
                    code: COHORT_ERRORS.MEMBERSHIP_CREATION_FAILED,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
    async handleStudentDeparture(establishmentId, cohortId, studentId, options = {}, userId) {
        try {
            const membership = await this.cohortsRepository.removeStudentFromCohort(establishmentId, cohortId, studentId, {
                leftDate: options.effectiveDate,
                notes: options.notes || `Removed by ${userId}`,
            });
            if (!membership) {
                return {
                    success: false,
                    message: "Student not found in cohort",
                    error: {
                        code: COHORT_ERRORS.STUDENT_NOT_ENROLLED,
                        message: "Student not found in cohort",
                    },
                };
            }
            if (options.removeFromFutureSessions) {
                const effectiveDate = options.effectiveDate || new Date().toISOString().split("T")[0];
                await this.removeFromFutureSessions(establishmentId, cohortId, studentId, effectiveDate);
            }
            this.logger.info("Student removed from cohort", {
                studentId,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: true,
                data: true,
                message: "Student removed from cohort successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to handle student departure", {
                error,
                studentId,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: false,
                message: "Failed to remove student from cohort",
                error: {
                    code: COHORT_ERRORS.MEMBERSHIP_CREATION_FAILED,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
    async cloneCohort(establishmentId, cohortId, newTermDates, userId) {
        try {
            const originalCohort = await this.cohortsRepository.getCohort(establishmentId, cohortId);
            if (!originalCohort) {
                return {
                    success: false,
                    message: "Original cohort not found",
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: "Original cohort not found",
                    },
                };
            }
            const newCohortRequest = {
                templateId: originalCohort.templateId,
                instructorId: originalCohort.instructorId,
                name: `${originalCohort.name} (${newTermDates.startDate})`,
                description: originalCohort.description,
                ageMin: originalCohort.ageMin,
                ageMax: originalCohort.ageMax,
                maxStudents: originalCohort.maxStudents,
                scheduleDays: originalCohort.scheduleDays,
                scheduleStartTime: originalCohort.scheduleStartTime,
                scheduleDurationMinutes: originalCohort.scheduleDurationMinutes,
                termStartDate: newTermDates.startDate,
                termEndDate: newTermDates.endDate,
                holidayBreaks: originalCohort.holidayBreaks,
                makeupPolicy: originalCohort.makeupPolicy,
            };
            return await this.createCohort(establishmentId, newCohortRequest, userId);
        }
        catch (error) {
            this.logger.error("Failed to clone cohort", {
                error,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: false,
                message: "Failed to clone cohort",
                error: {
                    code: COHORT_ERRORS.COHORT_CREATION_FAILED,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
    validateTermDates(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            return {
                isValid: false,
                error: "Term end date must be after start date",
            };
        }
        const diffMonths = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (diffMonths > 6) {
            return { isValid: false, error: "Term length cannot exceed 6 months" };
        }
        return { isValid: true };
    }
    validateSchedule(days, startTime, durationMinutes) {
        if (!days || days.length === 0) {
            return { isValid: false, error: "At least one schedule day is required" };
        }
        if (days.some((day) => day < 0 || day > 6)) {
            return {
                isValid: false,
                error: "Schedule days must be between 0 (Sunday) and 6 (Saturday)",
            };
        }
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
            return { isValid: false, error: "Invalid start time format. Use HH:MM" };
        }
        const [hours, minutes] = startTime.split(":").map(Number);
        const endTime = this.calculateEndTime(startTime, durationMinutes);
        const [endHours] = endTime.split(":").map(Number);
        if (hours < 6 || endHours > 22) {
            return {
                isValid: false,
                error: "Class time must be between 6:00 AM and 10:00 PM",
            };
        }
        if (durationMinutes < 15 || durationMinutes > 180) {
            return {
                isValid: false,
                error: "Class duration must be between 15 and 180 minutes",
            };
        }
        return { isValid: true };
    }
    async checkInstructorAvailability(establishmentId, instructorId, scheduleDays, startTime, durationMinutes, termStart, termEnd) {
        try {
            const endTime = this.calculateEndTime(startTime, durationMinutes);
            const conflictingCohorts = await this.db.query(`
        SELECT c.name 
        FROM cohorts c
        WHERE c.establishment_id = $1 
          AND c.instructor_id = $2
          AND c.is_active = true
          AND c.id != COALESCE($7, '00000000-0000-0000-0000-000000000000')
          AND c.schedule_days && $3
          AND (
            (c.schedule_start_time <= $4 AND $4 < (c.schedule_start_time + (c.schedule_duration_minutes || ' minutes')::interval))
            OR 
            ($4 <= c.schedule_start_time AND c.schedule_start_time < $5)
          )
          AND (
            (c.term_start_date <= $6 AND $6 <= c.term_end_date)
            OR
            ($6 <= c.term_start_date AND c.term_start_date <= $7)
          )
      `, [
                establishmentId,
                instructorId,
                scheduleDays,
                startTime,
                endTime,
                termStart,
                termEnd,
            ]);
            if (conflictingCohorts.rows.length > 0) {
                return {
                    isAvailable: false,
                    reason: `Instructor has conflicting cohort: ${conflictingCohorts.rows[0].name}`,
                };
            }
            return { isAvailable: true };
        }
        catch (error) {
            this.logger.error("Error checking instructor availability", {
                error,
                instructorId,
            });
            return {
                isAvailable: false,
                reason: "Could not verify instructor availability",
            };
        }
    }
    calculateSessionDates(scheduleDays, startDate, endDate, holidayBreaks) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            if (scheduleDays.includes(dayOfWeek)) {
                const dateString = date.toISOString().split("T")[0];
                if (!this.isDateInHolidayBreak(dateString, holidayBreaks)) {
                    dates.push(dateString);
                }
            }
        }
        return dates;
    }
    isDateInHolidayBreak(date, holidayBreaks) {
        return holidayBreaks.some((holiday) => {
            return date >= holiday.start && date <= holiday.end;
        });
    }
    calculateEndTime(startTime, durationMinutes) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + durationMinutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        return `${endHours.toString().padStart(2, "0")}:${endMins
            .toString()
            .padStart(2, "0")}`;
    }
    async enrollInFutureSessions(establishmentId, cohortId, studentId) {
        const today = new Date().toISOString().split("T")[0];
        const futureSessions = await this.db.query(`
      SELECT id FROM class_sessions 
      WHERE cohort_id = $1 AND session_date >= $2 AND status = 'scheduled'
      ORDER BY session_date, start_time
    `, [cohortId, today]);
        for (const session of futureSessions.rows) {
            try {
                await this.db.query(`
          INSERT INTO session_enrollments (establishment_id, session_id, student_id, is_waitlist)
          VALUES ($1, $2, $3, false)
          ON CONFLICT (session_id, student_id) DO NOTHING
        `, [establishmentId, session.id, studentId]);
            }
            catch (error) {
                this.logger.warn("Failed to enroll student in future session", {
                    sessionId: session.id,
                    studentId,
                    error,
                });
            }
        }
    }
    async removeFromFutureSessions(establishmentId, cohortId, studentId, effectiveDate) {
        await this.db.query(`
      DELETE FROM session_enrollments se
      USING class_sessions cs
      WHERE se.session_id = cs.id
        AND cs.cohort_id = $1
        AND se.student_id = $2
        AND cs.session_date >= $3
    `, [cohortId, studentId, effectiveDate]);
    }
    async getCohort(establishmentId, cohortId) {
        try {
            const cohort = await this.cohortsRepository.getCohort(establishmentId, cohortId);
            if (!cohort) {
                return {
                    success: false,
                    message: "Cohort not found",
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: "Cohort not found",
                    },
                };
            }
            return {
                success: true,
                data: cohort,
                message: "Cohort retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to get cohort", {
                error,
                cohortId,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to retrieve cohort",
                error: {
                    code: COHORT_ERRORS.COHORT_NOT_FOUND,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
    async getCohorts(establishmentId, filters) {
        try {
            const { cohorts, total } = await this.cohortsRepository.getCohorts(establishmentId, filters);
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: cohorts,
                pagination: { total, page, limit, totalPages },
            };
        }
        catch (error) {
            this.logger.error("Failed to get cohorts", {
                error,
                establishmentId,
                filters,
            });
            return {
                success: false,
                data: [],
                pagination: {
                    total: 0,
                    page: 1,
                    limit: filters.limit || 50,
                    totalPages: 0,
                },
                error: {
                    code: COHORT_ERRORS.COHORT_NOT_FOUND,
                    message: "Failed to retrieve cohorts",
                },
            };
        }
    }
    async getCohortStats(establishmentId, cohortId) {
        try {
            const stats = await this.cohortsRepository.getCohortStats(establishmentId, cohortId);
            return {
                success: true,
                data: stats,
                message: "Statistics retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to get cohort stats", {
                error,
                establishmentId,
                cohortId,
            });
            return {
                success: false,
                message: "Failed to retrieve statistics",
                error: {
                    code: COHORT_ERRORS.COHORT_NOT_FOUND,
                    message: "An unexpected error occurred",
                },
            };
        }
    }
}
