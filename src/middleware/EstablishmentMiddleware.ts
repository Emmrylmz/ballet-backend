import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/LoggerService.js';
import { DatabaseService } from '../services/DatabaseService.js';

interface Establishment {
  id: string;
  name: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    establishments?: Establishment[];
  };
  establishment?: {
    id: string;
    name: string;
    userRole: string; // User's role in this establishment
  };
}

export class EstablishmentMiddleware {
  constructor(private logger: LoggerService, private db?: DatabaseService) {}

  /**
   * Extract establishment ID from various sources:
   * 1. X-Establishment-ID header
   * 2. URL parameters  
   * 3. Query parameters
   * 4. User's primary establishment (first one in JWT)
   */
  extractEstablishment() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        let establishmentId: string | undefined;

        // 1. Check X-Establishment-ID header first (highest priority)
        const headerEstablishmentId = req.get('X-Establishment-ID');
        if (headerEstablishmentId) {
          establishmentId = headerEstablishmentId;
          this.logger.debug('Establishment ID extracted from header', { establishmentId });
        }

        // 2. Check URL parameters
        if (!establishmentId && req.params.establishmentId) {
          establishmentId = req.params.establishmentId;
          this.logger.debug('Establishment ID extracted from URL params', { establishmentId });
        }

        // 3. Check query parameters
        if (!establishmentId && req.query.establishmentId) {
          establishmentId = req.query.establishmentId as string;
          this.logger.debug('Establishment ID extracted from query params', { establishmentId });
        }

        // 4. Fallback to user's primary establishment (first one in JWT)
        if (!establishmentId && req.user?.establishments && req.user.establishments.length > 0) {
          // Use the first establishment as default
          establishmentId = req.user.establishments[0].id;
          this.logger.debug('Establishment ID extracted from user JWT establishments', { establishmentId });
        }

        // Validate establishment ID format (should be UUID)
        if (establishmentId && this.isValidUUID(establishmentId)) {
          // Find the establishment info from JWT
          const establishmentFromJWT = req.user?.establishments?.find(est => est.id === establishmentId);
          
          req.establishment = { 
            id: establishmentId, 
            name: establishmentFromJWT?.name || '',
            userRole: establishmentFromJWT?.role || 'unknown'
          };
          next();
        } else {
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
      } catch (error) {
        this.logger.error('Error in establishment middleware', { error });
        res.status(500).json({
          success: false,
          message: 'Failed to process establishment context',
          code: 'ESTABLISHMENT_MIDDLEWARE_ERROR'
        });
      }
    };
  }

  /**
   * Validate that the authenticated user has access to the requested establishment
   * This checks the JWT establishments array first, then falls back to database validation
   */
  validateEstablishmentAccess() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
        // First check if establishment is in JWT (fastest method)
        const establishmentInJWT = req.user.establishments?.find(
          est => est.id === req.establishment!.id
        );

        if (establishmentInJWT) {
          // Update the establishment with role info from JWT
          req.establishment.userRole = establishmentInJWT.role;
          this.logger.debug('Establishment access validated via JWT', {
            userId: req.user.id,
            establishmentId: req.establishment.id,
            role: establishmentInJWT.role
          });
          next();
          return;
        }

        // If not in JWT, validate against database (may happen if JWT is stale)
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

        // Access denied
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

      } catch (error) {
        this.logger.error('Error validating establishment access', { error });
        res.status(500).json({
          success: false,
          message: 'Failed to validate establishment access',
          code: 'ESTABLISHMENT_VALIDATION_ERROR'
        });
      }
    };
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}