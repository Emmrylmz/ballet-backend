export class AuthMiddleware {
    tokenService;
    authRepository;
    logger;
    constructor(tokenService, authRepository, logger) {
        this.tokenService = tokenService;
        this.authRepository = authRepository;
        this.logger = logger;
    }
    authenticate() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                if (!token) {
                    res.status(401).json({
                        success: false,
                        message: 'Access token is required',
                        code: 'TOKEN_MISSING'
                    });
                    return;
                }
                const payload = this.tokenService.verifyAccessToken(token);
                if (!payload) {
                    res.status(401).json({
                        success: false,
                        message: 'Invalid or expired token',
                        code: 'TOKEN_INVALID'
                    });
                    return;
                }
                const user = await this.authRepository.findUserById(payload.sub);
                if (!user) {
                    res.status(401).json({
                        success: false,
                        message: 'User not found',
                        code: 'USER_NOT_FOUND'
                    });
                    return;
                }
                if (user.status !== 'active') {
                    await this.authRepository.logAuthEvent({
                        userId: user.id,
                        email: user.email,
                        action: 'permission_denied',
                        ipAddress: this.getClientIp(req),
                        userAgent: req.get('User-Agent') || 'Unknown',
                        establishmentId: user.establishmentId,
                        success: false,
                        failureReason: `User status is ${user.status}`
                    });
                    res.status(403).json({
                        success: false,
                        message: 'Account is not active',
                        code: 'ACCOUNT_INACTIVE'
                    });
                    return;
                }
                req.user = {
                    id: user.id,
                    email: user.email,
                    establishmentId: user.establishmentId,
                    role: user.role,
                    permissions: user.permissions
                };
                next();
            }
            catch (error) {
                this.logger.error('Authentication middleware error', { error });
                res.status(500).json({
                    success: false,
                    message: 'Authentication failed',
                    code: 'AUTH_ERROR'
                });
            }
        };
    }
    requireRoles(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }
            if (!roles.includes(req.user.role)) {
                this.authRepository.logAuthEvent({
                    userId: req.user.id,
                    email: req.user.email,
                    action: 'permission_denied',
                    ipAddress: this.getClientIp(req),
                    userAgent: req.get('User-Agent') || 'Unknown',
                    establishmentId: req.user.establishmentId,
                    success: false,
                    failureReason: `Insufficient role: ${req.user.role}, required: ${roles.join(', ')}`
                });
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    code: 'INSUFFICIENT_ROLE',
                    details: {
                        required: roles,
                        current: req.user.role
                    }
                });
                return;
            }
            next();
        };
    }
    requirePermissions(...permissions) {
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }
            const missingPermissions = permissions.filter(permission => !req.user.permissions.includes(permission));
            if (missingPermissions.length > 0) {
                this.authRepository.logAuthEvent({
                    userId: req.user.id,
                    email: req.user.email,
                    action: 'permission_denied',
                    ipAddress: this.getClientIp(req),
                    userAgent: req.get('User-Agent') || 'Unknown',
                    establishmentId: req.user.establishmentId,
                    success: false,
                    failureReason: `Missing permissions: ${missingPermissions.join(', ')}`
                });
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    details: {
                        required: permissions,
                        missing: missingPermissions,
                        current: req.user.permissions
                    }
                });
                return;
            }
            next();
        };
    }
    requireEstablishmentAccess() {
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }
            const establishmentId = req.params.establishmentId ||
                req.query.establishmentId ||
                req.body.establishmentId;
            if (req.user.role === 'super_admin') {
                next();
                return;
            }
            if (establishmentId && req.user.establishmentId !== establishmentId) {
                this.authRepository.logAuthEvent({
                    userId: req.user.id,
                    email: req.user.email,
                    action: 'permission_denied',
                    ipAddress: this.getClientIp(req),
                    userAgent: req.get('User-Agent') || 'Unknown',
                    establishmentId: req.user.establishmentId,
                    success: false,
                    failureReason: `Access denied to establishment: ${establishmentId}`
                });
                res.status(403).json({
                    success: false,
                    message: 'Access denied to this establishment',
                    code: 'ESTABLISHMENT_ACCESS_DENIED'
                });
                return;
            }
            next();
        };
    }
    optional() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                if (!token) {
                    next();
                    return;
                }
                const payload = this.tokenService.verifyAccessToken(token);
                if (!payload) {
                    next();
                    return;
                }
                const user = await this.authRepository.findUserById(payload.sub);
                if (user && user.status === 'active') {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        establishmentId: user.establishmentId,
                        role: user.role,
                        permissions: user.permissions
                    };
                }
                next();
            }
            catch (error) {
                this.logger.error('Optional auth middleware error', { error });
                next();
            }
        };
    }
    rateLimitByUser(maxRequests = 10000, windowMs = 15 * 60 * 1000) {
        const requests = new Map();
        return (req, res, next) => {
            const userId = req.user?.id;
            if (!userId) {
                next();
                return;
            }
            const now = Date.now();
            const userKey = userId;
            const userRequests = requests.get(userKey);
            if (!userRequests || now > userRequests.resetTime) {
                requests.set(userKey, {
                    count: 1,
                    resetTime: now + windowMs
                });
                next();
                return;
            }
            if (userRequests.count >= maxRequests) {
                const resetIn = Math.ceil((userRequests.resetTime - now) / 1000);
                res.status(429).json({
                    success: false,
                    message: 'Too many requests',
                    code: 'RATE_LIMIT_EXCEEDED',
                    details: {
                        retryAfter: resetIn
                    }
                });
                return;
            }
            userRequests.count++;
            next();
        };
    }
    validateEstablishmentContext() {
        return async (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }
            try {
                const establishment = await this.authRepository.getEstablishmentInfo(req.user.establishmentId);
                if (!establishment) {
                    res.status(404).json({
                        success: false,
                        message: 'Establishment not found',
                        code: 'ESTABLISHMENT_NOT_FOUND'
                    });
                    return;
                }
                req.establishment = establishment;
                next();
            }
            catch (error) {
                this.logger.error('Establishment validation error', { error, userId: req.user.id });
                res.status(500).json({
                    success: false,
                    message: 'Establishment validation failed',
                    code: 'ESTABLISHMENT_VALIDATION_ERROR'
                });
            }
        };
    }
    logRequest() {
        return (req, res, next) => {
            const startTime = Date.now();
            this.logger.info('API Request', {
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: this.getClientIp(req),
                userId: req.user?.id,
                establishmentId: req.user?.establishmentId
            });
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                this.logger.info('API Response', {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    userId: req.user?.id
                });
            });
            next();
        };
    }
    extractToken(req) {
        const authHeader = req.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        const cookieToken = req.cookies?.accessToken;
        if (cookieToken) {
            return cookieToken;
        }
        return null;
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
}
