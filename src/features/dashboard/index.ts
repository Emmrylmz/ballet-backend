// Dashboard module exports
export { InstructorDashboardRepository } from './instructorDashboard.repository.js';
export { InstructorDashboardService } from './instructorDashboard.service.js';
export { InstructorDashboardController } from './instructorDashboard.controller.js';
export { default as createInstructorDashboardRoutes } from './instructorDashboard.routes.js';
export { DashboardFactory } from './dashboard.factory.js';

// Type exports
export type {
  DashboardStats,
  InstructorActivity,
  WeeklySummary,
  ActivityFilters,
} from './instructorDashboard.types.js';