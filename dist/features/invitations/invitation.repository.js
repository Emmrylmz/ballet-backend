export class InvitationRepository {
    db;
    tableExistsCache = new Map();
    constructor(db) {
        this.db = db;
    }
    async tableExists(tableName) {
        if (this.tableExistsCache.has(tableName)) {
            return this.tableExistsCache.get(tableName);
        }
        const result = await this.db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
        const exists = result.rows[0].exists;
        this.tableExistsCache.set(tableName, exists);
        return exists;
    }
    async createInvitation(invitation) {
        const result = await this.db.query(`
      INSERT INTO invitations (
        establishment_id, created_by, invitation_type, token, 
        usage_limit, session_id, message, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
            invitation.establishmentId,
            invitation.createdBy,
            invitation.type,
            invitation.token,
            invitation.usageLimit,
            invitation.sessionId || null,
            invitation.message || null,
            invitation.expiresAt,
        ]);
        const invitationId = result.rows[0].id;
        await this.logInvitationActivity(invitation.establishmentId, invitationId, invitation.createdBy, "created", `${invitation.type} invitation created${invitation.message ? ": " + invitation.message : ""}`);
        return invitationId;
    }
    async findByToken(token) {
        const result = await this.db.query(`
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
    `, [token]);
        if (result.rows.length === 0) {
            return { isValid: false, error: "Invitation not found" };
        }
        const invitation = result.rows[0];
        if (invitation.status !== "active") {
            return {
                isValid: false,
                error: `Invitation is ${invitation.status}`,
                invitation: this.mapRowToInvitation(invitation),
            };
        }
        if (new Date() > new Date(invitation.expires_at)) {
            await this.updateInvitationStatus(invitation.id, "expired");
            return {
                isValid: false,
                error: "Invitation has expired",
                invitation: this.mapRowToInvitation(invitation),
            };
        }
        if (invitation.usage_count >= invitation.usage_limit) {
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
    async acceptInvitation(invitationId, userId, userEmail, ipAddress, userAgent) {
        const client = await this.db.getClient();
        try {
            await client.query("BEGIN");
            const existingUsage = await client.query("SELECT id FROM invitation_usage WHERE invitation_id = $1 AND user_id = $2", [invitationId, userId]);
            if (existingUsage.rows.length > 0) {
                throw new Error("You have already used this invitation");
            }
            await client.query(`
        INSERT INTO invitation_usage (invitation_id, user_id, user_email, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [invitationId, userId, userEmail, ipAddress, userAgent]);
            await client.query("UPDATE invitations SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1", [invitationId]);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async userExistsInEstablishment(userId, establishmentId) {
        const result = await this.db.query(`
      SELECT 1 FROM user_establishments 
      WHERE user_id = $1 AND establishment_id = $2 AND status = 'active'
    `, [userId, establishmentId]);
        return result.rows.length > 0;
    }
    async getInvitationById(invitationId) {
        const result = await this.db.query(`
      SELECT invitation_type as type, establishment_id 
      FROM invitations 
      WHERE id = $1
    `, [invitationId]);
        if (result.rows.length === 0) {
            return null;
        }
        return {
            type: result.rows[0].type,
            establishmentId: result.rows[0].establishment_id,
        };
    }
    async getInvitations(filters) {
        let whereClause = "1=1";
        const params = [];
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
        const result = await this.db.query(`
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
    `, params);
        return result.rows.map((row) => ({
            ...this.mapRowToInvitation(row),
            establishmentName: row.establishment_name,
            sessionName: row.session_name,
        }));
    }
    async revokeInvitation(invitationId, revokedBy) {
        await this.updateInvitationStatus(invitationId, "revoked");
        const invitation = await this.db.query("SELECT establishment_id, invitation_type FROM invitations WHERE id = $1", [invitationId]);
        if (invitation.rows.length > 0) {
            await this.logInvitationActivity(invitation.rows[0].establishment_id, invitationId, revokedBy, "revoked", `${invitation.rows[0].invitation_type} invitation revoked`);
        }
    }
    async canUserInvite(userId, establishmentId, invitationType) {
        const result = await this.db.query(`
      SELECT role FROM user_establishments 
      WHERE user_id = $1 AND establishment_id = $2 AND status = 'active'
    `, [userId, establishmentId]);
        if (result.rows.length === 0) {
            return false;
        }
        const userRole = result.rows[0].role;
        if (invitationType === "student") {
            return ["instructor", "manager", "admin", "super_admin"].includes(userRole);
        }
        if (invitationType === "instructor") {
            return ["manager", "admin", "super_admin"].includes(userRole);
        }
        return false;
    }
    async getInvitationSettings(establishmentId) {
        return {
            studentInvitationMaxHours: 24,
            instructorInvitationEnabled: true,
            studentInvitationEnabled: true,
            requireApprovalForInstructors: false,
            defaultExpiryHours: 1,
            studentInvitationDefaultUsageLimit: 10,
        };
    }
    async updateInvitationSettings(establishmentId, settings) {
    }
    async getInvitationStats(establishmentId) {
        const result = await this.db.query(`
      SELECT 
        invitation_type,
        status,
        COUNT(*) as count
      FROM invitations 
      WHERE establishment_id = $1 
      GROUP BY invitation_type, status
    `, [establishmentId]);
        const stats = {
            student: { active: 0, expired: 0, revoked: 0, used_up: 0 },
            instructor: { active: 0, expired: 0, revoked: 0, used_up: 0 },
        };
        result.rows.forEach((row) => {
            if (stats[row.invitation_type]) {
                stats[row.invitation_type][row.status] = parseInt(row.count);
            }
        });
        return stats;
    }
    async getInvitationUsage(invitationId) {
        const result = await this.db.query(`
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
    `, [invitationId]);
        return result.rows.map((row) => ({
            id: row.id,
            invitationId: row.invitation_id,
            userId: row.user_id,
            userEmail: row.user_email,
            usedAt: row.used_at,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
        }));
    }
    async hasActiveInstructorInvitation(email, establishmentId) {
        const exists = await this.tableExists("instructor_invitations");
        if (!exists) {
            return false;
        }
        const result = await this.db.query(`
      SELECT ii.id 
      FROM instructor_invitations ii
      INNER JOIN invitations i ON ii.invitation_id = i.id
      WHERE ii.email = $1 
        AND ii.establishment_id = $2 
        AND i.status = 'active' 
        AND i.expires_at > NOW()
        AND ii.status = 'pending'
      LIMIT 1
    `, [email.toLowerCase().trim(), establishmentId]);
        return result.rows.length > 0;
    }
    async cleanupExpiredInstructorInvitations() {
        const exists = await this.tableExists("instructor_invitations");
        if (!exists) {
            return 0;
        }
        const result = await this.db.query(`
      UPDATE instructor_invitations 
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' 
        AND expires_at <= NOW()
    `);
        return result.rowCount || 0;
    }
    async createInstructorInvitation(details) {
        await this.db.query(`
      INSERT INTO instructor_invitations (
        invitation_id, email, phone_number, establishment_id, 
        invited_by, message, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
            details.invitationId,
            details.email,
            details.phoneNumber,
            details.establishmentId,
            details.invitedBy,
            details.message || null,
            details.expiresAt,
        ]);
        await this.logInvitationActivity(details.establishmentId, details.invitationId, details.invitedBy, "created", `Instructor invitation sent to ${details.email} (${details.phoneNumber})`);
    }
    async updateInstructorInvitationStatus(invitationId, status) {
        const exists = await this.tableExists("instructor_invitations");
        if (exists) {
            if (status === "accepted") {
                await this.db.query(`
          UPDATE instructor_invitations 
          SET status = $1, accepted_at = NOW(), updated_at = NOW()
          WHERE invitation_id = $2
        `, [status, invitationId]);
            }
            else {
                await this.db.query(`
          UPDATE instructor_invitations 
          SET status = $1, updated_at = NOW()
          WHERE invitation_id = $2
        `, [status, invitationId]);
            }
        }
    }
    async updateInvitationStatus(invitationId, status) {
        await this.db.query("UPDATE invitations SET status = $1, updated_at = NOW() WHERE id = $2", [status, invitationId]);
    }
    async logInvitationActivity(establishmentId, invitationId, userId, action, description) {
        await this.db.query(`
      INSERT INTO activities (
        establishment_id, activity_type, title, description, user_id
      ) VALUES ($1, 'invitation', $2, $3, $4)
    `, [establishmentId, `Invitation ${action}`, description, userId]);
    }
    mapRowToInvitation(row) {
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
            instructorEmail: row.instructor_email,
            instructorPhone: row.instructor_phone,
        };
    }
}
