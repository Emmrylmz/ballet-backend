import { LoggerService } from '../../services/LoggerService.js';
import { InstructorDashboardRepository } from './instructorDashboard.repository.js';
import { InstructorDashboardStats, InstructorClassScheduleItem, InstructorRecentActivity, InstructorWeeklySummaryData, InstructorActivityFilters } from './instructorDashboard.types.js';
export declare class InstructorDashboardService {
    private repository;
    private logger;
    constructor(repository: InstructorDashboardRepository, logger: LoggerService);
    getStatsForEstablishment(establishmentId: string, userId: string): Promise<InstructorDashboardStats>;
    getRecentActivitiesForEstablishment(establishmentId: string, filters: InstructorActivityFilters | undefined, userId: string): Promise<InstructorRecentActivity[]>;
    getWeeklySummaryForEstablishment(establishmentId: string, userId: string): Promise<InstructorWeeklySummaryData>;
    getTodaysClassesForEstablishment(establishmentId: string, userId: string): Promise<InstructorClassScheduleItem[]>;
    getDashboardDataForEstablishment(establishmentId: string, userId: string): Promise<{
        stats: InstructorDashboardStats | null;
        activities: InstructorRecentActivity[];
        weeklySummary: InstructorWeeklySummaryData | null;
        todaysClasses: InstructorClassScheduleItem[];
        errors: any[];
    }>;
    private validateActivityFilters;
    private isValidDate;
}
