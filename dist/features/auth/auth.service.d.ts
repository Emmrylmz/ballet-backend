import { LoggerService } from "../../services/LoggerService.js";
import { AuthRepository } from "./auth.repository.js";
import { TokenService } from "./services/TokenService.js";
import { PasswordService } from "./services/PasswordService.js";
import { EmailService } from "./services/EmailService.js";
import { AuthUser, LoginRequest, LoginResponse, RegisterRequest, ActivateAccountRequest, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, RefreshTokenRequest, SecuritySettings, AuthResponse } from "./auth.types.js";
export declare class AuthService {
    private authRepository;
    private tokenService;
    private passwordService;
    private emailService;
    private logger;
    private readonly securitySettings;
    private readonly loginAttempts;
    constructor(authRepository: AuthRepository, tokenService: TokenService, passwordService: PasswordService, emailService: EmailService, logger: LoggerService, config: {
        securitySettings: SecuritySettings;
        frontendUrl: string;
        companyName: string;
        supportEmail: string;
    });
    login(loginData: LoginRequest, ipAddress: string, userAgent: string): Promise<AuthResponse<LoginResponse>>;
    register(registerData: RegisterRequest): Promise<AuthResponse<{
        message: string;
    }>>;
    activateAccount(activationData: ActivateAccountRequest, ipAddress: string, userAgent: string): Promise<AuthResponse<LoginResponse>>;
    forgotPassword(forgotData: ForgotPasswordRequest, ipAddress: string, userAgent: string): Promise<AuthResponse<{
        message: string;
    }>>;
    resetPassword(resetData: ResetPasswordRequest, ipAddress: string, userAgent: string): Promise<AuthResponse<{
        message: string;
    }>>;
    changePassword(userId: string, changeData: ChangePasswordRequest, ipAddress: string, userAgent: string): Promise<AuthResponse<{
        message: string;
    }>>;
    refreshToken(refreshData: RefreshTokenRequest, ipAddress: string, userAgent: string): Promise<AuthResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>>;
    logout(userId: string, refreshToken: string, ipAddress: string, userAgent: string): Promise<AuthResponse<{
        message: string;
    }>>;
    getCurrentUser(userId: string): Promise<AuthResponse<AuthUser>>;
    private getUserWithPassword;
    private checkRateLimit;
    private recordFailedAttempt;
    private logAuthEvent;
    private createAuthError;
}
