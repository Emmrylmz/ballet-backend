import { QueryResult } from "pg";
import { DatabaseService } from "../../services/DatabaseService.js";
import { LoggerService } from "../../services/LoggerService.js";
import {
  AuthUser,
  UserRole,
  UserStatus,
  UserInvitation,
  AuthAuditLog,
  AuthAction,
} from "./auth.types.js";

export class AuthRepository {
  constructor(private db: DatabaseService, private logger: LoggerService) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      // Single efficient query to get user with all establishments
      const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.email_verified,
        u.last_login,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'businessName', e.business_name,
              'role', ue.role,
              'isPrimary', ue.is_primary,
              'status', ue.status
            ) ORDER BY ue.is_primary DESC, e.name ASC
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        ) as establishments
      FROM users u
      LEFT JOIN user_establishments ue ON u.id = ue.user_id AND ue.status = 'active'
      LEFT JOIN establishments e ON ue.establishment_id = e.id
      WHERE u.email = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.status, u.email_verified, u.last_login
    `;

      const result = await this.db.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      const establishments = user.establishments;

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        establishments,
      };

      return authUser;
    } catch (error) {
      this.logger.error("Failed to find user by email", { error, email });
      throw error;
    }
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    try {
      // Single efficient query to get user with all establishments
      const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.email_verified,
        u.last_login,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'businessName', e.business_name,
              'role', ue.role,
              'isPrimary', ue.is_primary,
              'status', ue.status
            ) ORDER BY ue.is_primary DESC, e.name ASC
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        ) as establishments
      FROM users u
      LEFT JOIN user_establishments ue ON u.id = ue.user_id AND ue.status = 'active'
      LEFT JOIN establishments e ON ue.establishment_id = e.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.status, u.email_verified, u.last_login
    `;

      const result = await this.db.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      const establishments = user.establishments;

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        establishments,
      };

      return authUser;
    } catch (error) {
      this.logger.error("Failed to find user by ID", { error, userId });
      throw error;
    }
  }

  async createUser(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status?: UserStatus;
    invitedBy?: string;
  }): Promise<string> {
    try {
      // Create user without role and establishment - these will be assigned later by managers
      const result = await this.db.query(
        `
        INSERT INTO users (
          email, password_hash, first_name, last_name, phone, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
        [
          userData.email,
          userData.passwordHash,
          userData.firstName,
          userData.lastName,
          userData.phone || null,
          userData.status || "pending",
          userData.invitedBy || null,
        ]
      );

      const userId = result.rows[0].id;

      this.logger.info("User created successfully", {
        userId,
        email: userData.email,
      });

      return userId;
    } catch (error) {
      this.logger.error("Failed to create user", {
        error,
        email: userData.email,
      });
      throw error;
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      status: UserStatus;
      emailVerified: boolean;
      lastLogin: Date;
      passwordHash: string;
    }>
  ): Promise<void> {
    try {
      const setClause = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbKey =
            key === "firstName"
              ? "first_name"
              : key === "lastName"
              ? "last_name"
              : key === "emailVerified"
              ? "email_verified"
              : key === "lastLogin"
              ? "last_login"
              : key === "passwordHash"
              ? "password_hash"
              : key;

          setClause.push(`${dbKey} = $${paramCount++}`);
          values.push(value);
        }
      }

      if (setClause.length === 0) {
        return;
      }

      values.push(userId);
      const query = `
        UPDATE users 
        SET ${setClause.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
      `;

      await this.db.query(query, values);
      this.logger.info("User updated successfully", {
        userId,
        updates: Object.keys(updates),
      });
    } catch (error) {
      this.logger.error("Failed to update user", { error, userId });
      throw error;
    }
  }

  /**
   * Get the role of a user for a specific establishment
   * @param userId - The UUID of the user
   * @param establishmentId - The UUID of the establishment
   * @param pool - The database connection pool
   * @returns The user's role if found, null otherwise
   */
  async getRole(
    userId: string,
    establishmentId: string
  ): Promise<UserRole | null> {
    try {
      const query = `
      SELECT role
      FROM user_establishments
      WHERE user_id = $1 
        AND establishment_id = $2
        AND status = 'active'
    `;

      const values = [userId, establishmentId];

      const result = await this.db.query(query, values);

      if (result.rows.length > 0) {
        return result.rows[0].role;
      }

      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      throw new Error("Failed to fetch user role");
    }
  }
  async createUserInvitation(
    invitation: Omit<UserInvitation, "id" | "createdAt">
  ): Promise<string> {
    try {
      const result = await this.db.query(
        `
        INSERT INTO user_invitations (
          email, role, establishment_id, invited_by, token, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
        [
          invitation.email,
          invitation.role,
          invitation.establishmentId,
          invitation.invitedBy,
          invitation.token,
          invitation.expiresAt,
          invitation.status,
        ]
      );

      const invitationId = result.rows[0].id;
      this.logger.info("User invitation created", {
        invitationId,
        email: invitation.email,
      });

      return invitationId;
    } catch (error) {
      this.logger.error("Failed to create user invitation", {
        error,
        email: invitation.email,
      });
      throw error;
    }
  }

  async findUserInvitation(token: string): Promise<UserInvitation | null> {
    try {
      const result = await this.db.query(
        `
        SELECT * FROM user_invitations 
        WHERE token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        establishmentId: row.establishment_id,
        invitedBy: row.invited_by,
        token: row.token,
        expiresAt: row.expires_at,
        status: row.status,
        createdAt: row.created_at,
      };
    } catch (error) {
      this.logger.error("Failed to find user invitation", { error, token });
      throw error;
    }
  }

  async updateUserInvitation(
    id: string,
    updates: Partial<Pick<UserInvitation, "status">>
  ): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE user_invitations 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [updates.status, id]
      );

      this.logger.info("User invitation updated", { id, updates });
    } catch (error) {
      this.logger.error("Failed to update user invitation", { error, id });
      throw error;
    }
  }

  async logAuthEvent(
    log: Omit<AuthAuditLog, "id" | "timestamp">
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO auth_audit_logs (
          user_id, email, action, ip_address, user_agent, 
          establishment_id, success, failure_reason, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          log.userId || null,
          log.email,
          log.action,
          log.ipAddress,
          log.userAgent,
          log.establishmentId || null,
          log.success,
          log.failureReason || null,
          JSON.stringify(log.metadata || {}),
        ]
      );
    } catch (error) {
      this.logger.error("Failed to log auth event", {
        error,
        action: log.action,
      });
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  async getAuthLogs(
    filters: {
      userId?: string;
      establishmentId?: string;
      action?: AuthAction;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuthAuditLog[]> {
    try {
      let query = "SELECT * FROM auth_audit_logs WHERE 1=1";
      const params = [];
      let paramCount = 1;

      if (filters.userId) {
        query += ` AND user_id = $${paramCount++}`;
        params.push(filters.userId);
      }

      if (filters.establishmentId) {
        query += ` AND establishment_id = $${paramCount++}`;
        params.push(filters.establishmentId);
      }

      if (filters.action) {
        query += ` AND action = $${paramCount++}`;
        params.push(filters.action);
      }

      if (filters.startDate) {
        query += ` AND created_at >= $${paramCount++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramCount++}`;
        params.push(filters.endDate);
      }

      query += " ORDER BY created_at DESC";

      if (filters.limit) {
        query += ` LIMIT $${paramCount++}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount++}`;
        params.push(filters.offset);
      }

      const result = await this.db.query(query, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        action: row.action,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        establishmentId: row.establishment_id,
        success: row.success,
        failureReason: row.failure_reason,
        metadata: JSON.parse(row.metadata || "{}"),
        timestamp: row.created_at,
      }));
    } catch (error) {
      this.logger.error("Failed to get auth logs", { error, filters });
      throw error;
    }
  }

  async getEstablishmentInfo(
    establishmentId: string
  ): Promise<{ id: string; name: string; businessName: string } | null> {
    try {
      const result = await this.db.query(
        `
        SELECT id, name, business_name 
        FROM establishments 
        WHERE id = $1
      `,
        [establishmentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        businessName: row.business_name,
      };
    } catch (error) {
      this.logger.error("Failed to get establishment info", {
        error,
        establishmentId,
      });
      throw error;
    }
  }

  async updateUserPassword(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [passwordHash, userId]
      );

      this.logger.info("User password updated", { userId });
    } catch (error) {
      this.logger.error("Failed to update user password", { error, userId });
      throw error;
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Check both users table and pending registrations
      const userQuery = "SELECT 1 FROM users WHERE email = $1";
      const tokenQuery =
        "SELECT 1 FROM email_activation_tokens WHERE email = $1 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP";

      const [userResult, tokenResult] = await Promise.all([
        this.db.query(userQuery, [email]),
        this.db.query(tokenQuery, [email]),
      ]);

      return userResult.rows.length > 0 || tokenResult.rows.length > 0;
    } catch (error) {
      this.logger.error("Failed to check email exists", { error, email });
      throw error;
    }
  }

  async getUserPasswordHash(
    userId: string
  ): Promise<{ passwordHash: string } | null> {
    try {
      const result = await this.db.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row: any = result.rows[0];
      return {
        passwordHash: row.password_hash,
      };
    } catch (error) {
      this.logger.error("Failed to get user password hash", { error, userId });
      return null;
    }
  }

  async storeRegistrationWithToken(
    email: string,
    token: string,
    registrationData: {
      passwordHash: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
    expiresAt: Date
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO email_activation_tokens (email, token, registration_data, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET 
          token = EXCLUDED.token,
          registration_data = EXCLUDED.registration_data,
          expires_at = EXCLUDED.expires_at,
          used = FALSE
      `,
        [email, token, JSON.stringify(registrationData), expiresAt]
      );

      this.logger.info("Registration data stored with email token", { email });
    } catch (error) {
      this.logger.error("Failed to store registration data", { error, email });
      throw error;
    }
  }

  async findRegistrationByToken(token: string): Promise<{
    email: string;
    registrationData: {
      passwordHash: string;
      firstName: string;
      lastName: string;
      phone?: string;
    };
  } | null> {
    try {
      const result = await this.db.query(
        `
        SELECT email, registration_data 
        FROM email_activation_tokens 
        WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP AND used = FALSE
      `,
        [token]
      );
      if (result.rows.length === 0) {
        console.log(result.rows, "AMI");
        return null;
      }
      const row = result.rows[0];
      console.log(typeof result.rows[0].registration_data);
      return {
        email: row.email,
        registrationData: row.registration_data,
      };
    } catch (error) {
      this.logger.error("Failed to find registration by token", {
        error,
        token,
      });
      return null;
    }
  }

  async markEmailTokenAsUsed(token: string): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE email_activation_tokens 
        SET used = TRUE 
        WHERE token = $1
      `,
        [token]
      );

      this.logger.info("Email activation token marked as used");
    } catch (error) {
      this.logger.error("Failed to mark email token as used", { error, token });
      throw error;
    }
  }
}
