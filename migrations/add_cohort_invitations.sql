-- Migration: Add cohort invitation support
-- Date: 2024-09-07
-- Description: Adds cohort_id column to invitations table to support cohort-based invitations

BEGIN;

-- Add cohort_id column to invitations table
ALTER TABLE invitations 
ADD COLUMN cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_invitations_cohort_id ON invitations(cohort_id);

-- Add constraint to ensure either session_id OR cohort_id is provided (not both)
ALTER TABLE invitations 
ADD CONSTRAINT check_invitation_target 
CHECK (
  (session_id IS NOT NULL AND cohort_id IS NULL) OR 
  (session_id IS NULL AND cohort_id IS NOT NULL) OR 
  (session_id IS NULL AND cohort_id IS NULL)
);

-- Update existing invitations to maintain data integrity
-- (No changes needed as existing invitations only have session_id)

COMMIT;

-- Rollback script (if needed)
/*
BEGIN;

-- Remove constraint
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS check_invitation_target;

-- Drop index
DROP INDEX IF EXISTS idx_invitations_cohort_id;

-- Remove column
ALTER TABLE invitations DROP COLUMN IF EXISTS cohort_id;

COMMIT;
*/