// Dashboard module exports
export { DashboardRepository } from './dashboard.repository.js';
export { DashboardService } from './dashboard.service.js';
export { DashboardController } from './dashboard.controller.js';
export { default as createDashboardRoutes } from './dashboard.routes.js';

// Type exports
export type {
  DashboardStats,
  ClassScheduleItem,
  RecentActivity,
  WeeklySummaryData,
  ActivityFilters,
} from './dashboard.types.js';