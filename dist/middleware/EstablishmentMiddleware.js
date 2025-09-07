export class EstablishmentMiddleware {
    logger;
    db;
    constructor(logger, db) {
        this.logger = logger;
        this.db = db;
    }
    extractEstablishment() {
        return (req, res, next) => {
            try {
                let establishmentId;
                const headerEstablishmentId = req.get('X-Establishment-ID');
                if (headerEstablishmentId) {
                    establishmentId = headerEstablishmentId;
                    this.logger.debug('Establishment ID extracted from header', { establishmentId });
                }
                if (!establishmentId && req.params.establishmentId) {
                    establishmentId = req.params.establishmentId;
                    this.logger.debug('Establishment ID extracted from URL params', { establishmentId });
                }
                if (!establishmentId && req.query.establishmentId) {
                    establishmentId = req.query.establishmentId;
                    this.logger.debug('Establishment ID extracted from query params', { establishmentId });
                }
                if (!establishmentId && req.user?.establishments && req.user.establishments.length > 0) {
                    establishmentId = req.user.establishments[0].id;
                    this.logger.debug('Establishment ID extracted from user JWT establishments', { establishmentId });
                }
                if (establishmentId && this.isValidUUID(establishmentId)) {
                    const establishmentFromJWT = req.user?.establishments?.find(est => est.id === establishmentId);
                    req.establishment = {
                        id: establishmentId,
                        name: establishmentFromJWT?.name || '',
                        userRole: establishmentFromJWT?.role || 'unknown'
                    };
                    next();
                }
                else {
                    this.logger.warn('Invalid or missing establishment ID', {
                        headerEstablishmentId,
                        paramEstablishmentId: req.params.establishmentId,
                        queryEstablishmentId: req.query.establishmentId,
                        userEstablishments: req.user?.establishments?.length || 0
                    });
                    res.status(400).json({
                        success: false,
                        message: 'Valid establishment ID is required',
                        code: 'ESTABLISHMENT_ID_REQUIRED'
                    });
                }
            }
            catch (error) {
                this.logger.error('Error in establishment middleware', { error });
                res.status(500).json({
                    success: false,
                    message: 'Failed to process establishment context',
                    code: 'ESTABLISHMENT_MIDDLEWARE_ERROR'
                });
            }
        };
    }
    validateEstablishmentAccess() {
        return async (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }
            if (!req.establishment) {
                res.status(400).json({
                    success: false,
                    message: 'Establishment context required',
                    code: 'ESTABLISHMENT_CONTEXT_REQUIRED'
                });
                return;
            }
            try {
                const establishmentInJWT = req.user.establishments?.find(est => est.id === req.establishment.id);
                if (establishmentInJWT) {
                    req.establishment.userRole = establishmentInJWT.role;
                    this.logger.debug('Establishment access validated via JWT', {
                        userId: req.user.id,
                        establishmentId: req.establishment.id,
                        role: establishmentInJWT.role
                    });
                    next();
                    return;
                }
                if (this.db) {
                    const result = await this.db.query(`
            SELECT ue.role, e.name
            FROM user_establishments ue
            JOIN establishments e ON ue.establishment_id = e.id
            WHERE ue.user_id = $1 AND ue.establishment_id = $2 AND ue.status = 'active'
          `, [req.user.id, req.establishment.id]);
                    if (result.rows.length > 0) {
                        req.establishment.userRole = result.rows[0].role;
                        req.establishment.name = result.rows[0].name;
                        this.logger.debug('Establishment access validated via database', {
                            userId: req.user.id,
                            establishmentId: req.establishment.id,
                            role: result.rows[0].role
                        });
                        next();
                        return;
                    }
                }
                this.logger.warn('User attempted to access unauthorized establishment', {
                    userId: req.user.id,
                    requestedEstablishment: req.establishment.id,
                    userEstablishments: req.user.establishments?.map(e => e.id) || []
                });
                res.status(403).json({
                    success: false,
                    message: 'Access denied to this establishment',
                    code: 'ESTABLISHMENT_ACCESS_DENIED'
                });
            }
            catch (error) {
                this.logger.error('Error validating establishment access', { error });
                res.status(500).json({
                    success: false,
                    message: 'Failed to validate establishment access',
                    code: 'ESTABLISHMENT_VALIDATION_ERROR'
                });
            }
        };
    }
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
}
