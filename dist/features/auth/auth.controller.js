export class AuthController {
    authService;
    logger;
    constructor(authService, logger) {
        this.authService = authService;
        this.logger = logger;
    }
    async login(req, res) {
        try {
            const loginData = req.body;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.login(loginData, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Login failed');
        }
    }
    async register(req, res) {
        try {
            const registerData = req.body;
            const result = await this.authService.register(registerData);
            res.status(201).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Registration failed');
        }
    }
    async activateAccount(req, res) {
        try {
            const activationData = req.body;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.activateAccount(activationData, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Account activation failed');
        }
    }
    async forgotPassword(req, res) {
        try {
            const forgotData = req.body;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.forgotPassword(forgotData, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Forgot password request failed');
        }
    }
    async resetPassword(req, res) {
        try {
            const resetData = req.body;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.resetPassword(resetData, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Password reset failed');
        }
    }
    async changePassword(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const changeData = req.body;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.changePassword(req.user.id, changeData, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Password change failed');
        }
    }
    async refreshToken(req, res) {
        try {
            const refreshData = req.body;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.refreshToken(refreshData, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Token refresh failed');
        }
    }
    async logout(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const refreshToken = req.body.refreshToken;
            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    message: 'Refresh token is required for logout'
                });
                return;
            }
            const ipAddress = this.getClientIp(req);
            const userAgent = req.get('User-Agent') || 'Unknown';
            const result = await this.authService.logout(req.user.id, refreshToken, ipAddress, userAgent);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Logout failed');
        }
    }
    async getCurrentUser(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const result = await this.authService.getCurrentUser(req.user.id);
            res.status(200).json(result);
        }
        catch (error) {
            this.handleAuthError(error, res, 'Failed to get current user');
        }
    }
    async validateToken(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Token is invalid'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: {
                    valid: true,
                    user: req.user
                },
                message: 'Token is valid'
            });
        }
        catch (error) {
            this.handleAuthError(error, res, 'Token validation failed');
        }
    }
    async getPasswordStrength(req, res) {
        try {
            const { password } = req.body;
            if (!password) {
                res.status(400).json({
                    success: false,
                    message: 'Password is required'
                });
                return;
            }
            const minLength = 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
            let strength = 0;
            const feedback = [];
            if (password.length >= minLength)
                strength++;
            else
                feedback.push(`Password must be at least ${minLength} characters long`);
            if (hasUppercase)
                strength++;
            else
                feedback.push('Password must contain at least one uppercase letter');
            if (hasLowercase)
                strength++;
            else
                feedback.push('Password must contain at least one lowercase letter');
            if (hasNumbers)
                strength++;
            else
                feedback.push('Password must contain at least one number');
            if (hasSymbols)
                strength++;
            else
                feedback.push('Password must contain at least one special character');
            const strengthLevel = strength === 5 ? 'strong' :
                strength >= 4 ? 'good' :
                    strength >= 3 ? 'fair' :
                        strength >= 2 ? 'weak' : 'very_weak';
            res.status(200).json({
                success: true,
                data: {
                    strength: strengthLevel,
                    score: strength,
                    maxScore: 5,
                    isValid: strength === 5,
                    feedback
                }
            });
        }
        catch (error) {
            this.handleAuthError(error, res, 'Password strength check failed');
        }
    }
    async getUserSessions(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: {
                    sessions: [],
                    message: 'Session management endpoint - implementation pending'
                }
            });
        }
        catch (error) {
            this.handleAuthError(error, res, 'Failed to get user sessions');
        }
    }
    async revokeSession(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }
            const { sessionId } = req.params;
            if (!sessionId) {
                res.status(400).json({
                    success: false,
                    message: 'Session ID is required'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: {
                    message: 'Session revocation endpoint - implementation pending'
                }
            });
        }
        catch (error) {
            this.handleAuthError(error, res, 'Failed to revoke session');
        }
    }
    async healthCheck(req, res) {
        try {
            res.status(200).json({
                success: true,
                data: {
                    service: 'auth',
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                }
            });
        }
        catch (error) {
            this.handleAuthError(error, res, 'Health check failed');
        }
    }
    getClientIp(req) {
        return (req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            'unknown');
    }
    handleAuthError(error, res, defaultMessage) {
        if (error instanceof Error && 'code' in error) {
            const authError = error;
            this.logger.error('Auth controller error', {
                code: authError.code,
                message: authError.message,
                statusCode: authError.statusCode,
                details: authError.details
            });
            res.status(authError.statusCode).json({
                success: false,
                message: authError.message,
                code: authError.code,
                ...(authError.details && { details: authError.details })
            });
            return;
        }
        this.logger.error('Unexpected auth controller error', { error, defaultMessage });
        res.status(500).json({
            success: false,
            message: defaultMessage,
            code: 'INTERNAL_ERROR'
        });
    }
}
