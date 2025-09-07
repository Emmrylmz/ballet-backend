import { Request, Response } from "express";
import { CohortsService } from "./cohorts.service.js";
import { LoggerService } from "../../services/LoggerService.js";
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
    establishment?: {
        id: string;
        name: string;
    };
}
export declare class CohortsController {
    private cohortsService;
    private logger;
    private db;
    constructor(cohortsService: CohortsService, logger: LoggerService, db?: any);
    private getEstablishmentId;
    private getClientIp;
    getCohorts: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    createCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    updateCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    deleteCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getCohortStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getCohortMembers: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    addStudentToCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    bulkEnrollStudents: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    removeStudentFromCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    generateSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getCohortSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    cloneCohort: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    checkAvailability: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getUpcomingSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStudentCohorts: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}
export {};
