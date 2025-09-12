import { COHORT_ERRORS, } from "./cohorts.types.js";
import { ERROR_MESSAGES } from "../../utils/error-messages.js";
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
                    message: ERROR_MESSAGES.INVALID_TERM_DATES,
                    error: {
                        code: COHORT_ERRORS.INVALID_TERM_DATES,
                        message: ERROR_MESSAGES.INVALID_TERM_DATES,
                    },
                };
            }
            const scheduleValidation = this.validateSchedule(cohort.scheduleDays, cohort.scheduleStartTime, cohort.scheduleDurationMinutes);
            if (!scheduleValidation.isValid) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.INVALID_SCHEDULE,
                    error: {
                        code: COHORT_ERRORS.INVALID_SCHEDULE,
                        message: ERROR_MESSAGES.INVALID_SCHEDULE,
                    },
                };
            }
            if (cohort.ageMin && cohort.ageMax && cohort.ageMin > cohort.ageMax) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                    error: {
                        code: COHORT_ERRORS.INVALID_AGE_RANGE,
                        message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                    },
                };
            }
            const conflictCheck = await this.checkInstructorAvailability(establishmentId, cohort.instructorId, cohort.scheduleDays, cohort.scheduleStartTime, cohort.templateId, cohort.termStartDate, cohort.termEndDate);
            if (!conflictCheck.isAvailable) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.INSTRUCTOR_NOT_AVAILABLE,
                    error: {
                        code: COHORT_ERRORS.INSTRUCTOR_NOT_AVAILABLE,
                        message: ERROR_MESSAGES.INSTRUCTOR_NOT_AVAILABLE,
                    },
                };
            }
            const createdCohort = await this.cohortsRepository.createCohort(establishmentId, cohort);
            await this.cohortsRepository.logActivity(establishmentId, "class", "Cohort created", `Created cohort: ${createdCohort.name}`, userId);
            this.logger.info("Cohort created successfully", {
                cohortId: createdCohort.id,
                establishmentId,
                userId,
            });
            return {
                success: true,
                data: createdCohort,
                message: ERROR_MESSAGES.COHORT_CREATED_SUCCESSFULLY,
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
                message: ERROR_MESSAGES.COHORT_CREATION_FAILED,
                error: {
                    code: COHORT_ERRORS.COHORT_CREATION_FAILED,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
                },
            };
        }
    }
    async updateCohort(establishmentId, cohortId, updates, userId) {
        try {
            const currentCohort = await this.cohortsRepository.getCohort(establishmentId, cohortId);
            if (!currentCohort) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    },
                };
            }
            const scheduleFieldsUpdated = updates.instructorId !== undefined ||
                updates.scheduleDays !== undefined ||
                updates.scheduleStartTime !== undefined ||
                updates.termStartDate !== undefined ||
                updates.termEndDate !== undefined;
            if (scheduleFieldsUpdated) {
                const instructorId = updates.instructorId ?? currentCohort.instructorId;
                const scheduleDays = updates.scheduleDays ?? currentCohort.scheduleDays;
                const scheduleStartTime = updates.scheduleStartTime ?? currentCohort.scheduleStartTime;
                const termStartDate = updates.termStartDate ?? currentCohort.termStartDate;
                const termEndDate = updates.termEndDate ?? currentCohort.termEndDate;
                const templateId = updates.templateId ?? currentCohort.templateId;
                if (instructorId && scheduleDays && scheduleStartTime && termStartDate && termEndDate) {
                    const conflictCheck = await this.checkInstructorAvailabilityForUpdate(establishmentId, cohortId, instructorId, scheduleDays, scheduleStartTime, templateId, termStartDate, termEndDate);
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
                }
            }
            if (updates.ageMin !== undefined && updates.ageMax !== undefined) {
                if (updates.ageMin > updates.ageMax) {
                    return {
                        success: false,
                        message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                        error: {
                            code: COHORT_ERRORS.INVALID_AGE_RANGE,
                            message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                        },
                    };
                }
            }
            else if (updates.ageMin !== undefined && currentCohort.ageMax) {
                if (updates.ageMin > currentCohort.ageMax) {
                    return {
                        success: false,
                        message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                        error: {
                            code: COHORT_ERRORS.INVALID_AGE_RANGE,
                            message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                        },
                    };
                }
            }
            else if (updates.ageMax !== undefined && currentCohort.ageMin) {
                if (currentCohort.ageMin > updates.ageMax) {
                    return {
                        success: false,
                        message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                        error: {
                            code: COHORT_ERRORS.INVALID_AGE_RANGE,
                            message: ERROR_MESSAGES.MIN_AGE_GREATER_THAN_MAX,
                        },
                    };
                }
            }
            const updatedCohort = await this.cohortsRepository.updateCohort(establishmentId, cohortId, updates);
            if (!updatedCohort) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.COHORT_UPDATE_FAILED,
                    error: {
                        code: COHORT_ERRORS.COHORT_UPDATE_FAILED,
                        message: ERROR_MESSAGES.COHORT_UPDATE_FAILED,
                    },
                };
            }
            this.logger.info("Cohort updated successfully", {
                cohortId,
                establishmentId,
                userId,
                updatedFields: Object.keys(updates),
            });
            return {
                success: true,
                data: updatedCohort,
                message: ERROR_MESSAGES.COHORT_UPDATED_SUCCESSFULLY,
            };
        }
        catch (error) {
            this.logger.error("Failed to update cohort", {
                error,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: false,
                message: ERROR_MESSAGES.COHORT_UPDATE_FAILED,
                error: {
                    code: COHORT_ERRORS.COHORT_UPDATE_FAILED,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
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
                    message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    },
                };
            }
            const generateFromDate = options.generateFromDate || cohort.termStartDate;
            const generateToDate = options.generateToDate || cohort.termEndDate;
            const sessionDates = this.calculateSessionDates(cohort.scheduleDays, generateFromDate, generateToDate, options.includeHolidays ? [] : cohort.holidayBreaks);
            if (sessionDates.length === 0) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.NO_VALID_SESSION_DATES,
                    error: {
                        code: COHORT_ERRORS.INVALID_SCHEDULE,
                        message: ERROR_MESSAGES.NO_VALID_SESSION_DATES,
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
            await this.cohortsRepository.logActivity(establishmentId, "class", "Sessions generated", `Generated ${sessionsCreated} sessions for cohort: ${cohort.name}`, userId);
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
                message: `${sessionsCreated} ${ERROR_MESSAGES.SESSIONS_GENERATED_SUCCESSFULLY}`,
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
                message: ERROR_MESSAGES.FAILED_TO_GENERATE_SESSIONS,
                error: {
                    code: COHORT_ERRORS.SESSIONS_ALREADY_GENERATED,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
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
                    message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: ERROR_MESSAGES.COHORT_NOT_FOUND,
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
            if (enrolled > 0) {
                await this.cohortsRepository.logActivity(establishmentId, "enrollment", "Bulk enrollment", `Bulk enrolled ${enrolled} students in cohort: ${cohort.name}`, userId);
            }
            return {
                success: true,
                data: { enrolled, failed },
                message: `${enrolled} ${ERROR_MESSAGES.ENROLLED_STUDENTS_SUCCESSFULLY}`,
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
                message: ERROR_MESSAGES.FAILED_TO_ENROLL_STUDENTS,
                error: {
                    code: COHORT_ERRORS.MEMBERSHIP_CREATION_FAILED,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
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
                    message: ERROR_MESSAGES.STUDENT_NOT_FOUND_IN_COHORT,
                    error: {
                        code: COHORT_ERRORS.STUDENT_NOT_ENROLLED,
                        message: ERROR_MESSAGES.STUDENT_NOT_FOUND_IN_COHORT,
                    },
                };
            }
            if (options.removeFromFutureSessions) {
                const effectiveDate = options.effectiveDate || new Date().toISOString().split("T")[0];
                await this.removeFromFutureSessions(establishmentId, cohortId, studentId, effectiveDate);
            }
            await this.cohortsRepository.logActivity(establishmentId, "enrollment", "Student left cohort", `Student removed from cohort`, userId, studentId);
            this.logger.info("Student removed from cohort", {
                studentId,
                cohortId,
                establishmentId,
                userId,
            });
            return {
                success: true,
                data: true,
                message: ERROR_MESSAGES.STUDENT_REMOVED_SUCCESSFULLY,
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
                message: ERROR_MESSAGES.FAILED_TO_REMOVE_STUDENT,
                error: {
                    code: COHORT_ERRORS.MEMBERSHIP_CREATION_FAILED,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
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
                    message: ERROR_MESSAGES.ORIGINAL_COHORT_NOT_FOUND,
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: ERROR_MESSAGES.ORIGINAL_COHORT_NOT_FOUND,
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
                message: ERROR_MESSAGES.FAILED_TO_CLONE_COHORT,
                error: {
                    code: COHORT_ERRORS.COHORT_CREATION_FAILED,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
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
                error: ERROR_MESSAGES.TERM_END_AFTER_START,
            };
        }
        const diffMonths = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (diffMonths > 6) {
            return { isValid: false, error: ERROR_MESSAGES.TERM_LENGTH_EXCEEDS_LIMIT };
        }
        return { isValid: true };
    }
    validateSchedule(days, startTime, durationMinutes) {
        if (!days || days.length === 0) {
            return { isValid: false, error: ERROR_MESSAGES.AT_LEAST_ONE_SCHEDULE_DAY };
        }
        if (days.some((day) => day < 0 || day > 6)) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.INVALID_SCHEDULE_DAYS,
            };
        }
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
            return { isValid: false, error: ERROR_MESSAGES.INVALID_START_TIME_FORMAT };
        }
        const [hours, minutes] = startTime.split(":").map(Number);
        const endTime = this.calculateEndTime(startTime, durationMinutes);
        const [endHours] = endTime.split(":").map(Number);
        return { isValid: true };
    }
    async checkInstructorAvailabilityForUpdate(establishmentId, excludeCohortId, instructorId, scheduleDays, scheduleStartTime, templateId, termStartDate, termEndDate) {
        try {
            const templateResult = await this.db.query("SELECT duration_minutes FROM class_templates WHERE id = $1", [templateId]);
            if (templateResult.rows.length === 0) {
                return {
                    isAvailable: false,
                    reason: "Class template not found",
                };
            }
            const durationMinutes = templateResult.rows[0].duration_minutes;
            const [hours, minutes] = scheduleStartTime.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + durationMinutes;
            const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
            const conflictingCohorts = await this.db.query(`
        SELECT c.id, c.name, c.schedule_days, c.schedule_start_time,
               ct.duration_minutes,
               c.term_start_date, c.term_end_date
        FROM cohorts c
        INNER JOIN class_templates ct ON c.template_id = ct.id
        WHERE c.establishment_id = $1
          AND c.instructor_id = $2
          AND c.is_active = true
          AND c.id != $3
          AND (
            (c.term_start_date <= $4 AND c.term_end_date >= $5) OR
            (c.term_start_date <= $6 AND c.term_end_date >= $5) OR
            (c.term_start_date >= $5 AND c.term_start_date <= $6)
          )
        `, [
                establishmentId,
                instructorId,
                excludeCohortId,
                termStartDate,
                termStartDate,
                termEndDate,
            ]);
            for (const cohort of conflictingCohorts.rows) {
                const cohortDays = cohort.schedule_days;
                const cohortStartTime = cohort.schedule_start_time;
                const cohortDuration = cohort.duration_minutes;
                const dayOverlap = scheduleDays.some((day) => cohortDays.includes(day));
                if (dayOverlap) {
                    const [cohortHours, cohortMinutes] = cohortStartTime.split(':').map(Number);
                    const cohortStartMinutes = cohortHours * 60 + cohortMinutes;
                    const cohortEndMinutes = cohortStartMinutes + cohortDuration;
                    const buffer = 15;
                    const timeOverlap = ((startMinutes >= cohortStartMinutes - buffer && startMinutes <= cohortEndMinutes + buffer) ||
                        (endMinutes >= cohortStartMinutes - buffer && endMinutes <= cohortEndMinutes + buffer) ||
                        (startMinutes <= cohortStartMinutes && endMinutes >= cohortEndMinutes));
                    if (timeOverlap) {
                        const dayNames = {
                            0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
                            4: 'Thursday', 5: 'Friday', 6: 'Saturday'
                        };
                        const conflictDays = scheduleDays
                            .filter((day) => cohortDays.includes(day))
                            .map((day) => dayNames[day])
                            .join(', ');
                        return {
                            isAvailable: false,
                            reason: `Instructor has a conflicting cohort "${cohort.name}" on ${conflictDays} from ${cohortStartTime} to ${Math.floor(cohortEndMinutes / 60)}:${(cohortEndMinutes % 60).toString().padStart(2, '0')}`
                        };
                    }
                }
            }
            return { isAvailable: true };
        }
        catch (error) {
            this.logger.error("Error checking instructor availability for update", {
                error,
                instructorId,
                excludeCohortId,
            });
            return {
                isAvailable: false,
                reason: "Failed to check instructor availability",
            };
        }
    }
    async checkInstructorAvailability(establishmentId, instructorId, scheduleDays, startTime, newCohortTemplateId, termStart, termEnd, excludeCohortId) {
        try {
            const conflictingCohorts = await this.db.query(`
      WITH new_cohort_details AS (
        -- Use a CTE to get the duration of the proposed new cohort just once
        SELECT duration_minutes
        FROM class_templates
        WHERE id = $8 -- The templateId for the new cohort
      )
      SELECT c.name
      FROM cohorts c
      -- Join to get the duration for EXISTING cohorts
      JOIN class_templates ct_existing ON c.template_id = ct_existing.id
      -- Cross join with our new cohort's details
      CROSS JOIN new_cohort_details
      WHERE
        c.establishment_id = $1
        AND c.instructor_id = $2
        AND c.is_active = true
        AND c.id != COALESCE($7, '00000000-0000-0000-0000-000000000000')::uuid
        AND c.schedule_days && $3::integer[]
        AND (c.term_start_date, c.term_end_date) OVERLAPS ($5::date, $6::date)
        -- The OVERLAPS check using both durations
        AND (
          -- Interval for the EXISTING cohort from the join
          c.schedule_start_time,
          c.schedule_start_time + (ct_existing.duration_minutes || ' minutes')::interval
        ) OVERLAPS (
          -- Interval for the NEW cohort using the duration from the CTE
          $4::time,
          $4::time + (new_cohort_details.duration_minutes || ' minutes')::interval
        )
      `, [
                establishmentId,
                instructorId,
                scheduleDays,
                startTime,
                termStart,
                termEnd,
                excludeCohortId,
                newCohortTemplateId,
            ]);
            if (conflictingCohorts.rows.length > 0) {
                return {
                    isAvailable: false,
                    reason: `Instructor has a conflicting class: ${conflictingCohorts.rows[0].name}`,
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
        const endHours = Math.floor(endMinutes / 60) % 24;
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
                    message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    error: {
                        code: COHORT_ERRORS.COHORT_NOT_FOUND,
                        message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                    },
                };
            }
            return {
                success: true,
                data: cohort,
                message: ERROR_MESSAGES.COHORT_RETRIEVED_SUCCESSFULLY,
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
                message: ERROR_MESSAGES.COHORT_NOT_FOUND,
                error: {
                    code: COHORT_ERRORS.COHORT_NOT_FOUND,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
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
                    message: ERROR_MESSAGES.FAILED_TO_RETRIEVE_COHORTS,
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
                message: ERROR_MESSAGES.STATISTICS_RETRIEVED_SUCCESSFULLY,
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
                message: ERROR_MESSAGES.FAILED_TO_RETRIEVE_STATISTICS,
                error: {
                    code: COHORT_ERRORS.COHORT_NOT_FOUND,
                    message: ERROR_MESSAGES.UNEXPECTED_ERROR,
                },
            };
        }
    }
}
