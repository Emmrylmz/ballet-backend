import { DatabaseService } from '../../services/DatabaseService.js';
import { DashboardStats, ClassScheduleItem, RecentActivity, WeeklySummaryData, ActivityFilters } from './dashboard.types.js';
export declare class DashboardRepository {
    private db;
    constructor(db: DatabaseService);
    getStatsForEstablishment(establishmentId: string): Promise<DashboardStats>;
    private getDefaultStats;
    getStats(): Promise<DashboardStats>;
    getRecentActivities(filters?: ActivityFilters): Promise<RecentActivity[]>;
    getWeeklySummary(): Promise<WeeklySummaryData>;
    getTodaysClasses(): Promise<ClassScheduleItem[]>;
    getRecentActivitiesForEstablishment(establishmentId: string, filters?: ActivityFilters): Promise<RecentActivity[]>;
    getWeeklySummaryForEstablishment(establishmentId: string): Promise<WeeklySummaryData>;
    getTodaysClassesForEstablishment(establishmentId: string): Promise<ClassScheduleItem[]>;
}
