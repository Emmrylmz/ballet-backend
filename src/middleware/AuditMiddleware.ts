import { Request, Response, NextFunction } from "express";
import { AuditLogService } from "../services/AuditLogService.js";
import { LoggerService } from "../services/LoggerService.js";

interface AuditableRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  establishment?: {
    id: string;
    role: string;
    name?: string;
  };
}

export class AuditMiddleware {
  constructor(
    private auditLogService: AuditLogService,
    private logger: LoggerService
  ) {}

  /**
   * Simple audit logging - auto-detects target from request
   * Usage: auditMiddleware.log('payments', 'record_payment')
   */
  log(module: string, actionType: string) {
    return (req: AuditableRequest, res: Response, next: NextFunction) => {
      // Store original send method
      const originalSend = res.send.bind(res);

      // Override send to capture response
      res.send = ((data: any) => {
        // Only log successful actions (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Extract target information from request
          let targetId =
            req.params.id ||
            req.params.studentId ||
            req.params.cohortId ||
            req.params.paymentId ||
            req.params.classId ||
            req.params.sessionId ||
            req.params.planId ||
            req.body.studentId ||
            req.body.cohortId ||
            req.body.id;

          // For CREATE operations (201), try to extract ID from response
          if (!targetId && res.statusCode === 201) {
            try {
              const responseData = typeof data === 'string' ? JSON.parse(data) : data;
              targetId = responseData?.data?.id || responseData?.id;
            } catch (err) {
              // If parsing fails, continue with unknown
            }
          }

          // Fallback to a placeholder UUID if still not found
          if (!targetId) {
            targetId = "00000000-0000-0000-0000-000000000000";
          }

          const targetType = this.inferTargetType(req);

          // Get establishment ID
          const establishmentId =
            (req.headers["x-establishment-id"] as string) ||
            req.establishment?.id ||
            "unknown";

          // Get user info
          const userId = req.user?.id || "system";
          const userRole =
            req.establishment?.role || req.user?.role || "unknown";

          // Log asynchronously (don't block response)
          setImmediate(() => {
            this.auditLogService
              .create({
                establishment_id: establishmentId,
                user_id: userId,
                user_role: userRole,
                module,
                action_type: actionType,
                target_type: targetType,
                target_id: String(targetId),
                metadata: {
                  request_method: req.method,
                  request_path: req.path,
                  request_body: this.sanitizeBody(req.body),
                  request_params: req.params,
                  request_query: req.query,
                  response_status: res.statusCode,
                },
                ip_address: this.getClientIp(req),
                user_agent: req.headers["user-agent"],
              })
              .catch((err) => {
                this.logger.error("Failed to create audit log entry", {
                  module,
                  actionType,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
          });
        }

        return originalSend(data);
      }).bind(res);

      next();
    };
  }

  /**
   * Custom audit logging with explicit target details
   * Usage: auditMiddleware.logCustom({...})
   */
  logCustom(config: {
    module: string;
    actionType: string;
    targetType: string;
    targetIdExtractor?: (req: Request) => string;
    extractMetadata?: (req: Request, res: Response) => any;
  }) {
    return (req: AuditableRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send.bind(res);

      res.send = ((data: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const targetId = config.targetIdExtractor
            ? config.targetIdExtractor(req)
            : this.extractDefaultTargetId(req);

          const metadata = config.extractMetadata
            ? config.extractMetadata(req, res)
            : {
                request_body: this.sanitizeBody(req.body),
                response_status: res.statusCode,
              };

          const establishmentId =
            (req.headers["x-establishment-id"] as string) ||
            req.establishment?.id ||
            "unknown";

          const userId = req.user?.id || "system";
          const userRole =
            req.establishment?.role || req.user?.role || "unknown";

          setImmediate(() => {
            this.auditLogService
              .create({
                establishment_id: establishmentId,
                user_id: userId,
                user_role: userRole,
                module: config.module,
                action_type: config.actionType,
                target_type: config.targetType,
                target_id: targetId,
                metadata,
                ip_address: this.getClientIp(req),
                user_agent: req.headers["user-agent"],
              })
              .catch((err) => {
                this.logger.error("Failed to create custom audit log", {
                  module: config.module,
                  actionType: config.actionType,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
          });
        }

        return originalSend(data);
      }).bind(res);

      next();
    };
  }

  /**
   * Batch audit logging for bulk operations
   * Usage: auditMiddleware.logBatch('payments', 'bulk_record_payments')
   */
  logBatch(module: string, actionType: string) {
    return (req: AuditableRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send.bind(res);

      res.send = ((data: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const establishmentId =
            (req.headers["x-establishment-id"] as string) ||
            req.establishment?.id ||
            "unknown";

          const userId = req.user?.id || "system";
          const userRole =
            req.establishment?.role || req.user?.role || "unknown";

          // For bulk operations, log a single audit entry with all targets in metadata
          setImmediate(() => {
            this.auditLogService
              .create({
                establishment_id: establishmentId,
                user_id: userId,
                user_role: userRole,
                module,
                action_type: actionType,
                target_type: "bulk",
                target_id: "multiple",
                metadata: {
                  request_method: req.method,
                  request_path: req.path,
                  request_body: this.sanitizeBody(req.body),
                  response_status: res.statusCode,
                  targets_count: this.extractBulkTargetsCount(req),
                },
                ip_address: this.getClientIp(req),
                user_agent: req.headers["user-agent"],
              })
              .catch((err) => {
                this.logger.error("Failed to create batch audit log", {
                  module,
                  actionType,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
          });
        }

        return originalSend(data);
      }).bind(res);

      next();
    };
  }

  /**
   * Infer target type from request parameters and body
   */
  private inferTargetType(req: AuditableRequest): string {
    // Check params first
    if (req.params.studentId || req.body.studentId) return "student";
    if (req.params.cohortId || req.body.cohortId) return "cohort";
    if (req.params.paymentId || req.body.paymentId) return "payment";
    if (req.params.classId || req.body.classId) return "class";
    if (req.params.sessionId || req.body.sessionId) return "session";
    if (req.params.attendanceId || req.body.attendanceId) return "attendance";
    if (req.params.planId || req.body.planId) return "payment_plan";
    if (req.params.discountId || req.body.discountId) return "discount";
    if (req.params.invitationId || req.body.invitationId) return "invitation";
    if (req.params.userId || req.body.userId) return "user";

    // Try to infer from route path
    if (req.path.includes("/students")) return "student";
    if (req.path.includes("/cohorts")) return "cohort";
    if (req.path.includes("/payments")) return "payment";
    if (req.path.includes("/classes")) return "class";
    if (req.path.includes("/sessions")) return "session";
    if (req.path.includes("/attendance")) return "attendance";
    if (req.path.includes("/plans")) return "payment_plan";
    if (req.path.includes("/discounts")) return "discount";

    return "unknown";
  }

  /**
   * Extract default target ID from request
   */
  private extractDefaultTargetId(req: AuditableRequest): string {
    return (
      req.params.id ||
      req.params.studentId ||
      req.params.cohortId ||
      req.params.paymentId ||
      req.params.classId ||
      req.params.sessionId ||
      req.params.planId ||
      req.body.id ||
      req.body.studentId ||
      req.body.cohortId ||
      "unknown"
    );
  }

  /**
   * Extract count of targets for bulk operations
   */
  private extractBulkTargetsCount(req: AuditableRequest): number {
    if (req.body.studentIds && Array.isArray(req.body.studentIds)) {
      return req.body.studentIds.length;
    }
    if (req.body.attendanceRecords && Array.isArray(req.body.attendanceRecords)) {
      return req.body.attendanceRecords.length;
    }
    if (req.body.payments && Array.isArray(req.body.payments)) {
      return req.body.payments.length;
    }
    if (req.body.records && Array.isArray(req.body.records)) {
      return req.body.records.length;
    }
    return 0;
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== "object") return body;

    const sanitized = { ...body };
    const sensitiveFields = [
      "password",
      "token",
      "refreshToken",
      "accessToken",
      "secret",
      "apiKey",
      "privateKey",
      "creditCard",
      "cvv",
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "***REDACTED***";
      }
    }

    // Also check nested objects
    for (const key in sanitized) {
      if (
        sanitized[key] &&
        typeof sanitized[key] === "object" &&
        !Array.isArray(sanitized[key])
      ) {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (forwardedFor) {
      // x-forwarded-for can be a comma-separated list
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0];
      return ips.trim();
    }

    return (
      req.ip ||
      req.socket.remoteAddress ||
      (req.connection as any)?.remoteAddress ||
      "unknown"
    );
  }
}
