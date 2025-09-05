import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
export declare class AuthRoutes {
    private authController;
    private authMiddleware;
    private router;
    constructor(authController: AuthController, authMiddleware: AuthMiddleware);
    private initializeRoutes;
    getRouter(): Router;
    private getLoginSchema;
    private getRegisterSchema;
    private getActivateSchema;
    private getForgotPasswordSchema;
    private getResetPasswordSchema;
    private getChangePasswordSchema;
    private getRefreshTokenSchema;
    private getLogoutSchema;
    private getPasswordStrengthSchema;
    private getSessionIdSchema;
}
