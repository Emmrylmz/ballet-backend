import { DatabaseService } from "../../services/DatabaseService.js";
import { InstructorDashboardStats, InstructorClassScheduleItem, InstructorRecentActivity, InstructorWeeklySummaryData, InstructorActivityFilters } from "./instructorDashboard.types.js";
export declare class InstructorDashboardRepository {
    private db;
    constructor(db: DatabaseService);
    private verifyInstructorAccess;
    getStatsForEstablishment(establishmentId: string, userId: string): Promise<InstructorDashboardStats>;
    private getDefaultStats;
    getRecentActivitiesForEstablishment(establishmentId: string, userId: string, filters?: InstructorActivityFilters): Promise<InstructorRecentActivity[]>;
    getWeeklySummaryForEstablishment(establishmentId: string, userId: string): Promise<InstructorWeeklySummaryData>;
    getTodaysClassesForEstablishment(establishmentId: string, userId: string): Promise<InstructorClassScheduleItem[]>;
    getStats(): Promise<InstructorDashboardStats>;
    getRecentActivities(filters?: InstructorActivityFilters): Promise<InstructorRecentActivity[]>;
    getWeeklySummary(): Promise<InstructorWeeklySummaryData>;
    getTodaysClasses(): Promise<InstructorClassScheduleItem[]>;
}
