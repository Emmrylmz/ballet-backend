import { LoggerService } from "../../../services/LoggerService.js";
import { ActivationEmailData, PasswordResetEmailData } from "../auth.types.js";
export interface EmailProvider {
    sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean>;
}
export declare class ConsoleEmailProvider implements EmailProvider {
    private logger;
    constructor(logger: LoggerService);
    sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean>;
}
export declare class SMTPEmailProvider implements EmailProvider {
    private config;
    private logger;
    constructor(config: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        from: string;
    }, logger: LoggerService);
    sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean>;
}
export declare class EmailService {
    private emailProvider;
    private logger;
    private config;
    constructor(emailProvider: EmailProvider, logger: LoggerService, config: {
        frontendUrl: string;
        companyName: string;
        supportEmail: string;
    });
    sendActivationEmail(data: ActivationEmailData): Promise<boolean>;
    sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean>;
    sendWelcomeEmail(user: {
        firstName: string;
        email: string;
    }, establishment?: {
        name: string;
        businessName: string;
    } | null): Promise<boolean>;
    private getActivationEmailTemplate;
    private getPasswordResetEmailTemplate;
    private getWelcomeEmailTemplate;
}
