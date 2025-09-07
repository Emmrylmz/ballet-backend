export type InvitationType = 'instructor' | 'student';
export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'used_up';
export interface CreateInvitationRequest {
    type: InvitationType;
    establishmentId: string;
    sessionId?: string;
    message?: string;
    expiryHours?: number;
    usageLimit?: number;
}
export interface Invitation {
    id: string;
    establishmentId: string;
    createdBy: string;
    createdByName: string;
    type: InvitationType;
    status: InvitationStatus;
    token: string;
    sessionId?: string;
    message?: string;
    usageLimit: number;
    usageCount: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    instructorEmail?: string;
    instructorPhone?: string;
}
export interface InvitationResponse {
    id: string;
    type: InvitationType;
    status: InvitationStatus;
    createdBy: string;
    createdByName: string;
    sessionId?: string;
    sessionName?: string;
    message?: string;
    usageLimit: number;
    usageCount: number;
    expiresAt: string;
    createdAt: string;
    invitationUrl: string;
}
export interface AcceptInvitationRequest {
    token: string;
}
export interface InvitationValidationResult {
    isValid: boolean;
    invitation?: Invitation;
    establishmentName?: string;
    sessionName?: string;
    error?: string;
    warningMessage?: string;
}
export interface InvitationFilters {
    type?: InvitationType;
    status?: InvitationStatus;
    establishmentId?: string;
    limit?: number;
    offset?: number;
}
export interface InvitationSettings {
    studentInvitationMaxHours: number;
    instructorInvitationEnabled: boolean;
    studentInvitationEnabled: boolean;
    requireApprovalForInstructors: boolean;
    defaultExpiryHours: number;
    studentInvitationDefaultUsageLimit: number;
}
export interface CreateInstructorInvitationRequest {
    email: string;
    phoneNumber: string;
    establishmentId: string;
    message?: string;
    expiryHours?: number;
}
export interface InstructorInvitation {
    id: string;
    establishmentId: string;
    invitedBy: string;
    invitedByName: string;
    email: string;
    phoneNumber: string;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    token: string;
    message?: string;
    expiresAt: Date;
    acceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface InvitationUsage {
    id: string;
    invitationId: string;
    userId: string;
    userEmail: string;
    usedAt: Date;
    ipAddress?: string;
    userAgent?: string;
}
