-- Invitation System Database Schema
-- Extends the existing Ballet-Neli backend schema

-- Invitation types and statuses
CREATE TYPE invitation_type AS ENUM ('instructor', 'student');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    email VARCHAR(255) NOT NULL,
    type invitation_type NOT NULL,
    status invitation_status DEFAULT 'pending',
    token VARCHAR(255) UNIQUE NOT NULL,
    session_id UUID, -- References class sessions for student invitations
    message TEXT,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_invitations_establishment ON invitations(establishment_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_type ON invitations(type);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);

-- Composite index for common queries
CREATE INDEX idx_invitations_establishment_status_type ON invitations(establishment_id, status, type);

-- Invitation settings table for configurable parameters
CREATE TABLE invitation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE NOT NULL,
    student_invitation_max_hours INTEGER DEFAULT 24 CHECK (student_invitation_max_hours <= 24),
    instructor_invitation_enabled BOOLEAN DEFAULT true,
    student_invitation_enabled BOOLEAN DEFAULT true,
    require_approval_for_instructors BOOLEAN DEFAULT false,
    default_expiry_hours INTEGER DEFAULT 24 CHECK (default_expiry_hours <= 24),
    auto_expire_unused BOOLEAN DEFAULT true,
    max_pending_invitations_per_email INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(establishment_id)
);

-- Insert default invitation settings for existing establishments
INSERT INTO invitation_settings (establishment_id) 
SELECT id FROM establishments 
ON CONFLICT (establishment_id) DO NOTHING;

-- Invitation audit log for tracking
CREATE TABLE invitation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'sent', 'accepted', 'expired', 'revoked'
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitation_audit_invitation_id ON invitation_audit_log(invitation_id);
CREATE INDEX idx_invitation_audit_action ON invitation_audit_log(action);
CREATE INDEX idx_invitation_audit_created_at ON invitation_audit_log(created_at);

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired invitations
    UPDATE invitations 
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'pending' 
      AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the expiration action
    INSERT INTO invitation_audit_log (invitation_id, action, details)
    SELECT id, 'expired', json_build_object('expired_at', CURRENT_TIMESTAMP)
    FROM invitations 
    WHERE status = 'expired' 
      AND updated_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_invitations_timestamp
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_invitation_settings_timestamp
    BEFORE UPDATE ON invitation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Function to clean up old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_invitation_audit_log()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM invitation_audit_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for invitation details with user and establishment info
CREATE VIEW invitation_details AS
SELECT 
    i.id,
    i.establishment_id,
    e.name as establishment_name,
    i.invited_by,
    u.first_name || ' ' || u.last_name as invited_by_name,
    u.email as invited_by_email,
    i.email,
    i.type,
    i.status,
    i.token,
    i.session_id,
    cs.title as session_name,
    i.message,
    i.expires_at,
    i.accepted_at,
    i.accepted_by,
    au.first_name || ' ' || au.last_name as accepted_by_name,
    i.created_at,
    i.updated_at,
    -- Calculate if invitation is still valid
    CASE 
        WHEN i.status = 'pending' AND i.expires_at > CURRENT_TIMESTAMP THEN true
        ELSE false 
    END as is_valid
FROM invitations i
LEFT JOIN establishments e ON i.establishment_id = e.id
LEFT JOIN users u ON i.invited_by = u.id
LEFT JOIN users au ON i.accepted_by = au.id
LEFT JOIN class_sessions cs ON i.session_id = cs.id;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('invitation_base_url', '"http://localhost:3000/invite"', 'Base URL for invitation links'),
('invitation_email_enabled', 'true', 'Whether to send invitation emails automatically'),
('invitation_cleanup_days', '30', 'Days to keep expired invitations before cleanup')
ON CONFLICT (key) DO NOTHING;