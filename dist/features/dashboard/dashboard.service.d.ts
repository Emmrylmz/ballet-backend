import { LoggerService } from '../../services/LoggerService.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardStats, ClassScheduleItem, RecentActivity, WeeklySummaryData, ActivityFilters } from './dashboard.types.js';
export declare class DashboardService {
    private repository;
    private logger;
    constructor(repository: DashboardRepository, logger: LoggerService);
    getStatsForEstablishment(establishmentId: string, userId?: string): Promise<DashboardStats>;
    getRecentActivitiesForEstablishment(establishmentId: string, filters?: ActivityFilters, userId?: string): Promise<RecentActivity[]>;
    getWeeklySummaryForEstablishment(establishmentId: string, userId?: string): Promise<WeeklySummaryData>;
    getTodaysClassesForEstablishment(establishmentId: string, userId?: string): Promise<ClassScheduleItem[]>;
    getDashboardDataForEstablishment(establishmentId: string, userId?: string): Promise<{
        stats: DashboardStats | null;
        activities: RecentActivity[];
        weeklySummary: WeeklySummaryData | null;
        todaysClasses: ClassScheduleItem[];
        errors: any[];
    }>;
    private validateActivityFilters;
    private isValidDate;
}
