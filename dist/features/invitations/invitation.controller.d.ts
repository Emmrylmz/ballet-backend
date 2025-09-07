import { Request, Response, NextFunction } from "express";
import { InvitationService } from "./invitation.service.js";
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
export declare class InvitationController {
    private invitationService;
    private logger;
    constructor(invitationService: InvitationService, logger: LoggerService);
    private getClientIp;
    createStudentInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    inviteInstructor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getInvitationUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    revokeInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    validateInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    acceptInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getInvitationSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    updateInvitationSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    getInvitationStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
