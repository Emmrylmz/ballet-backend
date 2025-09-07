const CLASS_ERRORS = {
    TEMPLATE_NOT_FOUND: "Template not found",
    SESSION_NOT_FOUND: "Session not found",
    SESSION_FULL: "Session is at full capacity",
    INSUFFICIENT_PACKAGE_CREDITS: "Insufficient package credits",
    DUPLICATE_ENROLLMENT: "Student is already enrolled in this session",
    CANNOT_CANCEL_PAST_SESSION: "Cannot cancel past session",
    INVALID_DATE_RANGE: "Invalid date range",
    INVALID_CAPACITY: "Capacity must be a positive integer",
    INVALID_DURATION: "Duration must be between 15 and 180 minutes",
    INVALID_PRICE: "Price must be non-negative",
    SESSION_IN_PAST: "Cannot create session in the past",
    TEMPLATE_INACTIVE: "Template is not active",
    STUDENT_NOT_FOUND: "Student not found",
    INSTRUCTOR_NOT_FOUND: "Instructor not found",
    ENROLLMENT_NOT_FOUND: "Enrollment not found",
    PACKAGE_EXPIRED: "Student package has expired",
};
export class ClassesService {
    classesRepository;
    logger;
    constructor(classesRepository, logger) {
        this.classesRepository = classesRepository;
        this.logger = logger;
    }
    async createClassTemplate(establishmentId, template, userId) {
        try {
            this.logger.info("Creating class template", {
                establishmentId,
                title: template.title,
                classType: template.classType,
                userId,
            });
            const validation = this.validateTemplateData(template);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.errors[0] || "",
                    error: {
                        code: "VALIDATION_ERROR",
                        message: validation.errors[0] || "",
                    },
                };
            }
            const createdTemplate = await this.classesRepository.createClassTemplate(establishmentId, template);
            await this.classesRepository.logActivity(establishmentId, "class", `Template created: ${template.title}`, `Class type: ${template.classType}, Skill level: ${template.skillLevel}`, undefined, undefined, userId, "medium");
            return {
                success: true,
                data: createdTemplate,
                message: "Class template created successfully",
            };
        }
        catch (error) {
            console.log(error, "debug");
            this.logger.error("Failed to create class template", {
                error,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to create class template",
                error: {
                    code: "CREATE_TEMPLATE_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async getClassTemplate(establishmentId, templateId) {
        try {
            const template = await this.classesRepository.getClassTemplate(establishmentId, templateId);
            if (!template) {
                return {
                    success: false,
                    message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    error: {
                        code: "TEMPLATE_NOT_FOUND",
                        message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    },
                };
            }
            return {
                success: true,
                data: template,
                message: "Class template retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to get class template", {
                error,
                establishmentId,
                templateId,
            });
            return {
                success: false,
                message: "Failed to get class template",
                error: { code: "GET_TEMPLATE_ERROR", message: "Internal server error" },
            };
        }
    }
    async getClassTemplates(establishmentId, filters = {}) {
        try {
            const { templates, total } = await this.classesRepository.getClassTemplates(establishmentId, filters);
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: templates,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                },
            };
        }
        catch (error) {
            this.logger.error("Failed to get class templates", {
                error,
                establishmentId,
            });
            return {
                success: false,
                data: [],
                pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
                error: {
                    code: "GET_TEMPLATES_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async updateClassTemplate(establishmentId, templateId, updates, userId) {
        try {
            this.logger.info("Updating class template", {
                establishmentId,
                templateId,
                userId,
            });
            if (Object.keys(updates).length === 0) {
                return {
                    success: false,
                    message: "No updates provided",
                    error: { code: "NO_UPDATES", message: "No updates provided" },
                };
            }
            const validation = this.validateTemplateUpdates(updates);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.errors[0] || "",
                    error: {
                        code: "VALIDATION_ERROR",
                        message: validation.errors[0] || "",
                    },
                };
            }
            const updatedTemplate = await this.classesRepository.updateClassTemplate(establishmentId, templateId, updates);
            if (!updatedTemplate) {
                return {
                    success: false,
                    message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    error: {
                        code: "TEMPLATE_NOT_FOUND",
                        message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    },
                };
            }
            await this.classesRepository.logActivity(establishmentId, "class", `Template updated: ${updatedTemplate.title}`, `Updates: ${Object.keys(updates).join(", ")}`, undefined, undefined, userId, "medium");
            return {
                success: true,
                data: updatedTemplate,
                message: "Class template updated successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to update class template", {
                error,
                establishmentId,
                templateId,
            });
            return {
                success: false,
                message: "Failed to update class template",
                error: {
                    code: "UPDATE_TEMPLATE_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async deleteClassTemplate(establishmentId, templateId, userId) {
        try {
            this.logger.info("Deleting class template", {
                establishmentId,
                templateId,
                userId,
            });
            const template = await this.classesRepository.getClassTemplate(establishmentId, templateId);
            if (!template) {
                return {
                    success: false,
                    message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    error: {
                        code: "TEMPLATE_NOT_FOUND",
                        message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    },
                };
            }
            const deleted = await this.classesRepository.deleteClassTemplate(establishmentId, templateId);
            if (!deleted) {
                return {
                    success: false,
                    message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    error: {
                        code: "TEMPLATE_NOT_FOUND",
                        message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    },
                };
            }
            await this.classesRepository.logActivity(establishmentId, "class", `Template deleted: ${template.title}`, "Template has been deactivated", undefined, undefined, userId, "high");
            return {
                success: true,
                message: "Class template deleted successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to delete class template", {
                error,
                establishmentId,
                templateId,
            });
            return {
                success: false,
                message: "Failed to delete class template",
                error: {
                    code: "DELETE_TEMPLATE_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async createClassSession(establishmentId, session, userId) {
        try {
            this.logger.info("Creating class session", {
                establishmentId,
                sessionDate: session.sessionDate,
                classTemplateId: session.classTemplateId,
                userId,
            });
            const validation = await this.validateSessionData(establishmentId, session);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.errors[0] || "",
                    error: {
                        code: "VALIDATION_ERROR",
                        message: validation.errors[0] || "",
                    },
                };
            }
            if (session.classTemplateId) {
                const template = await this.classesRepository.getClassTemplate(establishmentId, session.classTemplateId);
                if (!template) {
                    return {
                        success: false,
                        message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                        error: {
                            code: "TEMPLATE_NOT_FOUND",
                            message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                        },
                    };
                }
                if (!template.isActive) {
                    return {
                        success: false,
                        message: CLASS_ERRORS.TEMPLATE_INACTIVE,
                        error: {
                            code: "TEMPLATE_INACTIVE",
                            message: CLASS_ERRORS.TEMPLATE_INACTIVE,
                        },
                    };
                }
                if (!session.endTime) {
                    const startTime = new Date(`2000-01-01T${session.startTime}`);
                    const endTime = new Date(startTime.getTime() + template.durationMinutes * 60000);
                    session.endTime = endTime.toTimeString().slice(0, 5);
                }
                if (!session.capacity) {
                    session.capacity = template.capacity;
                }
                if (!session.instructorId) {
                    session.instructorId = template.instructorId;
                }
            }
            const createdSession = await this.classesRepository.createClassSession(establishmentId, session);
            await this.classesRepository.logActivity(establishmentId, "class", `Session created for ${session.sessionDate}`, `Start time: ${session.startTime}`, undefined, createdSession.id, userId, "medium");
            return {
                success: true,
                data: createdSession,
                message: "Class session created successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to create class session", {
                error,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to create class session",
                error: {
                    code: "CREATE_SESSION_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async generateSessionsFromTemplate(establishmentId, templateId, request, userId) {
        try {
            this.logger.info("Generating sessions from template", {
                establishmentId,
                templateId,
                startDate: request.startDate,
                endDate: request.endDate,
                userId,
            });
            const template = await this.classesRepository.getClassTemplate(establishmentId, templateId);
            if (!template || !template.isActive) {
                return {
                    success: false,
                    message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    error: {
                        code: "TEMPLATE_NOT_FOUND",
                        message: CLASS_ERRORS.TEMPLATE_NOT_FOUND,
                    },
                };
            }
            const sessions = [];
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();
                if (request.daysOfWeek.includes(dayOfWeek)) {
                    const sessionDate = date.toISOString().split("T")[0];
                    let endTime = request.endTime;
                    if (!endTime) {
                        const startTime = new Date(`2000-01-01T${request.startTime}`);
                        const calculatedEndTime = new Date(startTime.getTime() + template.durationMinutes * 60000);
                        endTime = calculatedEndTime.toTimeString().slice(0, 5);
                    }
                    const sessionRequest = {
                        classTemplateId: templateId,
                        instructorId: request.instructorId || template.instructorId,
                        sessionDate,
                        startTime: request.startTime,
                        endTime,
                        capacity: request.capacity || template.capacity,
                        isRecurring: false,
                    };
                    const result = await this.createClassSession(establishmentId, sessionRequest, userId);
                    if (result.success && result.data) {
                        sessions.push(result.data);
                    }
                }
            }
            return {
                success: true,
                data: sessions,
                message: `Generated ${sessions.length} sessions successfully`,
            };
        }
        catch (error) {
            this.logger.error("Failed to generate sessions from template", {
                error,
                establishmentId,
                templateId,
            });
            return {
                success: false,
                message: "Failed to generate sessions",
                error: {
                    code: "GENERATE_SESSIONS_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async getClassSession(establishmentId, sessionId) {
        try {
            const session = await this.classesRepository.getClassSession(establishmentId, sessionId);
            if (!session) {
                return {
                    success: false,
                    message: CLASS_ERRORS.SESSION_NOT_FOUND,
                    error: {
                        code: "SESSION_NOT_FOUND",
                        message: CLASS_ERRORS.SESSION_NOT_FOUND,
                    },
                };
            }
            return {
                success: true,
                data: session,
                message: "Class session retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to get class session", {
                error,
                establishmentId,
                sessionId,
            });
            return {
                success: false,
                message: "Failed to get class session",
                error: { code: "GET_SESSION_ERROR", message: "Internal server error" },
            };
        }
    }
    async getClassSessions(establishmentId, filters = {}) {
        try {
            const { sessions, total } = await this.classesRepository.getClassSessions(establishmentId, filters);
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: sessions,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                },
            };
        }
        catch (error) {
            this.logger.error("Failed to get class sessions", {
                error,
                establishmentId,
            });
            return {
                success: false,
                data: [],
                pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
                error: { code: "GET_SESSIONS_ERROR", message: "Internal server error" },
            };
        }
    }
    async getUpcomingSessions(establishmentId, daysAhead = 7) {
        try {
            const sessions = await this.classesRepository.getUpcomingSessions(establishmentId, daysAhead);
            return {
                success: true,
                data: sessions,
                message: `Retrieved ${sessions.length} upcoming sessions`,
            };
        }
        catch (error) {
            this.logger.error("Failed to get upcoming sessions", {
                error,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to get upcoming sessions",
                error: { code: "GET_UPCOMING_ERROR", message: "Internal server error" },
            };
        }
    }
    async updateClassSession(establishmentId, sessionId, updates, userId) {
        try {
            this.logger.info("Updating class session", {
                establishmentId,
                sessionId,
                userId,
            });
            const updatedSession = await this.classesRepository.updateClassSession(establishmentId, sessionId, updates);
            if (!updatedSession) {
                return {
                    success: false,
                    message: CLASS_ERRORS.SESSION_NOT_FOUND,
                    error: {
                        code: "SESSION_NOT_FOUND",
                        message: CLASS_ERRORS.SESSION_NOT_FOUND,
                    },
                };
            }
            await this.classesRepository.logActivity(establishmentId, "class", `Session updated for ${updatedSession.sessionDate}`, `Updates: ${Object.keys(updates).join(", ")}`, undefined, sessionId, userId, "medium");
            return {
                success: true,
                data: updatedSession,
                message: "Class session updated successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to update class session", {
                error,
                establishmentId,
                sessionId,
            });
            return {
                success: false,
                message: "Failed to update class session",
                error: {
                    code: "UPDATE_SESSION_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async cancelClassSession(establishmentId, sessionId, userId) {
        try {
            this.logger.info("Cancelling class session", {
                establishmentId,
                sessionId,
                userId,
            });
            const session = await this.classesRepository.getClassSession(establishmentId, sessionId);
            if (!session) {
                return {
                    success: false,
                    message: CLASS_ERRORS.SESSION_NOT_FOUND,
                    error: {
                        code: "SESSION_NOT_FOUND",
                        message: CLASS_ERRORS.SESSION_NOT_FOUND,
                    },
                };
            }
            const sessionDate = new Date(session.sessionDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (sessionDate < today) {
                return {
                    success: false,
                    message: CLASS_ERRORS.CANNOT_CANCEL_PAST_SESSION,
                    error: {
                        code: "CANNOT_CANCEL_PAST_SESSION",
                        message: CLASS_ERRORS.CANNOT_CANCEL_PAST_SESSION,
                    },
                };
            }
            const updatedSession = await this.classesRepository.updateClassSession(establishmentId, sessionId, { status: "cancelled" });
            if (!updatedSession) {
                return {
                    success: false,
                    message: "Failed to cancel session",
                    error: {
                        code: "CANCEL_SESSION_ERROR",
                        message: "Failed to cancel session",
                    },
                };
            }
            await this.classesRepository.logActivity(establishmentId, "class", `Session cancelled for ${session.sessionDate}`, "Session has been cancelled", undefined, sessionId, userId, "high");
            return {
                success: true,
                message: "Class session cancelled successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to cancel class session", {
                error,
                establishmentId,
                sessionId,
            });
            return {
                success: false,
                message: "Failed to cancel class session",
                error: {
                    code: "CANCEL_SESSION_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async enrollStudents(establishmentId, sessionId, request, userId) {
        try {
            this.logger.info("Enrolling students in session", {
                establishmentId,
                sessionId,
                studentIds: request.studentIds,
                userId,
            });
            const session = await this.classesRepository.getClassSession(establishmentId, sessionId);
            if (!session) {
                return {
                    success: false,
                    enrollments: [],
                    message: CLASS_ERRORS.SESSION_NOT_FOUND,
                };
            }
            const enrollments = [];
            let successCount = 0;
            for (const studentId of request.studentIds) {
                try {
                    const isEnrolled = await this.classesRepository.isStudentEnrolled(establishmentId, sessionId, studentId);
                    if (isEnrolled) {
                        enrollments.push({
                            studentId,
                            studentName: "Unknown",
                            enrolled: false,
                            waitlisted: false,
                            error: CLASS_ERRORS.DUPLICATE_ENROLLMENT,
                        });
                        continue;
                    }
                    const validation = await this.validateStudentEnrollment(establishmentId, sessionId, studentId, request.usePackageCredits);
                    if (!validation.canEnroll) {
                        enrollments.push({
                            studentId,
                            studentName: "Unknown",
                            enrolled: false,
                            waitlisted: false,
                            error: validation.reason || "Cannot enroll student",
                        });
                        continue;
                    }
                    const availableSpots = session.capacity - session.enrollmentCount;
                    const isWaitlist = availableSpots <= 0;
                    const enrollment = await this.classesRepository.enrollStudent(establishmentId, sessionId, studentId, isWaitlist);
                    let packageDeducted = false;
                    if (request.usePackageCredits &&
                        validation.hasValidPackage &&
                        !isWaitlist) {
                        const studentPackage = await this.classesRepository.getActiveStudentPackage(establishmentId, studentId);
                        if (studentPackage) {
                            packageDeducted =
                                await this.classesRepository.deductPackageCredit(establishmentId, studentPackage.id);
                            if (packageDeducted) {
                                await this.classesRepository.logActivity(establishmentId, "class", `Package credit deducted`, `Session: ${session.sessionDate}`, studentId, sessionId, userId, "low");
                            }
                        }
                    }
                    enrollments.push({
                        studentId,
                        studentName: enrollment.studentName,
                        enrolled: !isWaitlist,
                        waitlisted: isWaitlist,
                        packageDeducted,
                    });
                    if (!isWaitlist) {
                        successCount++;
                    }
                    await this.classesRepository.logActivity(establishmentId, "class", `Student enrolled in session`, `${isWaitlist ? "Added to waitlist" : "Enrolled"} for ${session.sessionDate}`, studentId, sessionId, userId, "medium");
                }
                catch (error) {
                    this.logger.error("Failed to enroll individual student", {
                        error,
                        studentId,
                        sessionId,
                    });
                    enrollments.push({
                        studentId,
                        studentName: "Unknown",
                        enrolled: false,
                        waitlisted: false,
                        error: "Failed to enroll student",
                    });
                }
            }
            return {
                success: successCount > 0,
                enrollments,
                message: `Successfully enrolled ${successCount} out of ${request.studentIds.length} students`,
            };
        }
        catch (error) {
            this.logger.error("Failed to enroll students", {
                error,
                establishmentId,
                sessionId,
            });
            return {
                success: false,
                enrollments: [],
                message: "Failed to enroll students",
            };
        }
    }
    async removeStudentFromSession(establishmentId, sessionId, studentId, userId) {
        try {
            this.logger.info("Removing student from session", {
                establishmentId,
                sessionId,
                studentId,
                userId,
            });
            const removed = await this.classesRepository.removeStudentFromSession(establishmentId, sessionId, studentId);
            if (!removed) {
                return {
                    success: false,
                    message: CLASS_ERRORS.ENROLLMENT_NOT_FOUND,
                    error: {
                        code: "ENROLLMENT_NOT_FOUND",
                        message: CLASS_ERRORS.ENROLLMENT_NOT_FOUND,
                    },
                };
            }
            await this.classesRepository.logActivity(establishmentId, "class", `Student removed from session`, `Removed from session on ${new Date().toISOString().split("T")[0]}`, studentId, sessionId, userId, "medium");
            return {
                success: true,
                message: "Student removed from session successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to remove student from session", {
                error,
                establishmentId,
                sessionId,
                studentId,
            });
            return {
                success: false,
                message: "Failed to remove student from session",
                error: {
                    code: "REMOVE_STUDENT_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async getSessionEnrollments(establishmentId, sessionId) {
        try {
            const enrollments = await this.classesRepository.getSessionEnrollments(establishmentId, sessionId);
            return {
                success: true,
                data: enrollments,
                message: `Retrieved ${enrollments.length} enrollments`,
            };
        }
        catch (error) {
            this.logger.error("Failed to get session enrollments", {
                error,
                establishmentId,
                sessionId,
            });
            return {
                success: false,
                message: "Failed to get session enrollments",
                error: {
                    code: "GET_ENROLLMENTS_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async getStudentEnrolledSessions(establishmentId, studentId, includeCompleted = false) {
        try {
            const sessions = await this.classesRepository.getStudentEnrolledSessions(establishmentId, studentId, includeCompleted);
            return {
                success: true,
                data: sessions,
                message: `Retrieved ${sessions.length} enrolled sessions`,
            };
        }
        catch (error) {
            this.logger.error("Failed to get student enrolled sessions", {
                error,
                establishmentId,
                studentId,
            });
            return {
                success: false,
                message: "Failed to get student enrolled sessions",
                error: {
                    code: "GET_STUDENT_SESSIONS_ERROR",
                    message: "Internal server error",
                },
            };
        }
    }
    async getClassStats(establishmentId) {
        try {
            const stats = await this.classesRepository.getClassStats(establishmentId);
            return {
                success: true,
                data: stats,
                message: "Class statistics retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Failed to get class statistics", {
                error,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to get class statistics",
                error: { code: "GET_STATS_ERROR", message: "Internal server error" },
            };
        }
    }
    async getCalendarEvents(establishmentId, startDate, endDate) {
        try {
            if (new Date(startDate) > new Date(endDate)) {
                return {
                    success: false,
                    message: CLASS_ERRORS.INVALID_DATE_RANGE,
                    error: {
                        code: "INVALID_DATE_RANGE",
                        message: CLASS_ERRORS.INVALID_DATE_RANGE,
                    },
                };
            }
            const events = await this.classesRepository.getCalendarEvents(establishmentId, startDate, endDate);
            return {
                success: true,
                data: events,
                message: `Retrieved ${events.length} calendar events`,
            };
        }
        catch (error) {
            this.logger.error("Failed to get calendar events", {
                error,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to get calendar events",
                error: { code: "GET_CALENDAR_ERROR", message: "Internal server error" },
            };
        }
    }
    validateTemplateData(template) {
        const errors = [];
        if (!template.title || template.title.trim().length < 3) {
            errors.push("Title must be at least 3 characters long");
        }
        if (template.capacity <= 0) {
            errors.push(CLASS_ERRORS.INVALID_CAPACITY);
        }
        if (template.durationMinutes < 15 || template.durationMinutes > 180) {
            errors.push(CLASS_ERRORS.INVALID_DURATION);
        }
        if (template.price < 0) {
            errors.push(CLASS_ERRORS.INVALID_PRICE);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings: [],
        };
    }
    validateTemplateUpdates(updates) {
        const errors = [];
        if (updates.title !== undefined &&
            (!updates.title || updates.title.trim().length < 3)) {
            errors.push("Title must be at least 3 characters long");
        }
        if (updates.capacity !== undefined && updates.capacity <= 0) {
            errors.push(CLASS_ERRORS.INVALID_CAPACITY);
        }
        if (updates.durationMinutes !== undefined &&
            (updates.durationMinutes < 15 || updates.durationMinutes > 180)) {
            errors.push(CLASS_ERRORS.INVALID_DURATION);
        }
        if (updates.price !== undefined && updates.price < 0) {
            errors.push(CLASS_ERRORS.INVALID_PRICE);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings: [],
        };
    }
    async validateSessionData(establishmentId, session) {
        const errors = [];
        const warnings = [];
        const sessionDate = new Date(session.sessionDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (sessionDate < today) {
            errors.push(CLASS_ERRORS.SESSION_IN_PAST);
        }
        if (session.capacity !== undefined && session.capacity <= 0) {
            errors.push(CLASS_ERRORS.INVALID_CAPACITY);
        }
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(session.startTime)) {
            errors.push("Invalid start time format (HH:MM)");
        }
        if (session.endTime && !timeRegex.test(session.endTime)) {
            errors.push("Invalid end time format (HH:MM)");
        }
        if (session.endTime) {
            const startTime = new Date(`2000-01-01T${session.startTime}`);
            const endTime = new Date(`2000-01-01T${session.endTime}`);
            if (endTime <= startTime) {
                errors.push("End time must be after start time");
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    async validateStudentEnrollment(establishmentId, sessionId, studentId, usePackageCredits) {
        let requiresPackage = usePackageCredits || false;
        let hasValidPackage = false;
        let packageCreditsRemaining = 0;
        if (requiresPackage) {
            const studentPackage = await this.classesRepository.getActiveStudentPackage(establishmentId, studentId);
            if (studentPackage) {
                hasValidPackage = true;
                packageCreditsRemaining = studentPackage.remainingClasses || 0;
                if (studentPackage.packageType !== "monthly_unlimited" &&
                    (studentPackage.remainingClasses || 0) <= 0) {
                    return {
                        canEnroll: false,
                        reason: CLASS_ERRORS.INSUFFICIENT_PACKAGE_CREDITS,
                        requiresPackage: true,
                        hasValidPackage: false,
                        packageCreditsRemaining: 0,
                    };
                }
                if (studentPackage.endDate) {
                    const expiryDate = new Date(studentPackage.endDate);
                    const today = new Date();
                    if (expiryDate < today) {
                        return {
                            canEnroll: false,
                            reason: CLASS_ERRORS.PACKAGE_EXPIRED,
                            requiresPackage: true,
                            hasValidPackage: false,
                            packageCreditsRemaining,
                        };
                    }
                }
            }
            else {
                return {
                    canEnroll: false,
                    reason: CLASS_ERRORS.INSUFFICIENT_PACKAGE_CREDITS,
                    requiresPackage: true,
                    hasValidPackage: false,
                    packageCreditsRemaining: 0,
                };
            }
        }
        return {
            canEnroll: true,
            requiresPackage,
            hasValidPackage,
            packageCreditsRemaining,
        };
    }
}
