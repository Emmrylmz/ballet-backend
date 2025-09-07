import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { LoggerService } from "../../services/LoggerService.js";
import {
  LoginRequest,
  RegisterRequest,
  ActivateAccountRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  AuthError,
  Establishment,
} from "./auth.types.js";
import { AUTH_ERRORS } from "../../constants/errorMessages.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    establishments: Establishment[];
  };
}

export class AuthController {
  constructor(
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.login(
        loginData,
        ipAddress,
        userAgent,
        res
      );

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Giriş başarısız oldu");
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;

      const result = await this.authService.register(registerData);

      res.status(201).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Kayıt başarısız oldu");
    }
  }

  async activateAccount(req: Request, res: Response): Promise<void> {
    try {
      const activationData: ActivateAccountRequest = req.body;
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.activateAccount(
        activationData,
        ipAddress,
        userAgent,
        res
      );

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Hesap aktivasyonu başarısız oldu");
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const forgotData: ForgotPasswordRequest = req.body;
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.forgotPassword(
        forgotData,
        ipAddress,
        userAgent
      );

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Şifre sıfırlama isteği başarısız oldu");
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const resetData: ResetPasswordRequest = req.body;
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.resetPassword(
        resetData,
        ipAddress,
        userAgent
      );

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Şifre sıfırlama başarısız oldu");
    }
  }

  async changePassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
        });
        return;
      }

      const changeData: ChangePasswordRequest = req.body;
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.changePassword(
        req.user.id,
        changeData,
        ipAddress,
        userAgent
      );

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Şifre değiştirme başarısız oldu");
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.refreshToken(
        req,
        res,
        ipAddress,
        userAgent
      );

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Token yenileme başarısız oldu");
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
        });
        return;
      }

      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";

      const result = await this.authService.logout(
        req.user.id,
        req,
        res,
        ipAddress,
        userAgent
      );

      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      this.handleAuthError(error, res, "Çıkış başarısız oldu");
    }
  }

  async getCurrentUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
        });
        return;
      }

      const result = await this.authService.getCurrentUser(req.user.id);

      res.status(200).json(result);
    } catch (error) {
      this.handleAuthError(error, res, "Mevcut kullanıcı bilgileri alınamadı");
    }
  }

  async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: AUTH_ERRORS.INVALID_TOKEN,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          user: req.user,
        },
        message: "Token geçerli",
      });
    } catch (error) {
      this.handleAuthError(error, res, "Token doğrulaması başarısız oldu");
    }
  }

  async getPasswordStrength(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          message: "Şifre gerekli",
        });
        return;
      }

      // This would be better handled through a separate utility endpoint
      // For now, we'll create a simple validation
      const minLength = 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

      let strength = 0;
      const feedback = [];

      if (password.length >= minLength) strength++;
      else
        feedback.push(`Şifre en az ${minLength} karakter uzunluğunda olmalı`);

      if (hasUppercase) strength++;
      else feedback.push("Şifre en az bir büyük harf içermelidir");

      if (hasLowercase) strength++;
      else feedback.push("Şifre en az bir küçük harf içermelidir");

      if (hasNumbers) strength++;
      else feedback.push("Şifre en az bir rakam içermelidir");

      if (hasSymbols) strength++;
      else
        feedback.push("Şifre en az bir özel karakter içermelidir");

      const strengthLevel =
        strength === 5
          ? "güçlü"
          : strength >= 4
          ? "iyi"
          : strength >= 3
          ? "orta"
          : strength >= 2
          ? "zayıf"
          : "çok_zayıf";

      res.status(200).json({
        success: true,
        data: {
          strength: strengthLevel,
          score: strength,
          maxScore: 5,
          isValid: strength === 5,
          feedback,
        },
      });
    } catch (error) {
      this.handleAuthError(error, res, "Şifre gücü kontrolü başarısız oldu");
    }
  }

  async getUserSessions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
        });
        return;
      }

      // This would require adding a method to the auth service
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          sessions: [],
          message: "Oturum yönetimi endpoint'i - implementasyon bekleniyor",
        },
      });
    } catch (error) {
      this.handleAuthError(error, res, "Kullanıcı oturumları alınamadı");
    }
  }

  async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: AUTH_ERRORS.AUTHENTICATION_REQUIRED,
        });
        return;
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: "Oturum ID'si gerekli",
        });
        return;
      }

      // This would require adding a method to the auth service
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          message: "Oturum iptali endpoint'i - implementasyon bekleniyor",
        },
      });
    } catch (error) {
      this.handleAuthError(error, res, "Oturum iptal etme başarısız oldu");
    }
  }

  // Health check endpoint for auth service
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          service: "kimlik doğrulama",
          status: "sağlıklı",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        },
      });
    } catch (error) {
      this.handleAuthError(error, res, "Sağlık kontrolü başarısız oldu");
    }
  }

  // Helper methods
  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      "unknown"
    );
  }

  private handleAuthError(
    error: any,
    res: Response,
    defaultMessage: string
  ): void {
    if (error instanceof Error && "code" in error) {
      const authError = error as AuthError;

      this.logger.error("Auth controller error", {
        code: authError.code,
        message: authError.message,
        statusCode: authError.statusCode,
        details: authError.details,
      });

      res.status(authError.statusCode).json({
        success: false,
        message: authError.message,
        code: authError.code,
        ...(authError.details && { details: authError.details }),
      });
      return;
    }

    this.logger.error("Unexpected auth controller error", {
      error,
      defaultMessage,
    });

    res.status(500).json({
      success: false,
      message: defaultMessage,
      code: "INTERNAL_ERROR",
    });
  }
}
