import { Router } from "express";
import Joi from "joi";
import { ValidationMiddleware } from "../../middleware/ValidationMiddleware.js";
export class AuthRoutes {
    authController;
    authMiddleware;
    router;
    constructor(authController, authMiddleware) {
        this.authController = authController;
        this.authMiddleware = authMiddleware;
        this.router = Router();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post("/login", ValidationMiddleware.validateBody(this.getLoginSchema()), this.authController.login.bind(this.authController));
        this.router.post("/register", ValidationMiddleware.validateBody(this.getRegisterSchema()), this.authController.register.bind(this.authController));
        this.router.post("/activate", ValidationMiddleware.validateBody(this.getActivateSchema()), this.authController.activateAccount.bind(this.authController));
        this.router.post("/forgot-password", ValidationMiddleware.validateBody(this.getForgotPasswordSchema()), this.authController.forgotPassword.bind(this.authController));
        this.router.post("/reset-password", ValidationMiddleware.validateBody(this.getResetPasswordSchema()), this.authController.resetPassword.bind(this.authController));
        this.router.post("/refresh-token", this.authController.refreshToken.bind(this.authController));
        this.router.post("/check-password-strength", ValidationMiddleware.validateBody(this.getPasswordStrengthSchema()), this.authController.getPasswordStrength.bind(this.authController));
        this.router.get("/health", this.authController.healthCheck.bind(this.authController));
        this.router.use(this.authMiddleware.authenticate());
        this.router.post("/logout", ValidationMiddleware.validateBody(this.getLogoutSchema()), this.authController.logout.bind(this.authController));
        this.router.post("/change-password", ValidationMiddleware.validateBody(this.getChangePasswordSchema()), this.authController.changePassword.bind(this.authController));
        this.router.get("/me", this.authController.getCurrentUser.bind(this.authController));
        this.router.get("/profile", this.authController.getCurrentUser.bind(this.authController));
        this.router.get("/validate-token", this.authController.validateToken.bind(this.authController));
        this.router.get("/sessions", this.authController.getUserSessions.bind(this.authController));
        this.router.delete("/sessions/:sessionId", ValidationMiddleware.validateParams(this.getSessionIdSchema()), this.authController.revokeSession.bind(this.authController));
        this.router.use(this.authMiddleware.requireRoles("admin"));
    }
    getRouter() {
        return this.router;
    }
    getLoginSchema() {
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
    getRegisterSchema() {
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
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
                .required()
                .messages({
                "string.min": "Password must be at least 8 characters long",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
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
    getActivateSchema() {
        return Joi.object({
            token: Joi.string().required().messages({
                "any.required": "Activation token is required",
            }),
            password: Joi.string()
                .min(8)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
                .optional()
                .messages({
                "string.min": "Password must be at least 8 characters long",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
            }),
        });
    }
    getForgotPasswordSchema() {
        return Joi.object({
            email: Joi.string().email().required().messages({
                "string.email": "Please provide a valid email address",
                "any.required": "Email is required",
            }),
        });
    }
    getResetPasswordSchema() {
        return Joi.object({
            token: Joi.string().required().messages({
                "any.required": "Reset token is required",
            }),
            newPassword: Joi.string()
                .min(8)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
                .required()
                .messages({
                "string.min": "Password must be at least 8 characters long",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
                "any.required": "New password is required",
            }),
        });
    }
    getChangePasswordSchema() {
        return Joi.object({
            currentPassword: Joi.string().required().messages({
                "any.required": "Current password is required",
            }),
            newPassword: Joi.string()
                .min(8)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
                .required()
                .messages({
                "string.min": "Password must be at least 8 characters long",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
                "any.required": "New password is required",
            }),
        });
    }
    getLogoutSchema() {
        return Joi.object({
            refreshToken: Joi.string().required().messages({
                "any.required": "Refresh token is required",
            }),
        });
    }
    getPasswordStrengthSchema() {
        return Joi.object({
            password: Joi.string().required().messages({
                "any.required": "Password is required",
            }),
        });
    }
    getSessionIdSchema() {
        return Joi.object({
            sessionId: Joi.string().uuid().required().messages({
                "string.uuid": "Session ID must be a valid UUID",
                "any.required": "Session ID is required",
            }),
        });
    }
}
