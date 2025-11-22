import { Pool } from "pg";
import { DatabaseService } from "./DatabaseService.js";
import { LoggerService } from "./LoggerService.js";

export interface AuditLogEntry {
  establishment_id: string;
  user_id: string;
  user_role: string;
  module: string;
  action_type: string;
  target_type: string;
  target_id: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  module?: string;
  actionType?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  offset?: number;
}

export interface AuditLog {
  id: string;
  establishment_id: string;
  user_id: string;
  user_role: string;
  module: string;
  action_type: string;
  target_type: string;
  target_id: string;
  metadata: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  user_name?: string;
  user_email?: string;
}

export class AuditLogService {
  constructor(
    private db: DatabaseService | Pool,
    private logger: LoggerService
  ) {}

  /**
   * Create a new audit log entry
   * Non-blocking - errors are logged but don't fail the request
   */
  async create(entry: AuditLogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (
          establishment_id, user_id, user_role, module, action_type,
          target_type, target_id, metadata, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at
      `;

      const result = await this.db.query(query, [
        entry.establishment_id,
        entry.user_id,
        entry.user_role,
        entry.module,
        entry.action_type,
        entry.target_type,
        entry.target_id,
        JSON.stringify(entry.metadata || {}),
        entry.ip_address,
        entry.user_agent,
      ]);

      this.logger.debug("Audit log entry created", {
        id: result.rows[0]?.id,
        module: entry.module,
        action: entry.action_type,
      });
    } catch (error) {
      // Log error but don't throw - audit logging should never break the app
      this.logger.error("Failed to create audit log entry", {
        error: error instanceof Error ? error.message : String(error),
        module: entry.module,
        action: entry.action_type,
      });
    }
  }

  /**
   * Get audit logs for an establishment with filters
   */
  async getByEstablishment(
    establishmentId: string,
    filters?: AuditLogFilters
  ): Promise<AuditLog[]> {
    try {
      let query = `
        SELECT
          al.id,
          al.establishment_id,
          al.user_id,
          al.user_role,
          al.module,
          al.action_type,
          al.target_type,
          al.target_id,
          al.metadata,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.establishment_id = $1
      `;

      const params: any[] = [establishmentId];
      let paramIndex = 2;

      // Apply filters
      if (filters?.userId) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters?.module) {
        query += ` AND al.module = $${paramIndex}`;
        params.push(filters.module);
        paramIndex++;
      }

      if (filters?.actionType) {
        query += ` AND al.action_type = $${paramIndex}`;
        params.push(filters.actionType);
        paramIndex++;
      }

      if (filters?.targetType) {
        query += ` AND al.target_type = $${paramIndex}`;
        params.push(filters.targetType);
        paramIndex++;
      }

      if (filters?.targetId) {
        query += ` AND al.target_id = $${paramIndex}`;
        params.push(filters.targetId);
        paramIndex++;
      }

      if (filters?.startDate) {
        query += ` AND al.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters?.endDate) {
        query += ` AND al.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      query += ` ORDER BY al.created_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get audit logs", {
        error: error instanceof Error ? error.message : String(error),
        establishmentId,
      });
      throw error;
    }
  }

  /**
   * Get total count of audit logs for an establishment with filters
   */
  async getCountByEstablishment(
    establishmentId: string,
    filters?: AuditLogFilters
  ): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        WHERE al.establishment_id = $1
      `;

      const params: any[] = [establishmentId];
      let paramIndex = 2;

      // Apply same filters as getByEstablishment
      if (filters?.userId) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters?.module) {
        query += ` AND al.module = $${paramIndex}`;
        params.push(filters.module);
        paramIndex++;
      }

      if (filters?.actionType) {
        query += ` AND al.action_type = $${paramIndex}`;
        params.push(filters.actionType);
        paramIndex++;
      }

      if (filters?.targetType) {
        query += ` AND al.target_type = $${paramIndex}`;
        params.push(filters.targetType);
        paramIndex++;
      }

      if (filters?.targetId) {
        query += ` AND al.target_id = $${paramIndex}`;
        params.push(filters.targetId);
        paramIndex++;
      }

      if (filters?.startDate) {
        query += ` AND al.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters?.endDate) {
        query += ` AND al.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0]?.total || "0", 10);
    } catch (error) {
      this.logger.error("Failed to get audit logs count", {
        error: error instanceof Error ? error.message : String(error),
        establishmentId,
      });
      throw error;
    }
  }

  /**
   * Get action history for a specific target (e.g., student, payment)
   */
  async getActionHistory(
    establishmentId: string,
    targetType: string,
    targetId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const query = `
        SELECT
          al.id,
          al.establishment_id,
          al.user_id,
          al.user_role,
          al.module,
          al.action_type,
          al.target_type,
          al.target_id,
          al.metadata,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.establishment_id = $1
          AND al.target_type = $2
          AND al.target_id = $3
        ORDER BY al.created_at DESC
        LIMIT $4
      `;

      const result = await this.db.query(query, [
        establishmentId,
        targetType,
        targetId,
        limit,
      ]);

      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get action history", {
        error: error instanceof Error ? error.message : String(error),
        targetType,
        targetId,
      });
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    establishmentId: string,
    userId: string,
    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<
    Array<{
      module: string;
      action_type: string;
      count: number;
      last_action: Date;
    }>
  > {
    try {
      let query = `
        SELECT
          module,
          action_type,
          COUNT(*) as count,
          MAX(created_at) as last_action
        FROM audit_logs
        WHERE establishment_id = $1
          AND user_id = $2
      `;

      const params: any[] = [establishmentId, userId];
      let paramIndex = 3;

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
      }

      query += `
        GROUP BY module, action_type
        ORDER BY count DESC
      `;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get user activity summary", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Get module activity summary (for analytics)
   */
  async getModuleActivitySummary(
    establishmentId: string,
    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<
    Array<{
      module: string;
      action_count: number;
      unique_users: number;
      last_activity: Date;
    }>
  > {
    try {
      let query = `
        SELECT
          module,
          COUNT(*) as action_count,
          COUNT(DISTINCT user_id) as unique_users,
          MAX(created_at) as last_activity
        FROM audit_logs
        WHERE establishment_id = $1
      `;

      const params: any[] = [establishmentId];
      let paramIndex = 2;

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
      }

      query += `
        GROUP BY module
        ORDER BY action_count DESC
      `;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error("Failed to get module activity summary", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
