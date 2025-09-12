export class StudentsService {
    studentsRepository;
    logger;
    constructor(studentsRepository, logger) {
        this.studentsRepository = studentsRepository;
        this.logger = logger;
    }
    async searchStudents(establishmentId, filters) {
        try {
            this.logger.info("Searching students", {
                establishmentId,
                filters: { ...filters, q: filters.q ? `"${filters.q}"` : undefined },
            });
            const { students, total } = await this.studentsRepository.searchStudents(establishmentId, filters);
            const limit = filters.limit || 20;
            const page = Math.floor((filters.offset || 0) / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: students,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                },
                message: `Found ${total} student${total !== 1 ? "s" : ""}`,
            };
        }
        catch (error) {
            this.logger.error("Error searching students", {
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
                    limit: filters.limit || 20,
                    totalPages: 0,
                },
                message: "Failed to search students",
                error: {
                    code: "SEARCH_ERROR",
                    message: "Failed to search students",
                },
            };
        }
    }
    async getStudentProfile(establishmentId, studentId) {
        try {
            this.logger.info("Getting student profile", {
                establishmentId,
                studentId,
            });
            const student = await this.studentsRepository.getStudentProfile(establishmentId, studentId);
            if (!student) {
                return {
                    success: false,
                    message: "Student not found",
                    error: {
                        code: "STUDENT_NOT_FOUND",
                        message: "Student not found",
                    },
                };
            }
            return {
                success: true,
                data: student,
                message: "Student profile retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Error getting student profile", {
                error,
                establishmentId,
                studentId,
            });
            return {
                success: false,
                message: "Failed to get student profile",
                error: {
                    code: "GET_STUDENT_ERROR",
                    message: "Failed to get student profile",
                },
            };
        }
    }
    async createStudent(establishmentId, studentData, userId) {
        try {
            this.logger.info("Creating new student", {
                establishmentId,
                studentName: studentData.name,
                userId,
            });
            if (!studentData.name ||
                !studentData.phone ||
                !studentData.emergencyContact) {
                return {
                    success: false,
                    message: "Missing required fields: name, phone, and emergency contact are required",
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Missing required fields",
                    },
                };
            }
            const student = await this.studentsRepository.createStudent(establishmentId, studentData, userId);
            this.logger.info("Student created successfully", {
                studentId: student.id,
                studentName: student.name,
            });
            return {
                success: true,
                data: student,
                message: "Student created successfully",
            };
        }
        catch (error) {
            this.logger.error("Error creating student", {
                error,
                establishmentId,
                studentData,
            });
            return {
                success: false,
                message: "Failed to create student",
                error: {
                    code: "CREATE_STUDENT_ERROR",
                    message: "Failed to create student",
                },
            };
        }
    }
    async updateStudent(establishmentId, studentId, updates) {
        try {
            this.logger.info("Updating student", {
                establishmentId,
                studentId,
                updates: Object.keys(updates),
            });
            const updatedStudent = await this.studentsRepository.updateStudent(establishmentId, studentId, updates);
            if (!updatedStudent) {
                return {
                    success: false,
                    message: "Student not found",
                    error: {
                        code: "STUDENT_NOT_FOUND",
                        message: "Student not found",
                    },
                };
            }
            return {
                success: true,
                data: updatedStudent,
                message: "Student updated successfully",
            };
        }
        catch (error) {
            this.logger.error("Error updating student", {
                error,
                establishmentId,
                studentId,
                updates,
            });
            return {
                success: false,
                message: "Failed to update student",
                error: {
                    code: "UPDATE_STUDENT_ERROR",
                    message: "Failed to update student",
                },
            };
        }
    }
    async getSessionRoster(establishmentId, sessionId) {
        try {
            this.logger.info("Getting session roster", {
                establishmentId,
                sessionId,
            });
            const roster = await this.studentsRepository.getSessionRoster(establishmentId, sessionId);
            return {
                success: true,
                data: roster,
                message: `Retrieved roster with ${roster.length} student${roster.length !== 1 ? "s" : ""}`,
            };
        }
        catch (error) {
            this.logger.error("Error getting session roster", {
                error,
                establishmentId,
                sessionId,
            });
            return {
                success: false,
                message: "Failed to get session roster",
                error: {
                    code: "GET_ROSTER_ERROR",
                    message: "Failed to get session roster",
                },
            };
        }
    }
    async getStudent(establishmentId, studentId) {
        try {
            this.logger.info("Getting student", {
                establishmentId,
                studentId,
            });
            const student = await this.studentsRepository.getStudentById(establishmentId, studentId);
            if (!student) {
                return {
                    success: false,
                    message: "Student not found",
                    error: {
                        code: "STUDENT_NOT_FOUND",
                        message: "Student not found",
                    },
                };
            }
            return {
                success: true,
                data: student,
                message: "Student retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Error getting student", {
                error,
                establishmentId,
                studentId,
            });
            return {
                success: false,
                message: "Failed to get student",
                error: {
                    code: "GET_STUDENT_ERROR",
                    message: "Failed to get student",
                },
            };
        }
    }
    async getStudentsStats(establishmentId) {
        try {
            this.logger.info("Getting students statistics", {
                establishmentId,
            });
            const stats = await this.studentsRepository.getStudentsStats(establishmentId);
            return {
                success: true,
                data: stats,
                message: "Statistics retrieved successfully",
            };
        }
        catch (error) {
            this.logger.error("Error getting students statistics", {
                error,
                establishmentId,
            });
            return {
                success: false,
                message: "Failed to get statistics",
                error: {
                    code: "GET_STATS_ERROR",
                    message: "Failed to get statistics",
                },
            };
        }
    }
    async deactivateStudent(establishmentId, studentId) {
        return this.updateStudent(establishmentId, studentId, { isActive: false });
    }
    async reactivateStudent(establishmentId, studentId) {
        return this.updateStudent(establishmentId, studentId, { isActive: true });
    }
}
