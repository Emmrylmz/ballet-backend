import { DatabaseService } from "../../services/DatabaseService.js";
import { PoolClient } from "pg";
import {
  Invitation,
  InvitationType,
  InvitationStatus,
  InvitationFilters,
  InvitationSettings,
  InvitationValidationResult,
  InvitationUsage,
} from "./invitation.types.js";

export class InvitationRepository {
  private tableExistsCache: Map<string, boolean> = new Map();

  constructor(public db: DatabaseService) {}

  /**
   * Check if a table exists (with caching to avoid repeated queries)
   */
  private async tableExists(tableName: string): Promise<boolean> {
    if (this.tableExistsCache.has(tableName)) {
      return this.tableExistsCache.get(tableName)!;
    }

    const result = await this.db.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `,
      [tableName]
    );

    const exists = result.rows[0].exists;
    this.tableExistsCache.set(tableName, exists);
    return exists;
  }

  /**
   * Create a new generic invitation (for students)
   */
  async createInvitation(invitation: {
    establishmentId: string;
    createdBy: string;
    type: InvitationType;
    token: string;
    usageLimit: number;
    sessionId?: string;
    message?: string;
    expiresAt: Date;
  }): Promise<string> {
    const result = await this.db.query(
      `
      INSERT INTO invitations (
        establishment_id, created_by, invitation_type, token, 
        usage_limit, session_id, message, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
      [
        invitation.establishmentId,
        invitation.createdBy,
        invitation.type,
        invitation.token,
        invitation.usageLimit,
        invitation.sessionId || null,
        invitation.message || null,
        invitation.expiresAt,
      ]
    );

    const invitationId = result.rows[0].id;

    // Log the creation to activities
    await this.logInvitationActivity(
      invitation.establishmentId,
      invitationId,
      invitation.createdBy,
      "created",
      `${invitation.type} invitation created${
        invitation.message ? ": " + invitation.message : ""
      }`
    );

    return invitationId;
  }

  /**
   * Find invitation by token with full details and validation
   */
  async findByToken(token: string): Promise<InvitationValidationResult> {
    const result = await this.db.query(
      `
      SELECT 
        i.id,
        i.establishment_id,
        i.created_by,
        i.invitation_type,
        i.status,
        i.token,
        i.usage_limit,
        i.usage_count,
        i.session_id,
        i.message,
        i.expires_at,
        i.created_at,
        i.updated_at,
        e.name as establishment_name,
        ct.title as session_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        ii.email as instructor_email,
        ii.phone_number as instructor_phone
      FROM invitations i
      LEFT JOIN establishments e ON i.establishment_id = e.id
      LEFT JOIN class_sessions cs ON i.session_id = cs.id
      LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN instructor_invitations ii ON i.id = ii.invitation_id AND i.invitation_type = 'instructor'
      WHERE i.token = $1
    `,
      [token]
    );

    if (result.rows.length === 0) {
      return { isValid: false, error: "Invitation not found" };
    }

    const invitation = result.rows[0];

    // Check if invitation is still valid
    if (invitation.status !== "active") {
      return {
        isValid: false,
        error: `Invitation is ${invitation.status}`,
        invitation: this.mapRowToInvitation(invitation),
      };
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expires_at)) {
      // Update status to expired
      await this.updateInvitationStatus(invitation.id, "expired");
      return {
        isValid: false,
        error: "Invitation has expired",
        invitation: this.mapRowToInvitation(invitation),
      };
    }

    // Check if usage limit has been reached
    if (invitation.usage_count >= invitation.usage_limit) {
      // Update status to used_up
      await this.updateInvitationStatus(invitation.id, "used_up");
      return {
        isValid: false,
        error: "Invitation usage limit reached",
        invitation: this.mapRowToInvitation(invitation),
      };
    }

    return {
      isValid: true,
      invitation: this.mapRowToInvitation(invitation),
      establishmentName: invitation.establishment_name,
      sessionName: invitation.session_name,
    };
  }

  /**
   * Accept an invitation and track usage
   */
  async acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const client = await this.db.getClient();
    try {
      await client.query("BEGIN");

      // Check if user already used this invitation
      const existingUsage = await client.query(
        "SELECT id FROM invitation_usage WHERE invitation_id = $1 AND user_id = $2",
        [invitationId, userId]
      );

      if (existingUsage.rows.length > 0) {
        throw new Error("You have already used this invitation");
      }

      // Record the usage
      await client.query(
        `
        INSERT INTO invitation_usage (invitation_id, user_id, user_email, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [invitationId, userId, userEmail, ipAddress, userAgent]
      );

      // Increment usage count
      await client.query(
        "UPDATE invitations SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1",
        [invitationId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user already exists in establishment
   */
  async userExistsInEstablishment(
    userId: string,
    establishmentId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      SELECT 1 FROM user_establishments 
      WHERE user_id = $1 AND establishment_id = $2 AND status = 'active'
    `,
      [userId, establishmentId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get invitation by ID for permission checking
   */
  async getInvitationById(
    invitationId: string
  ): Promise<{ type: InvitationType; establishmentId: string } | null> {
    const result = await this.db.query(
      `
      SELECT invitation_type as type, establishment_id 
      FROM invitations 
      WHERE id = $1
    `,
      [invitationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      type: result.rows[0].type,
      establishmentId: result.rows[0].establishment_id,
    };
  }

  /**
   * Get invitations with filtering
   */
  async getInvitations(filters: InvitationFilters) {
    let whereClause = "1=1";
    const params: any[] = [];
    let paramCount = 0;

    if (filters.establishmentId) {
      whereClause += ` AND i.establishment_id = $${++paramCount}`;
      params.push(filters.establishmentId);
    }

    if (filters.type) {
      whereClause += ` AND i.invitation_type = $${++paramCount}`;
      params.push(filters.type);
    }

    if (filters.status) {
      whereClause += ` AND i.status = $${++paramCount}`;
      params.push(filters.status);
    }

    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : "";
    const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : "";

    const result = await this.db.query(
      `
      SELECT 
        i.id,
        i.establishment_id,
        i.created_by,
        i.invitation_type,
        i.status,
        i.token,
        i.usage_limit,
        i.usage_count,
        i.session_id,
        i.message,
        i.expires_at,
        i.created_at,
        i.updated_at,
        e.name as establishment_name,
        ct.title as session_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM invitations i
      LEFT JOIN establishments e ON i.establishment_id = e.id
      LEFT JOIN class_sessions cs ON i.session_id = cs.id
      LEFT JOIN class_templates ct ON cs.class_template_id = ct.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
      ${limitClause} ${offsetClause}
    `,
      params
    );

    return result.rows.map((row: any) => ({
      ...this.mapRowToInvitation(row),
      establishmentName: row.establishment_name,
      sessionName: row.session_name,
    }));
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(
    invitationId: string,
    revokedBy: string
  ): Promise<void> {
    await this.updateInvitationStatus(invitationId, "revoked");

    // Get invitation details for logging
    const invitation = await this.db.query(
      "SELECT establishment_id, invitation_type FROM invitations WHERE id = $1",
      [invitationId]
    );

    if (invitation.rows.length > 0) {
      await this.logInvitationActivity(
        invitation.rows[0].establishment_id,
        invitationId,
        revokedBy,
        "revoked",
        `${invitation.rows[0].invitation_type} invitation revoked`
      );
    }
  }

  /**
   * Check if user can invite others
   */
  async canUserInvite(
    userId: string,
    establishmentId: string,
    invitationType: InvitationType
  ): Promise<boolean> {
    const result = await this.db.query(
      `
      SELECT role FROM user_establishments 
      WHERE user_id = $1 AND establishment_id = $2 AND status = 'active'
    `,
      [userId, establishmentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const userRole = result.rows[0].role;

    // For student invitations: instructors, managers, admins can invite
    if (invitationType === "student") {
      return ["instructor", "manager", "admin", "super_admin"].includes(
        userRole
      );
    }

    // For instructor invitations: only managers and admins can invite
    if (invitationType === "instructor") {
      return ["manager", "admin", "super_admin"].includes(userRole);
    }

    return false;
  }

  /**
   * Get invitation settings for establishment
   */
  async getInvitationSettings(
    establishmentId: string
  ): Promise<InvitationSettings> {
    // For now, return default settings. Could be stored in DB later
    return {
      studentInvitationMaxHours: 24,
      instructorInvitationEnabled: true,
      studentInvitationEnabled: true,
      requireApprovalForInstructors: false,
      defaultExpiryHours: 1,
      studentInvitationDefaultUsageLimit: 10,
    };
  }

  /**
   * Update invitation settings
   */
  async updateInvitationSettings(
    establishmentId: string,
    settings: Partial<InvitationSettings>
  ): Promise<void> {
    // Implementation would depend on how settings are stored
    // For now, this is a placeholder
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(establishmentId: string) {
    const result = await this.db.query(
      `
      SELECT 
        invitation_type,
        status,
        COUNT(*) as count
      FROM invitations 
      WHERE establishment_id = $1 
      GROUP BY invitation_type, status
    `,
      [establishmentId]
    );

    const stats: any = {
      student: { active: 0, expired: 0, revoked: 0, used_up: 0 },
      instructor: { active: 0, expired: 0, revoked: 0, used_up: 0 },
    };

    result.rows.forEach((row: any) => {
      if (stats[row.invitation_type]) {
        stats[row.invitation_type][row.status] = parseInt(row.count);
      }
    });

    return stats;
  }

  /**
   * Get invitation usage history
   */
  async getInvitationUsage(invitationId: string): Promise<InvitationUsage[]> {
    const result = await this.db.query(
      `
      SELECT 
        iu.id,
        iu.invitation_id,
        iu.user_id,
        iu.user_email,
        iu.used_at,
        iu.ip_address,
        iu.user_agent,
        u.first_name || ' ' || u.last_name as user_name
      FROM invitation_usage iu
      LEFT JOIN users u ON iu.user_id = u.id
      WHERE iu.invitation_id = $1
      ORDER BY iu.used_at DESC
    `,
      [invitationId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      invitationId: row.invitation_id,
      userId: row.user_id,
      userEmail: row.user_email,
      usedAt: row.used_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    }));
  }

  /**
   * Check if there are any active instructor invitations for the given email in the establishment
   */
  async hasActiveInstructorInvitation(
    email: string,
    establishmentId: string
  ): Promise<boolean> {
    // Use cached table existence check
    const exists = await this.tableExists("instructor_invitations");
    if (!exists) {
      return false; // No table means no active invitations
    }

    const result = await this.db.query(
      `
      SELECT ii.id 
      FROM instructor_invitations ii
      INNER JOIN invitations i ON ii.invitation_id = i.id
      WHERE ii.email = $1 
        AND ii.establishment_id = $2 
        AND i.status = 'active' 
        AND i.expires_at > NOW()
        AND ii.status = 'pending'
      LIMIT 1
    `,
      [email.toLowerCase().trim(), establishmentId]
    );

    return result.rows.length > 0;
  }

  /**
   * Clean up expired instructor invitations
   */
  async cleanupExpiredInstructorInvitations(): Promise<number> {
    // Use cached table existence check
    const exists = await this.tableExists("instructor_invitations");
    if (!exists) {
      return 0; // No table means nothing to clean up
    }

    const result = await this.db.query(`
      UPDATE instructor_invitations 
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' 
        AND expires_at <= NOW()
    `);

    return result.rowCount || 0;
  }

  /**
   * Create instructor invitation details
   */
  async createInstructorInvitation(details: {
    invitationId: string;
    email: string;
    phoneNumber: string;
    establishmentId: string;
    invitedBy: string;
    message?: string;
    expiresAt: Date;
  }): Promise<void> {
    // Insert instructor invitation details
    await this.db.query(
      `
      INSERT INTO instructor_invitations (
        invitation_id, email, phone_number, establishment_id, 
        invited_by, message, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        details.invitationId,
        details.email,
        details.phoneNumber,
        details.establishmentId,
        details.invitedBy,
        details.message || null,
        details.expiresAt,
      ]
    );

    // Log activity
    await this.logInvitationActivity(
      details.establishmentId,
      details.invitationId,
      details.invitedBy,
      "created",
      `Instructor invitation sent to ${details.email} (${details.phoneNumber})`
    );
  }

  /**
   * Update instructor invitation status when accepted
   */
  async updateInstructorInvitationStatus(
    invitationId: string,
    status: "accepted" | "expired" | "revoked"
  ): Promise<void> {
    // Use cached table existence check
    const exists = await this.tableExists("instructor_invitations");
    if (exists) {
      if (status === "accepted") {
        await this.db.query(
          `
          UPDATE instructor_invitations 
          SET status = $1, accepted_at = NOW(), updated_at = NOW()
          WHERE invitation_id = $2
        `,
          [status, invitationId]
        );
      } else {
        await this.db.query(
          `
          UPDATE instructor_invitations 
          SET status = $1, updated_at = NOW()
          WHERE invitation_id = $2
        `,
          [status, invitationId]
        );
      }
    }
  }

  /**
   * Update invitation status
   */
  private async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus
  ): Promise<void> {
    await this.db.query(
      "UPDATE invitations SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, invitationId]
    );
  }

  /**
   * Log invitation activity to activities table
   */
  private async logInvitationActivity(
    establishmentId: string,
    invitationId: string,
    userId: string,
    action: string,
    description: string
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO activities (
        establishment_id, activity_type, title, description, user_id
      ) VALUES ($1, 'invitation', $2, $3, $4)
    `,
      [establishmentId, `Invitation ${action}`, description, userId]
    );
  }

  /**
   * Map database row to Invitation object
   */
  private mapRowToInvitation(row: any): Invitation {
    return {
      id: row.id,
      establishmentId: row.establishment_id,
      createdBy: row.created_by,
      createdByName: row.created_by_name || "",
      type: row.invitation_type,
      status: row.status,
      token: row.token,
      sessionId: row.session_id,
      message: row.message,
      usageLimit: parseInt(row.usage_limit),
      usageCount: parseInt(row.usage_count),
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // Include instructor-specific fields if they exist
      instructorEmail: row.instructor_email,
      instructorPhone: row.instructor_phone,
    };
  }
}
