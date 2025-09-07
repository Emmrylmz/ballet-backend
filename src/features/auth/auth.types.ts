// Authentication and Authorization Types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  emailVerified: boolean;
  lastLogin?: Date;
  // Establishment info (loaded when needed)
  establishments?: Establishment[];
}

export interface Establishment {
  id: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  establishmentId: string;
  invitedBy?: string; // User ID who sent the invitation
}

export interface ActivateAccountRequest {
  token: string;
  password?: string; // If not set during registration
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string; // Optional since we'll read from cookies
}

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  establishments?: Establishment[];
  tokenType: "access" | "refresh";
  iat: number;
  exp: number;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  establishmentId: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "expired";
  createdAt: Date;
}

export type UserRole =
  | "admin"
  | "manager"
  | "instructor"
  | "student";

export type UserStatus = "active" | "inactive" | "pending" | "suspended";

export interface Permission {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface AuthContext {
  user: AuthUser;
  permissions: Set<string>;
  isAuthenticated: boolean;
  canAccess: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  tokenExpiryTime: number; // minutes
  refreshTokenExpiryTime: number; // days
  activationTokenExpiry: number; // hours
  passwordResetTokenExpiry: number; // hours
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Email template types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface ActivationEmailData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };

  activationUrl: string;
  invitedBy?: string | undefined;
  expiresIn: string;
}

export interface PasswordResetEmailData {
  user: {
    firstName: string;
    email: string;
  };

  resetUrl: string;
  expiresIn: string;
}

// Audit logging
export interface AuthAuditLog {
  id: string;
  userId?: string;
  email: string;
  action: AuthAction;
  ipAddress: string;
  userAgent: string;
  establishmentId?: string;
  success: boolean;
  failureReason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export type AuthAction =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "logout"
  | "password_change"
  | "password_reset_request"
  | "password_reset_success"
  | "account_activation"
  | "account_suspended"
  | "permission_denied"
  | "token_refresh"
  | "user_invitation_sent";

export class AuthError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any> | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, any> | undefined
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

// Response wrapper types
export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: Record<string, any>;
}
