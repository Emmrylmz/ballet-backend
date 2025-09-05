import { Router } from 'express';
import { DatabaseService } from '../../services/DatabaseService.js';
import { LoggerService } from '../../services/LoggerService.js';
declare const createDashboardRoutes: (db: DatabaseService, logger: LoggerService) => Router;
export default createDashboardRoutes;
