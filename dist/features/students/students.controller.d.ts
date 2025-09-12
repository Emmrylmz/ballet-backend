import { Request, Response } from "express";
import { StudentsService } from "./students.service.js";
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
export declare class StudentsController {
    private studentsService;
    private logger;
    constructor(studentsService: StudentsService, logger: LoggerService);
    searchStudents: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStudentProfile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    createStudent: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    updateStudent: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getSessionRoster: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStudentsStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    deactivateStudent: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    private getClientIp;
}
export {};
