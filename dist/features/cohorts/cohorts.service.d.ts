import { CohortsRepository } from "./cohorts.repository.js";
import { LoggerService } from "../../services/LoggerService.js";
import { Cohort, CohortStats, CreateCohortRequest, CohortFilters, CohortResponse, PaginatedCohortResponse, GenerateSessionsForCohortRequest, CohortSessionGeneration } from "./cohorts.types.js";
import { DatabaseService } from "../../services/DatabaseService.js";
export declare class CohortsService {
    private cohortsRepository;
    private db;
    private logger;
    constructor(cohortsRepository: CohortsRepository, db: DatabaseService, logger: LoggerService);
    createCohort(establishmentId: string, cohort: CreateCohortRequest, userId: string): Promise<CohortResponse<Cohort>>;
    generateCohortSessions(establishmentId: string, cohortId: string, options: GenerateSessionsForCohortRequest | undefined, userId: string): Promise<CohortResponse<CohortSessionGeneration>>;
    bulkEnrollStudents(establishmentId: string, cohortId: string, studentIds: string[], paymentType: string, userId: string): Promise<CohortResponse<{
        enrolled: number;
        failed: string[];
    }>>;
    handleStudentDeparture(establishmentId: string, cohortId: string, studentId: string, options: {
        removeFromFutureSessions?: boolean;
        effectiveDate?: string;
        notes?: string;
    } | undefined, userId: string): Promise<CohortResponse<boolean>>;
    cloneCohort(establishmentId: string, cohortId: string, newTermDates: {
        startDate: string;
        endDate: string;
    }, userId: string): Promise<CohortResponse<Cohort>>;
    private validateTermDates;
    private validateSchedule;
    private checkInstructorAvailability;
    private calculateSessionDates;
    private isDateInHolidayBreak;
    private calculateEndTime;
    private enrollInFutureSessions;
    private removeFromFutureSessions;
    getCohort(establishmentId: string, cohortId: string): Promise<CohortResponse<Cohort>>;
    getCohorts(establishmentId: string, filters: CohortFilters): Promise<PaginatedCohortResponse<Cohort>>;
    getCohortStats(establishmentId: string, cohortId?: string): Promise<CohortResponse<CohortStats[]>>;
}
