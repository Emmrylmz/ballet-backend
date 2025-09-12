import { Router } from "express";
import Joi from "joi";
import { CohortsController } from "./cohorts.controller.js";
import { CohortsService } from "./cohorts.service.js";
import { CohortsRepository } from "./cohorts.repository.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
const createCohortSchema = Joi.object({
    templateId: Joi.string().uuid().required(),
    instructorId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    ageMin: Joi.number().integer().min(0).max(100).optional(),
    ageMax: Joi.number().integer().min(0).max(100).optional(),
    maxStudents: Joi.number().integer().min(1).max(50).required(),
    scheduleDays: Joi.array()
        .items(Joi.number().integer().min(0).max(6))
        .min(1)
        .required(),
    scheduleStartTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required(),
    termStartDate: Joi.string().isoDate().required(),
    termEndDate: Joi.string().isoDate().required(),
    holidayBreaks: Joi.array()
        .items(Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        name: Joi.string().min(1).max(100).required(),
    }))
        .optional(),
    makeupPolicy: Joi.string().max(500).optional(),
}).custom((value, helpers) => {
    if (value.ageMin && value.ageMax && value.ageMin > value.ageMax) {
        return helpers.error("any.invalid", {
            message: "ageMin cannot be greater than ageMax",
        });
    }
    if (new Date(value.termStartDate) >= new Date(value.termEndDate)) {
        return helpers.error("any.invalid", {
            message: "termStartDate must be before termEndDate",
        });
    }
    if (value.holidayBreaks) {
        for (const holiday of value.holidayBreaks) {
            if (new Date(holiday.start) >= new Date(holiday.end)) {
                return helpers.error("any.invalid", {
                    message: `Holiday break "${holiday.name}": start date must be before end date`,
                });
            }
        }
    }
    return value;
});
const updateCohortSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    instructorId: Joi.string().uuid().optional(),
    ageMin: Joi.number().integer().min(0).max(100).optional(),
    ageMax: Joi.number().integer().min(0).max(100).optional(),
    maxStudents: Joi.number().integer().min(1).max(50).optional(),
    scheduleDays: Joi.array()
        .items(Joi.number().integer().min(0).max(6))
        .min(1)
        .optional(),
    scheduleStartTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
    scheduleDurationMinutes: Joi.number().integer().min(15).max(480).optional(),
    termStartDate: Joi.string().isoDate().optional(),
    termEndDate: Joi.string().isoDate().optional(),
    holidayBreaks: Joi.array()
        .items(Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        name: Joi.string().min(1).max(100).required(),
    }))
        .optional(),
    makeupPolicy: Joi.string().max(500).optional(),
    isActive: Joi.boolean().optional(),
}).custom((value, helpers) => {
    if (value.ageMin !== undefined &&
        value.ageMax !== undefined &&
        value.ageMin > value.ageMax) {
        return helpers.error("any.invalid", {
            message: "ageMin cannot be greater than ageMax",
        });
    }
    if (value.termStartDate &&
        value.termEndDate &&
        new Date(value.termStartDate) >= new Date(value.termEndDate)) {
        return helpers.error("any.invalid", {
            message: "termStartDate must be before termEndDate",
        });
    }
    if (value.holidayBreaks) {
        for (const holiday of value.holidayBreaks) {
            if (new Date(holiday.start) >= new Date(holiday.end)) {
                return helpers.error("any.invalid", {
                    message: `Holiday break "${holiday.name}": start date must be before end date`,
                });
            }
        }
    }
    return value;
});
const addStudentToCohortSchema = Joi.object({
    studentId: Joi.string().uuid().required(),
    paymentType: Joi.string().valid("package", "term_fee", "drop_in").required(),
    joinedDate: Joi.string().isoDate().optional(),
    notes: Joi.string().max(500).optional(),
});
const removeStudentFromCohortSchema = Joi.object({
    leftDate: Joi.string().isoDate().optional(),
    notes: Joi.string().max(500).optional(),
});
const bulkEnrollSchema = Joi.object({
    students: Joi.array()
        .items(Joi.object({
        studentId: Joi.string().uuid().required(),
        paymentType: Joi.string()
            .valid("package", "term_fee", "drop_in")
            .required(),
        joinedDate: Joi.string().isoDate().optional(),
        notes: Joi.string().max(500).optional(),
    }))
        .min(1)
        .max(20)
        .required(),
});
const generateSessionsSchema = Joi.object({
    generateFromDate: Joi.string().isoDate().optional(),
    generateToDate: Joi.string().isoDate().optional(),
    includeHolidays: Joi.boolean().optional(),
    skipEnrollment: Joi.boolean().optional(),
});
const cloneCohortSchema = Joi.object({
    newName: Joi.string().min(1).max(255).required(),
    newTermStartDate: Joi.string().isoDate().required(),
    newTermEndDate: Joi.string().isoDate().required(),
    newInstructorId: Joi.string().uuid().optional(),
    copyStudents: Joi.boolean().default(false),
    newHolidayBreaks: Joi.array()
        .items(Joi.object({
        start: Joi.string().isoDate().required(),
        end: Joi.string().isoDate().required(),
        name: Joi.string().min(1).max(100).required(),
    }))
        .optional(),
}).custom((value, helpers) => {
    if (new Date(value.newTermStartDate) >= new Date(value.newTermEndDate)) {
        return helpers.error("any.invalid", {
            message: "newTermStartDate must be before newTermEndDate",
        });
    }
    if (value.newHolidayBreaks) {
        for (const holiday of value.newHolidayBreaks) {
            if (new Date(holiday.start) >= new Date(holiday.end)) {
                return helpers.error("any.invalid", {
                    message: `Holiday break "${holiday.name}": start date must be before end date`,
                });
            }
        }
    }
    return value;
});
const cohortFiltersSchema = Joi.object({
    instructorId: Joi.string().uuid().optional(),
    templateId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
    ageMin: Joi.number().integer().min(0).max(100).optional(),
    ageMax: Joi.number().integer().min(0).max(100).optional(),
    scheduleDays: Joi.alternatives()
        .try(Joi.number().integer().min(0).max(6), Joi.string().pattern(/^[0-6](,[0-6])*$/))
        .optional(),
    termActive: Joi.boolean().optional(),
    hasAvailableSpots: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
});
const membershipFiltersSchema = Joi.object({
    cohortId: Joi.string().uuid().optional(),
    studentId: Joi.string().uuid().optional(),
    paymentType: Joi.string().valid("package", "term_fee", "drop_in").optional(),
    isActive: Joi.boolean().optional(),
    joinedAfter: Joi.string().isoDate().optional(),
    joinedBefore: Joi.string().isoDate().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
});
const uuidParamSchema = Joi.object({
    id: Joi.string().uuid().required(),
});
const cohortAndStudentParamSchema = Joi.object({
    cohortId: Joi.string().uuid().required(),
    studentId: Joi.string().uuid().required(),
});
export function createCohortsRoutes(db, logger, authMiddleware, establishmentMiddleware) {
    const router = Router();
    const cohortsRepository = new CohortsRepository(db);
    const cohortsService = new CohortsService(cohortsRepository, db, logger);
    const cohortsController = new CohortsController(cohortsService, logger, db);
    router.use(authMiddleware.authenticate());
    router.use(establishmentMiddleware.extractEstablishment());
    router.post("/", ValidationMiddleware.validateBody(createCohortSchema), cohortsController.createCohort.bind(cohortsController));
    router.get("/", ValidationMiddleware.validateQuery(cohortFiltersSchema), cohortsController.getCohorts.bind(cohortsController));
    router.get("/stats", ValidationMiddleware.validateQuery(cohortFiltersSchema), cohortsController.getCohortStats.bind(cohortsController));
    router.get("/:id", ValidationMiddleware.validateParams(uuidParamSchema), cohortsController.getCohort.bind(cohortsController));
    router.put("/:id", ValidationMiddleware.validateParams(uuidParamSchema), ValidationMiddleware.validateBody(updateCohortSchema), cohortsController.updateCohort.bind(cohortsController));
    router.delete("/:id", ValidationMiddleware.validateParams(uuidParamSchema), cohortsController.deleteCohort.bind(cohortsController));
    router.post("/:cohortId/students", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), ValidationMiddleware.validateBody(addStudentToCohortSchema), cohortsController.addStudentToCohort.bind(cohortsController));
    router.post("/:cohortId/students/bulk", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), ValidationMiddleware.validateBody(bulkEnrollSchema), cohortsController.bulkEnrollStudents.bind(cohortsController));
    router.delete("/:cohortId/students/:studentId", ValidationMiddleware.validateParams(cohortAndStudentParamSchema), ValidationMiddleware.validateBody(removeStudentFromCohortSchema), cohortsController.removeStudentFromCohort.bind(cohortsController));
    router.get("/:cohortId/students", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), ValidationMiddleware.validateQuery(membershipFiltersSchema), cohortsController.getCohortMembers.bind(cohortsController));
    router.post("/:cohortId/sessions/generate", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), ValidationMiddleware.validateBody(generateSessionsSchema), cohortsController.generateSessions.bind(cohortsController));
    router.get("/:cohortId/sessions", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), ValidationMiddleware.validateQuery(Joi.object({
        startDate: Joi.string().isoDate().optional(),
        endDate: Joi.string().isoDate().optional(),
        includeEnrollments: Joi.boolean().optional(),
        limit: Joi.number().integer().min(1).max(100).default(50),
        offset: Joi.number().integer().min(0).default(0),
    })), cohortsController.getCohortSessions.bind(cohortsController));
    router.get("/:cohortId/availability", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), cohortsController.checkAvailability.bind(cohortsController));
    router.get("/:cohortId/next-session", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), cohortsController.getUpcomingSession.bind(cohortsController));
    router.post("/:cohortId/clone", ValidationMiddleware.validateParams(Joi.object({ cohortId: Joi.string().uuid().required() })), ValidationMiddleware.validateBody(cloneCohortSchema), cohortsController.cloneCohort.bind(cohortsController));
    router.get("/students/:studentId/cohorts", ValidationMiddleware.validateParams(Joi.object({ studentId: Joi.string().uuid().required() })), ValidationMiddleware.validateQuery(Joi.object({
        isActive: Joi.boolean().optional(),
        includeStats: Joi.boolean().optional(),
    })), cohortsController.getStudentCohorts.bind(cohortsController));
    return router;
}
export { createCohortsRoutes as cohortsRoutes };
