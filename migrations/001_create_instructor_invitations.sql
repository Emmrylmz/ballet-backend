-- Migration: Create instructor_invitations table
-- Date: 2025-01-05
-- Description: Creates the instructor_invitations table to store instructor-specific invitation data

CREATE TABLE IF NOT EXISTS instructor_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    establishment_id UUID NOT NULL,
    invited_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT instructor_invitations_status_check 
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    
    -- Foreign key constraints
    CONSTRAINT instructor_invitations_invitation_id_fkey 
        FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
    CONSTRAINT instructor_invitations_establishment_id_fkey 
        FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
    CONSTRAINT instructor_invitations_invited_by_fkey 
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_invitations_invitation_id 
    ON instructor_invitations(invitation_id);

CREATE INDEX IF NOT EXISTS idx_instructor_invitations_email 
    ON instructor_invitations(email);

CREATE INDEX IF NOT EXISTS idx_instructor_invitations_establishment_id 
    ON instructor_invitations(establishment_id);

CREATE INDEX IF NOT EXISTS idx_instructor_invitations_status 
    ON instructor_invitations(status);

CREATE INDEX IF NOT EXISTS idx_instructor_invitations_expires_at 
    ON instructor_invitations(expires_at);

-- Unique constraint to prevent duplicate active invitations for same email+establishment
CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_invitations_unique_active
    ON instructor_invitations(email, establishment_id)
    WHERE status = 'pending';

COMMENT ON TABLE instructor_invitations IS 'Stores instructor-specific invitation details including email and phone number';
COMMENT ON COLUMN instructor_invitations.invitation_id IS 'References the main invitation record';
COMMENT ON COLUMN instructor_invitations.email IS 'Email address of the invited instructor';
COMMENT ON COLUMN instructor_invitations.phone_number IS 'Phone number of the invited instructor';