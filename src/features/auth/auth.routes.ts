import { Router } from "express";
import Joi from "joi";
import { AuthController } from "./auth.controller.js";
import { AuthMiddleware } from "./middleware/AuthMiddleware.js";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
import { UserRole } from "./auth.types.js";

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 *   externalDocs:
 *     description: Find more info here
 *     url: https://github.com/your-org/ballet-neli/blob/main/Backend/src/features/auth/README.md
 */

export class AuthRoutes {
  private router: Router;

  constructor(
    private authController: AuthController,
    private authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public authentication routes

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     tags: [Authentication]
     *     summary: User login
     *     description: Authenticate user with email and password
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       400:
     *         description: Validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       401:
     *         description: Invalid credentials
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       403:
     *         description: Account suspended or not activated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       429:
     *         description: Too many login attempts
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/login",
      ValidationMiddleware.validateBody(this.getLoginSchema()),
      this.authController.login.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/register:
     *   post:
     *     tags: [Authentication]
     *     summary: User registration
     *     description: Register a new user account
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterRequest'
     *     responses:
     *       201:
     *         description: Registration successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Validation error or weak password
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       409:
     *         description: Email already exists
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/register",
      ValidationMiddleware.validateBody(this.getRegisterSchema()),
      this.authController.register.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/activate:
     *   post:
     *     tags: [Authentication]
     *     summary: Activate user account
     *     description: Activate user account using token from email deep link
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ActivateAccountRequest'
     *     responses:
     *       200:
     *         description: Account activated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       400:
     *         description: Invalid or expired token
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       404:
     *         description: User not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       409:
     *         description: Account already activated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/activate",
      ValidationMiddleware.validateBody(this.getActivateSchema()),
      this.authController.activateAccount.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/forgot-password:
     *   post:
     *     tags: [Authentication]
     *     summary: Request password reset
     *     description: Send password reset email with deep link
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ForgotPasswordRequest'
     *     responses:
     *       200:
     *         description: Password reset instructions sent (always returns success to prevent email enumeration)
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/forgot-password",
      ValidationMiddleware.validateBody(this.getForgotPasswordSchema()),
      this.authController.forgotPassword.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/reset-password:
     *   post:
     *     tags: [Authentication]
     *     summary: Reset password
     *     description: Reset password using token from email deep link
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ResetPasswordRequest'
     *     responses:
     *       200:
     *         description: Password reset successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Invalid token or weak password
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       404:
     *         description: User not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/reset-password",
      ValidationMiddleware.validateBody(this.getResetPasswordSchema()),
      this.authController.resetPassword.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/refresh-token:
     *   post:
     *     tags: [Authentication]
     *     summary: Refresh access token
     *     description: Generate new access token using refresh token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RefreshTokenRequest'
     *     responses:
     *       200:
     *         description: Token refreshed successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     accessToken:
     *                       type: string
     *                       description: New JWT access token
     *                     refreshToken:
     *                       type: string
     *                       description: New JWT refresh token
     *                     expiresIn:
     *                       type: number
     *                       description: Token expiry time in seconds
     *       401:
     *         description: Invalid or expired refresh token
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       404:
     *         description: User not found or inactive
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/refresh-token",
      this.authController.refreshToken.bind(this.authController)
    );

    // Utility routes
    /**
     * @swagger
     * /auth/check-password-strength:
     *   post:
     *     tags: [Authentication]
     *     summary: Check password strength
     *     description: Validate password strength and get feedback
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/PasswordStrengthRequest'
     *     responses:
     *       200:
     *         description: Password strength analysis
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PasswordStrengthResponse'
     *       400:
     *         description: Validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/check-password-strength",
      ValidationMiddleware.validateBody(this.getPasswordStrengthSchema()),
      this.authController.getPasswordStrength.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/health:
     *   get:
     *     tags: [Authentication]
     *     summary: Health check
     *     description: Check auth service health status
     *     responses:
     *       200:
     *         description: Auth service is healthy
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     service:
     *                       type: string
     *                       example: auth
     *                     status:
     *                       type: string
     *                       example: healthy
     *                     timestamp:
     *                       type: string
     *                       format: date-time
     *                     version:
     *                       type: string
     *                       example: 1.0.0
     */
    this.router.get(
      "/health",
      this.authController.healthCheck.bind(this.authController)
    );

    // Protected routes (require authentication)
    this.router.use(this.authMiddleware.authenticate());

    /**
     * @swagger
     * /auth/logout:
     *   post:
     *     tags: [Authentication]
     *     summary: User logout
     *     description: Logout user and revoke refresh token
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LogoutRequest'
     *     responses:
     *       200:
     *         description: Logout successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       401:
     *         description: Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       400:
     *         description: Refresh token required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/logout",
      ValidationMiddleware.validateBody(this.getLogoutSchema()),
      this.authController.logout.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/change-password:
     *   post:
     *     tags: [Authentication]
     *     summary: Change password
     *     description: Change user password (requires current password)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ChangePasswordRequest'
     *     responses:
     *       200:
     *         description: Password changed successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Invalid current password or weak new password
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       401:
     *         description: Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       404:
     *         description: User not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.post(
      "/change-password",
      ValidationMiddleware.validateBody(this.getChangePasswordSchema()),
      this.authController.changePassword.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/me:
     *   get:
     *     tags: [Authentication]
     *     summary: Get current user
     *     description: Get current authenticated user information
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Current user information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   $ref: '#/components/schemas/AuthUser'
     *       401:
     *         description: Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       404:
     *         description: User not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.get(
      "/me",
      this.authController.getCurrentUser.bind(this.authController)
    );

    // Alias for frontend compatibility
    this.router.get(
      "/profile",
      this.authController.getCurrentUser.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/validate-token:
     *   get:
     *     tags: [Authentication]
     *     summary: Validate access token
     *     description: Validate current access token and return user info
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Token is valid
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     valid:
     *                       type: boolean
     *                       example: true
     *                     user:
     *                       type: object
     *                       properties:
     *                         id:
     *                           type: string
     *                           format: uuid
     *                         email:
     *                           type: string
     *                           format: email
     *                         establishmentId:
     *                           type: string
     *                           format: uuid
     *                         role:
     *                           type: string
     *                         permissions:
     *                           type: array
     *                           items:
     *                             type: string
     *                 message:
     *                   type: string
     *                   example: Token is valid
     *       401:
     *         description: Token is invalid or expired
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.get(
      "/validate-token",
      this.authController.validateToken.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/sessions:
     *   get:
     *     tags: [Authentication]
     *     summary: Get user sessions
     *     description: Get all active sessions for the current user
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User sessions retrieved
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     sessions:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           id:
     *                             type: string
     *                             format: uuid
     *                           ipAddress:
     *                             type: string
     *                           userAgent:
     *                             type: string
     *                           createdAt:
     *                             type: string
     *                             format: date-time
     *                           expiresAt:
     *                             type: string
     *                             format: date-time
     *                     message:
     *                       type: string
     *                       example: Session management endpoint - implementation pending
     *       401:
     *         description: Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.get(
      "/sessions",
      this.authController.getUserSessions.bind(this.authController)
    );

    /**
     * @swagger
     * /auth/sessions/{sessionId}:
     *   delete:
     *     tags: [Authentication]
     *     summary: Revoke session
     *     description: Revoke a specific user session
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: sessionId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: Session ID to revoke
     *     responses:
     *       200:
     *         description: Session revoked successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     message:
     *                       type: string
     *                       example: Session revocation endpoint - implementation pending
     *       400:
     *         description: Invalid session ID
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       401:
     *         description: Authentication required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     *       404:
     *         description: Session not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthError'
     */
    this.router.delete(
      "/sessions/:sessionId",
      ValidationMiddleware.validateParams(this.getSessionIdSchema()),
      this.authController.revokeSession.bind(this.authController)
    );

    // Admin routes (require admin role or higher)
    this.router.use(this.authMiddleware.requireRoles("admin"));

    // Add admin-specific auth routes here if needed
    // For example: user management, role assignments, etc.
  }

  getRouter(): Router {
    return this.router;
  }

  // Validation schemas
  private getLoginSchema(): Joi.ObjectSchema {
    return Joi.object({
      email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
      }),
      password: Joi.string().required().messages({
        "any.required": "Password is required",
      }),
      establishmentId: Joi.string().uuid().optional().messages({
        "string.uuid": "Establishment ID must be a valid UUID",
      }),
      rememberMe: Joi.boolean().default(false).optional(),
    });
  }

  private getRegisterSchema(): Joi.ObjectSchema {
    return Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required().messages({
        "string.min": "First name must be at least 2 characters long",
        "string.max": "First name must be less than 50 characters",
        "any.required": "First name is required",
      }),
      lastName: Joi.string().trim().min(2).max(50).required().messages({
        "string.min": "Last name must be at least 2 characters long",
        "string.max": "Last name must be less than 50 characters",
        "any.required": "Last name is required",
      }),
      email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
      }),
      password: Joi.string()
        .min(8)
        .pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
        )
        .required()
        .messages({
          "string.min": "Password must be at least 8 characters long",
          "string.pattern.base":
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
          "any.required": "Password is required",
        }),
      phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .required()
        .messages({
          "string.pattern.base": "Please provide a valid phone number",
          "any.required": "Phone number is required",
        }),
    });
  }

  private getActivateSchema(): Joi.ObjectSchema {
    return Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Activation token is required",
      }),
      password: Joi.string()
        .min(8)
        .pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
        )
        .optional()
        .messages({
          "string.min": "Password must be at least 8 characters long",
          "string.pattern.base":
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        }),
    });
  }

  private getForgotPasswordSchema(): Joi.ObjectSchema {
    return Joi.object({
      email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
      }),
    });
  }

  private getResetPasswordSchema(): Joi.ObjectSchema {
    return Joi.object({
      token: Joi.string().required().messages({
        "any.required": "Reset token is required",
      }),
      newPassword: Joi.string()
        .min(8)
        .pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
        )
        .required()
        .messages({
          "string.min": "Password must be at least 8 characters long",
          "string.pattern.base":
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
          "any.required": "New password is required",
        }),
    });
  }

  private getChangePasswordSchema(): Joi.ObjectSchema {
    return Joi.object({
      currentPassword: Joi.string().required().messages({
        "any.required": "Current password is required",
      }),
      newPassword: Joi.string()
        .min(8)
        .pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/
        )
        .required()
        .messages({
          "string.min": "Password must be at least 8 characters long",
          "string.pattern.base":
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
          "any.required": "New password is required",
        }),
    });
  }

  private getLogoutSchema(): Joi.ObjectSchema {
    return Joi.object({
      refreshToken: Joi.string().required().messages({
        "any.required": "Refresh token is required",
      }),
    });
  }

  private getPasswordStrengthSchema(): Joi.ObjectSchema {
    return Joi.object({
      password: Joi.string().required().messages({
        "any.required": "Password is required",
      }),
    });
  }

  private getSessionIdSchema(): Joi.ObjectSchema {
    return Joi.object({
      sessionId: Joi.string().uuid().required().messages({
        "string.uuid": "Session ID must be a valid UUID",
        "any.required": "Session ID is required",
      }),
    });
  }
}
