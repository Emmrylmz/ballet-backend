import { DatabaseService } from "../../services/DatabaseService.js";
import { InvitationType, InvitationFilters, InvitationSettings, InvitationValidationResult, InvitationUsage } from "./invitation.types.js";
export declare class InvitationRepository {
    db: DatabaseService;
    private tableExistsCache;
    constructor(db: DatabaseService);
    tableExists(tableName: string): Promise<boolean>;
    createInvitation(invitation: {
        establishmentId: string;
        createdBy: string;
        type: InvitationType;
        token: string;
        usageLimit: number;
        sessionId?: string;
        cohortId?: string;
        message?: string;
        expiresAt: Date;
    }): Promise<string>;
    findByToken(token: string): Promise<InvitationValidationResult>;
    acceptInvitation(invitationId: string, userId: string, userEmail: string, ipAddress?: string, userAgent?: string): Promise<void>;
    userExistsInEstablishment(userId: string, establishmentId: string): Promise<boolean>;
    getInvitationById(invitationId: string): Promise<{
        type: InvitationType;
        establishmentId: string;
    } | null>;
    getInvitations(filters: InvitationFilters): Promise<any>;
    revokeInvitation(invitationId: string, revokedBy: string): Promise<void>;
    canUserInvite(userId: string, establishmentId: string, invitationType: InvitationType): Promise<boolean>;
    getInvitationSettings(establishmentId: string): Promise<InvitationSettings>;
    updateInvitationSettings(establishmentId: string, settings: Partial<InvitationSettings>): Promise<void>;
    getInvitationStats(establishmentId: string): Promise<any>;
    getInvitationUsage(invitationId: string): Promise<InvitationUsage[]>;
    hasActiveInstructorInvitation(email: string, establishmentId: string): Promise<boolean>;
    cleanupExpiredInstructorInvitations(): Promise<number>;
    createInstructorInvitation(details: {
        invitationId: string;
        email: string;
        phoneNumber: string;
        establishmentId: string;
        invitedBy: string;
        message?: string;
        expiresAt: Date;
    }): Promise<void>;
    updateInstructorInvitationStatus(invitationId: string, status: "accepted" | "expired" | "revoked"): Promise<void>;
    private updateInvitationStatus;
    private logInvitationActivity;
    private mapRowToInvitation;
}
