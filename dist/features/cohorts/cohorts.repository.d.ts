import { DatabaseService } from "../../services/DatabaseService.js";
import { Cohort, CohortMembership, CohortStats, CreateCohortRequest, UpdateCohortRequest, AddStudentToCohortRequest, RemoveStudentFromCohortRequest, CohortFilters, CohortMembershipFilters, CohortEnrollmentSummary } from "./cohorts.types.js";
export declare class CohortsRepository {
    private db;
    constructor(db: DatabaseService);
    createCohort(establishmentId: string, cohort: CreateCohortRequest): Promise<Cohort>;
    getCohort(establishmentId: string, cohortId: string): Promise<Cohort | null>;
    getCohorts(establishmentId: string, filters?: CohortFilters): Promise<{
        cohorts: Cohort[];
        total: number;
    }>;
    updateCohort(establishmentId: string, cohortId: string, updates: UpdateCohortRequest): Promise<Cohort | null>;
    deleteCohort(establishmentId: string, cohortId: string): Promise<boolean>;
    addStudentToCohort(establishmentId: string, cohortId: string, request: AddStudentToCohortRequest): Promise<CohortMembership>;
    removeStudentFromCohort(establishmentId: string, cohortId: string, studentId: string, request?: RemoveStudentFromCohortRequest): Promise<CohortMembership | null>;
    getCohortMemberships(establishmentId: string, filters?: CohortMembershipFilters): Promise<{
        memberships: CohortMembership[];
        total: number;
    }>;
    getCohortStats(establishmentId: string, cohortId?: string): Promise<CohortStats[]>;
    getCohortEnrollmentSummary(establishmentId: string, cohortId: string): Promise<CohortEnrollmentSummary | null>;
    isStudentEnrolled(cohortId: string, studentId: string): Promise<boolean>;
    getActiveCohortMembers(cohortId: string, beforeDate?: string): Promise<string[]>;
    private mapCohortRow;
    private mapCohortRowWithDetails;
    private mapMembershipRow;
    private mapMembershipRowWithDetails;
}
