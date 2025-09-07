import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import { AuthUser, UserRole, UserStatus, UserInvitation, AuthAuditLog, AuthAction } from "./auth.types.js";
export declare class AuthRepository {
    private db;
    private logger;
    constructor(db: DatabaseService, logger: LoggerService);
    findUserByEmail(email: string): Promise<AuthUser | null>;
    findUserById(userId: string): Promise<AuthUser | null>;
    createUser(userData: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        phone?: string;
        status?: UserStatus;
        invitedBy?: string;
    }): Promise<string>;
    updateUser(userId: string, updates: Partial<{
        firstName: string;
        lastName: string;
        phone: string;
        status: UserStatus;
        emailVerified: boolean;
        lastLogin: Date;
        passwordHash: string;
    }>): Promise<void>;
    getRole(userId: string, establishmentId: string): Promise<UserRole | null>;
    createUserInvitation(invitation: Omit<UserInvitation, "id" | "createdAt">): Promise<string>;
    findUserInvitation(token: string): Promise<UserInvitation | null>;
    updateUserInvitation(id: string, updates: Partial<Pick<UserInvitation, "status">>): Promise<void>;
    logAuthEvent(log: Omit<AuthAuditLog, "id" | "timestamp">): Promise<void>;
    getAuthLogs(filters?: {
        userId?: string;
        establishmentId?: string;
        action?: AuthAction;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<AuthAuditLog[]>;
    getEstablishmentInfo(establishmentId: string): Promise<{
        id: string;
        name: string;
        businessName: string;
    } | null>;
    updateUserPassword(userId: string, passwordHash: string): Promise<void>;
    checkEmailExists(email: string): Promise<boolean>;
    getUserPasswordHash(userId: string): Promise<{
        passwordHash: string;
    } | null>;
    storeRegistrationWithToken(email: string, token: string, registrationData: {
        passwordHash: string;
        firstName: string;
        lastName: string;
        phone?: string;
    }, expiresAt: Date): Promise<void>;
    findRegistrationByToken(token: string): Promise<{
        email: string;
        registrationData: {
            passwordHash: string;
            firstName: string;
            lastName: string;
            phone?: string;
        };
    } | null>;
    markEmailTokenAsUsed(token: string): Promise<void>;
}
