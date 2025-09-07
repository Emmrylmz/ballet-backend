import { Request, Response } from "express";
import { ClassesService } from "./classes.service.js";
import { LoggerService } from "../../services/LoggerService.js";
interface Establishment {
    id: string;
    name: string;
    role: string;
}
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        establishments?: Establishment[];
    };
    establishment?: {
        id: string;
        name: string;
        userRole: string;
    };
}
export declare class ClassesController {
    private classesService;
    private logger;
    constructor(classesService: ClassesService, logger: LoggerService);
    private getClientIp;
    createTemplate: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getTemplate: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getTemplates: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    updateTemplate: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    deleteTemplate: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    generateSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    createSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getUpcomingSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    updateSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    cancelSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    enrollStudents: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    removeStudent: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getSessionEnrollments: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStudentEnrolledSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getCalendarEvents: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}
export {};
