import { DatabaseService } from "../../../services/DatabaseService.js";
import { LoggerService } from "../../../services/LoggerService.js";
import { JWTPayload, UserRole, SecuritySettings } from "../auth.types.js";
export declare class TokenService {
    private db;
    private logger;
    private readonly accessTokenSecret;
    private readonly refreshTokenSecret;
    private readonly securitySettings;
    constructor(db: DatabaseService, logger: LoggerService, config: {
        accessTokenSecret: string;
        refreshTokenSecret: string;
        securitySettings: SecuritySettings;
    });
    generateTokenPair(userId: string, email: string, role: UserRole, establishmentId: string, permissions: string[]): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    verifyAccessToken(token: string): JWTPayload | null;
    verifyRefreshToken(token: string): Promise<JWTPayload | null>;
    generateSecureToken(length?: number): string;
    generateActivationToken(userId: string, email: string): string;
    generatePasswordResetToken(userId: string, email: string): string;
    verifySpecialToken(token: string, expectedType: string): {
        sub: string;
        email: string;
    } | null;
    private storeRefreshToken;
    revokeRefreshToken(token: string): Promise<void>;
    revokeAllUserTokens(userId: string): Promise<void>;
    cleanupExpiredTokens(): Promise<void>;
    private hashToken;
    getUserSessions(userId: string): Promise<any[]>;
    updateSessionInfo(tokenHash: string, ipAddress: string, userAgent: string): Promise<void>;
}
