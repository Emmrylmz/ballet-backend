import { LoggerService } from '../../services/LoggerService.js';
import { Invitation, InvitationType } from './invitation.types.js';
export interface EmailTemplate {
    subject: string;
    htmlBody: string;
    textBody: string;
}
export declare class InvitationEmailService {
    private logger;
    constructor(logger: LoggerService);
    generateInstructorInvitationEmail(invitation: Invitation, establishmentName: string, inviterName: string, invitationUrl: string): EmailTemplate;
    generateStudentInvitationEmail(invitation: Invitation, establishmentName: string, inviterName: string, invitationUrl: string, sessionName?: string): EmailTemplate;
    private calculateTimeRemaining;
    generateAcceptanceNotificationEmail(acceptedBy: string, invitationType: InvitationType, establishmentName: string, inviterName: string, sessionName?: string): EmailTemplate;
}
