import { LoggerService } from "../../services/LoggerService.js";
import { InvitationRepository } from "./invitation.repository.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { CreateInvitationRequest, InvitationResponse, InvitationValidationResult, InvitationFilters, InvitationSettings, CreateInstructorInvitationRequest } from "./invitation.types.js";
export declare class InvitationService {
    private invitationRepository;
    private authRepository;
    private logger;
    constructor(invitationRepository: InvitationRepository, authRepository: AuthRepository, logger: LoggerService);
    createInstructorInvitation(request: CreateInstructorInvitationRequest, createdBy: string): Promise<InvitationResponse>;
    createInvitation(request: CreateInvitationRequest, createdBy: string): Promise<InvitationResponse>;
    validateInvitation(token: string, userId?: string): Promise<InvitationValidationResult>;
    acceptInvitation(token: string, userId: string, ipAddress?: string, userAgent?: string): Promise<{
        message: string;
        warning?: string;
    }>;
    getInvitations(filters: InvitationFilters): Promise<any>;
    revokeInvitation(invitationId: string, revokedBy: string, establishmentId: string, userRole: string): Promise<void>;
    getInvitationSettings(establishmentId: string): Promise<InvitationSettings>;
    updateInvitationSettings(establishmentId: string, settings: Partial<InvitationSettings>, updatedBy: string): Promise<void>;
    getInvitationStats(establishmentId: string): Promise<any>;
    getInvitationUsage(invitationId: string): Promise<import("./invitation.types.js").InvitationUsage[]>;
    private generateInvitationToken;
    private calculateExpiryHours;
    private generateInvitationUrl;
    private addUserToEstablishment;
    private enrollStudentInSession;
}
