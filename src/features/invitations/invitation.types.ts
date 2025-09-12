export type InvitationType = 'instructor' | 'student';
export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'used_up';

export interface CreateInvitationRequest {
  type: InvitationType;
  establishmentId: string;
  sessionId?: string; // For student invitations to specific sessions
  cohortId?: string; // For student invitations to specific cohorts
  message?: string;
  expiryHours?: number; // Max 24 hours, default 1 hour
  usageLimit?: number; // Max number of users who can use this link, default 1
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
  cohortId?: string;
  message?: string;
  usageLimit: number;
  usageCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Instructor-specific fields (only present for instructor invitations)
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
  cohortId?: string;
  cohortName?: string;
  message?: string;
  usageLimit: number;
  usageCount: number;
  expiresAt: string;
  createdAt: string;
  invitationUrl: string;
}

export interface AcceptInvitationRequest {
  token: string; // Just the invitation token - user should be logged in already
}

export interface InvitationValidationResult {
  isValid: boolean;
  invitation?: Invitation;
  establishmentName?: string;
  sessionName?: string;
  cohortName?: string;
  error?: string;
  warningMessage?: string; // For users already in establishment
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

// For instructor invitations (email-based, legacy system)
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